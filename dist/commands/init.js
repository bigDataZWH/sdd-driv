import * as path from 'path';
import * as os from 'os';
import { select, checkbox } from '@inquirer/prompts';
import { ensureDir, fileExists, writeFile } from '../utils/file-system.js';
import { createOpenCodeCommands, installDrivSkills, copyDrivRulesForPlatform, installDrivHooksForPlatform } from '../core/skills.js';
import { syncDrivAssets } from '../core/assets.js';
import { getDrivSkills } from './update.js';
import { getPackageVersion } from '../core/manifest.js';
import { PLATFORMS, getPlatformSkillsDir } from '../core/platforms.js';
import { detectPlatforms, hasSkills, getBaseDir } from '../core/detect.js';
import { installSuperpowersForPlatforms } from '../core/superpowers.js';
import { installOpenSpec, getNpmExecutable, execFileSafe } from '../core/openspec.js';
const DRIV_BANNER = [
    `   ____       _ _    `,
    `  |  _ \\ _ __(_) |_  `,
    `  | | | | '__| | __| `,
    `  | |_| | |  | | |_  `,
    `  |____/|_|  |_|\\__| `,
    `  Driv – OpenSpec + Superpowers Workflow`,
].join('\n');
const LANGUAGES = [
    { id: 'en', name: 'English', skillsDir: 'skills' },
    { id: 'zh', name: '中文', skillsDir: 'skills-zh' },
];
function printBanner(log) {
    log(`\n${DRIV_BANNER}\n`);
    log(`  Version: ${getPackageVersion()}\n`);
}
function isInteractive(options) {
    return !options.yes && !options.json && !options.scope && !options.overwrite && !options.skipExisting;
}
async function createWorkingDirs(projectPath) {
    const plansDir = path.join(projectPath, 'docs', 'superpowers', 'plans');
    await ensureDir(plansDir);
}
async function selectScope(options) {
    if (options.scope)
        return options.scope;
    if (!isInteractive(options))
        return 'project';
    return select({
        message: 'Install scope:',
        choices: [
            { name: 'Project (current directory)', value: 'project' },
            { name: 'Global (home directory)', value: 'global' },
        ],
    });
}
async function selectLanguage(options) {
    if (!isInteractive(options))
        return LANGUAGES[0];
    const langId = await select({
        message: 'Language for Driv skills:',
        choices: LANGUAGES.map((lang) => ({ name: lang.name, value: lang.id })),
    });
    return LANGUAGES.find((l) => l.id === langId) ?? LANGUAGES[0];
}
async function selectPlatforms(detected, options) {
    const choices = PLATFORMS.map((p) => ({
        name: `${p.name}${detected.has(p.id) ? ' (detected)' : ''}`,
        value: p.id,
        checked: detected.has(p.id),
    }));
    if (!isInteractive(options)) {
        const selected = [...detected];
        return selected.length > 0 ? selected : ['opencode'];
    }
    return checkbox({ message: 'Select platforms to set up:', choices, required: true });
}
async function promptOverwriteChoice(componentName, platformName) {
    return select({
        message: `${componentName} already installed on ${platformName}. What to do?`,
        choices: [
            { name: 'Overwrite', value: 'overwrite' },
            { name: 'Skip', value: 'skip' },
        ],
    });
}
async function promptBulkOverwriteChoice(platformName, components) {
    return select({
        message: `${platformName} already has ${components.join(', ')} installed. What to do?`,
        choices: [
            { name: 'Overwrite all existing components', value: 'overwrite-all' },
            { name: 'Skip all existing components', value: 'skip-all' },
            { name: 'Choose per component', value: 'choose' },
        ],
    });
}
function applyBulkOverwriteChoice(plan, choice) {
    const action = choice === 'overwrite-all' ? 'overwrite' : 'skip';
    return {
        ...plan,
        drivAction: plan.drivAction === 'install' ? action : plan.drivAction,
    };
}
function resolveAction(hasExisting, options) {
    if (!hasExisting)
        return 'install';
    if (options.overwrite)
        return 'overwrite';
    if (options.skipExisting)
        return 'skip';
    if (!isInteractive(options))
        return 'skip';
    return 'install';
}
export async function initCommand(projectPath, _platformIds, options = {}) {
    const log = options.json ? () => undefined : console.log;
    const targetPath = path.resolve(projectPath);
    if (!options.json) {
        printBanner(log);
        log(`  Setting up Driv in ${targetPath}\n`);
    }
    const detected = await detectPlatforms(targetPath);
    const scope = await selectScope(options);
    const language = await selectLanguage(options);
    const selectedPlatformIds = await selectPlatforms(detected, options);
    if (!options.json) {
        log(`  Scope: ${scope === 'global' ? 'global' : 'project'}`);
        log(`  Language: ${language.name}`);
        log(`  Platforms: ${selectedPlatformIds.length > 0 ? selectedPlatformIds.join(', ') : 'none'}\n`);
    }
    const selectedPlatforms = PLATFORMS.filter((p) => selectedPlatformIds.includes(p.id));
    const baseDir = getBaseDir(scope, targetPath);
    const createdDirs = [];
    let templatesResult = { copied: 0, skipped: 0 };
    const plans = [];
    for (const platform of selectedPlatforms) {
        const hasDriv = await hasSkills(baseDir, platform, 'driv', selectedPlatforms, scope);
        let drivAction = resolveAction(hasDriv, options);
        if (isInteractive(options)) {
            const existingComponents = [hasDriv && drivAction === 'install' ? 'Driv' : null].filter((component) => Boolean(component));
            if (existingComponents.length > 0) {
                const bulkChoice = await promptBulkOverwriteChoice(platform.name, existingComponents);
                if (bulkChoice !== 'choose') {
                    ({ drivAction } = applyBulkOverwriteChoice({ drivAction }, bulkChoice));
                }
            }
            if (drivAction === 'install' && hasDriv) {
                drivAction = await promptOverwriteChoice('Driv', platform.name);
            }
        }
        plans.push({ platform, drivAction, hasDriv });
    }
    if (scope === 'project') {
        const drivDir = path.join(baseDir, '.driv');
        await ensureDir(drivDir);
        createdDirs.push(drivDir);
        const templatesDir = path.join(drivDir, 'templates');
        await ensureDir(templatesDir);
        createdDirs.push(templatesDir);
        templatesResult = await syncDrivAssets(baseDir, {
            overwrite: options.overwrite ?? false,
            skipExisting: options.skipExisting ?? (options.yes ? true : undefined),
        });
        await createWorkingDirs(targetPath);
        createdDirs.push(path.join(targetPath, 'docs', 'superpowers', 'plans'));
    }
    const results = [];
    for (const plan of plans) {
        const { platform, drivAction } = plan;
        const platformSkillsDir = getPlatformSkillsDir(platform, scope);
        const skillsPath = `${scope === 'global' ? '~/' : ''}${platformSkillsDir}/skills/`;
        let drivStatus = 'skipped';
        if (drivAction !== 'skip') {
            const overwrite = drivAction === 'overwrite';
            const existingSkills = ['openspec-propose', 'openspec-explore', 'openspec-apply-change', 'openspec-archive-change'];
            const drivSkills = getDrivSkills();
            const allSkillNames = [...existingSkills, ...drivSkills];
            const skillsResult = await installDrivSkills(baseDir, allSkillNames, overwrite, options.skipExisting);
            const openspecResult = await createOpenCodeCommands(baseDir, existingSkills, overwrite);
            const drivResult = await createOpenCodeCommands(baseDir, drivSkills, overwrite);
            const rulesResult = await copyDrivRulesForPlatform(baseDir, platform, overwrite, scope);
            const hooksResult = await installDrivHooksForPlatform(baseDir, platform, scope);
            const totalCopied = skillsResult.copied + openspecResult.copied + drivResult.copied + rulesResult.copied;
            drivStatus = totalCopied > 0 || hooksResult.installed ? 'installed' : 'skipped';
            log(`  Driv -> ${platform.name}: ${drivStatus} -> ${skillsPath}`);
            if (rulesResult.copied > 0) {
                log(`    Rules: ${rulesResult.copied} copied`);
            }
            if (hooksResult.installed) {
                log(`    Hooks: installed`);
            }
        }
        else {
            log(`  Driv -> ${platform.name}: skipped (already exists)`);
        }
        results.push({
            platform,
            driv: drivStatus,
            codegraph: 'skipped',
        });
    }
    let openspecStatus = 'skipped';
    if (scope === 'project') {
        const openspecDir = path.join(targetPath, 'openspec');
        const openspecConfigExists = await fileExists(path.join(openspecDir, 'config.yaml'));
        if (!openspecConfigExists) {
            if (!options.json && isInteractive(options)) {
                const shouldInstallOpenSpec = await select({
                    message: 'Install OpenSpec for specification-driven development?',
                    choices: [
                        { name: 'Yes (creates openspec/ directory with config)', value: true },
                        { name: 'No', value: false },
                    ],
                });
                if (shouldInstallOpenSpec) {
                    log('\n  Installing OpenSpec...');
                    openspecStatus = await installOpenSpec(targetPath, selectedPlatformIds, scope);
                    if (openspecStatus === 'installed') {
                        log('  OpenSpec: installed -> openspec/');
                    }
                    else if (openspecStatus === 'failed') {
                        log('  OpenSpec: failed (you can install manually with: npx @fission-ai/openspec init)');
                    }
                }
            }
            else {
                // Non-interactive: auto-create minimal openspec config
                await ensureDir(openspecDir);
                await ensureDir(path.join(openspecDir, 'changes'));
                await ensureDir(path.join(openspecDir, 'specs'));
                await writeFile(path.join(openspecDir, 'config.yaml'), 'profile: custom\ntools:\n  - opencode\n');
                openspecStatus = 'installed';
            }
        }
        else {
            openspecStatus = 'skipped';
            log('  OpenSpec: already initialized');
        }
    }
    let superpowersStatus = 'skipped';
    if (!options.json && isInteractive(options) && selectedPlatformIds.length > 0) {
        const shouldInstallSuperpowers = await select({
            message: 'Install Superpowers for enhanced AI workflows?',
            choices: [
                { name: 'Yes (adds brainstorming, TDD, subagent development skills)', value: true },
                { name: 'No', value: false },
            ],
        });
        if (shouldInstallSuperpowers) {
            log('\n  Installing Superpowers...');
            superpowersStatus = await installSuperpowersForPlatforms(targetPath, scope, selectedPlatformIds);
            if (superpowersStatus === 'installed') {
                log('  Superpowers: installed');
            }
            else if (superpowersStatus === 'failed') {
                log('  Superpowers: failed to clone from GitHub');
                log('  You can install manually: npx skills add obra/superpowers');
            }
        }
    }
    let codegraphStatus = 'skipped';
    if (!options.json && isInteractive(options)) {
        const shouldInstallCodegraph = options.yes ||
            (await select({
                message: 'Install CodeGraph for semantic code intelligence?',
                choices: [
                    { name: 'Yes (recommended — saves ~16% cost · cuts ~58% tool calls)', value: true },
                    { name: 'No', value: false },
                ],
            }));
        if (shouldInstallCodegraph) {
            log('\n  Installing CodeGraph...');
            try {
                const npmCmd = getNpmExecutable();
                if (scope !== 'global') {
                    // Ensure package.json exists so npm doesn't walk up to drive root
                    const pkgJsonPath = path.join(targetPath, 'package.json');
                    if (!(await fileExists(pkgJsonPath))) {
                        await writeFile(pkgJsonPath, JSON.stringify({
                            name: path.basename(targetPath).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                            version: '1.0.0',
                            private: true,
                        }, null, 2) + '\n');
                    }
                }
                const args = scope === 'global'
                    ? ['install', '-g', '@colbymchenry/codegraph']
                    : ['install', '--prefix', targetPath, '@colbymchenry/codegraph'];
                const cwd = scope === 'global' ? os.homedir() : targetPath;
                execFileSafe(npmCmd, args, {
                    cwd,
                    stdio: 'inherit',
                    timeout: 300_000,
                });
                codegraphStatus = 'installed';
            }
            catch {
                codegraphStatus = 'failed';
                log('  CodeGraph: install failed');
                log('  Try running your terminal as administrator, or install manually:');
                log('    npm install -g @colbymchenry/codegraph');
            }
            log(`  CodeGraph: ${codegraphStatus}`);
            for (const r of results) {
                r.codegraph = codegraphStatus;
            }
        }
        else {
            log('\n  CodeGraph: skipped');
        }
    }
    if (options.json) {
        const jsonResult = {
            projectPath: baseDir,
            scope,
            language: language.id,
            platforms: selectedPlatformIds,
            createdDirs,
            templates: templatesResult,
            workingDirsCreated: createdDirs.length,
            openspec: openspecStatus,
            codegraph: codegraphStatus,
            superpowers: superpowersStatus,
            results: results.map((result) => ({
                platform: result.platform.id,
                platformName: result.platform.name,
                driv: result.driv,
                codegraph: result.codegraph,
            })),
        };
        console.log(JSON.stringify(jsonResult, null, 2));
        return {
            createdDirs,
            skillsCopied: 0,
            skillsSkipped: 0,
            commandsCopied: 0,
            commandsSkipped: 0,
            templatesCopied: templatesResult.copied,
            templatesSkipped: templatesResult.skipped,
            openspec: openspecStatus,
            superpowers: superpowersStatus,
            summary: '',
            scope,
            codegraph: codegraphStatus,
        };
    }
    const installed = results.filter((r) => r.driv === 'installed' || r.codegraph === 'installed');
    const skipped = results.filter((r) => r.driv === 'skipped' && r.codegraph === 'skipped');
    log(`\n  Driv setup complete! (scope: ${scope === 'global' ? os.homedir() : 'project'})\n`);
    if (installed.length > 0) {
        log(`  Installed:`);
        for (const r of installed) {
            log(`    ${r.platform.name} -> ${getPlatformSkillsDir(r.platform, scope)}/skills/`);
        }
    }
    if (templatesResult.copied > 0) {
        log(`    Templates: ${templatesResult.copied} copied`);
    }
    if (openspecStatus === 'installed') {
        log(`    OpenSpec: installed -> openspec/`);
    }
    if (superpowersStatus === 'installed') {
        log(`    Superpowers: installed`);
    }
    if (codegraphStatus === 'installed') {
        log(`    CodeGraph: installed`);
    }
    if (skipped.length > 0) {
        log(`  Skipped: ${skipped.map((r) => r.platform.name).join(', ')}`);
    }
    log(`\n  Get started:`);
    log(`    /driv "your idea"  — Start a new change with full workflow`);
    log(`    /driv-hotfix       — Quick bug fix (skip brainstorming)`);
    log(`    /driv-tweak        — Small change (skip brainstorming and plan)\n`);
    return {
        createdDirs,
        skillsCopied: 0,
        skillsSkipped: 0,
        commandsCopied: 0,
        commandsSkipped: 0,
        templatesCopied: templatesResult.copied,
        templatesSkipped: templatesResult.skipped,
        openspec: openspecStatus,
        superpowers: superpowersStatus,
        summary: '',
        scope,
        codegraph: codegraphStatus,
    };
}
//# sourceMappingURL=init.js.map