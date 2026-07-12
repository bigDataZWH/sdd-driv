import * as path from 'path';
import * as os from 'os';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { select } from '@inquirer/prompts';
import { fileExists, readDir, readJson } from '../utils/file-system.js';
import { createOpenCodeCommands } from '../core/skills.js';
import { syncDrivAssets } from '../core/assets.js';
import { loadManifest, getPackageVersion, getManifestSkills } from '../core/manifest.js';
import { PLATFORMS, getPlatformSkillsDir } from '../core/platforms.js';
import { getBaseDir } from '../core/detect.js';
const PACKAGE_NAME = 'driv';
const OFFICIAL_REGISTRY = 'https://registry.npmjs.org';
const DRIV_SKILLS = [
    'driv-clarify',
    'driv-design',
    'driv-build',
    'driv-verify',
    'driv-archive',
    'driv-review',
    'driv-cleancode',
    'driv',
    'driv-hotfix',
    'driv-tweak',
];
export function getDrivSkills() {
    return [...DRIV_SKILLS];
}
function languageToSkillsDir(language, fallback) {
    return (language ?? fallback) === 'zh' ? 'skills-zh' : 'skills';
}
function getScopedBaseDir(scope, projectPath, globalBaseDir = os.homedir()) {
    return scope === 'global' ? globalBaseDir : projectPath;
}
function getInstalledDrivSkillsDirs(baseDir, platform, scope = 'project') {
    const dirs = [path.join(baseDir, getPlatformSkillsDir(platform, scope), 'skills')];
    if (scope === 'global' && platform.id === 'pi') {
        dirs.push(path.join(baseDir, platform.skillsDir, 'skills'));
    }
    return [...new Set(dirs)];
}
async function hasLocalDrivSkills(baseDir, platform, scope) {
    for (const skillsDir of getInstalledDrivSkillsDirs(baseDir, platform, scope)) {
        if (!(await fileExists(skillsDir)))
            continue;
        const entries = await readDir(skillsDir);
        if (entries.some((entry) => entry.startsWith('driv')))
            return true;
    }
    return false;
}
async function detectInstalledDrivLanguage(baseDir, platform, scope = 'project') {
    for (const skillsDir of getInstalledDrivSkillsDirs(baseDir, platform, scope)) {
        if (!(await fileExists(skillsDir)))
            continue;
        const entries = (await readDir(skillsDir)).filter((entry) => entry.startsWith('driv'));
        for (const entry of entries) {
            const skillPath = path.join(skillsDir, entry, 'SKILL.md');
            if (!(await fileExists(skillPath)))
                continue;
            try {
                const content = await fs.readFile(skillPath, 'utf-8');
                if (/[\u3400-\u9fff]/u.test(content))
                    return 'zh';
            }
            catch {
            }
        }
    }
    return 'en';
}
async function detectInstalledDrivTargets(projectPath, options = {}) {
    const scopes = options.scopes ?? ['project', 'global'];
    const targets = [];
    for (const scope of scopes) {
        const baseDir = getScopedBaseDir(scope, projectPath, options.globalBaseDir);
        for (const platform of PLATFORMS) {
            if (!(await hasLocalDrivSkills(baseDir, platform, scope)))
                continue;
            targets.push({
                scope,
                platform,
                language: await detectInstalledDrivLanguage(baseDir, platform, scope),
            });
        }
    }
    return targets;
}
function isSameOrInside(childPath, parentPath) {
    const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
async function detectDrivPackageScope(projectPath, packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')) {
    const localPackageRoot = path.join(projectPath, 'node_modules', PACKAGE_NAME);
    if (isSameOrInside(packageRoot, localPackageRoot))
        return 'project';
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await fileExists(packageJsonPath)) {
        const pkg = await readJson(packageJsonPath);
        if (pkg.dependencies?.[PACKAGE_NAME] ||
            pkg.devDependencies?.[PACKAGE_NAME] ||
            pkg.optionalDependencies?.[PACKAGE_NAME]) {
            return 'project';
        }
    }
    return 'global';
}
function buildNpmUpdateArgs(scope) {
    return scope === 'global'
        ? ['install', '-g', `${PACKAGE_NAME}@latest`, '--registry', OFFICIAL_REGISTRY]
        : ['install', `${PACKAGE_NAME}@latest`, '--registry', OFFICIAL_REGISTRY];
}
function formatNpmUpdateCommand(scope) {
    return ['npm', ...buildNpmUpdateArgs(scope)].join(' ');
}
function getNpmExecutable() {
    return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}
async function updateDrivNpmPackage(scope, projectPath, log, jsonMode = false) {
    const args = buildNpmUpdateArgs(scope);
    const cwd = scope === 'global' ? process.cwd() : projectPath;
    return new Promise((resolve) => {
        const child = spawn(getNpmExecutable(), args, {
            cwd,
            stdio: jsonMode ? 'ignore' : 'inherit',
            shell: true,
        });
        child.on('error', (err) => {
            log(`  npm package: failed to launch npm — ${err.message}`);
            resolve(false);
        });
        child.on('exit', (code) => {
            if (code !== 0) {
                log(`  npm package: update failed (exit code ${code}). Unable to reach the official npm registry at ${OFFICIAL_REGISTRY}.`);
                log(`  Check your network connection or firewall settings and try again.`);
            }
            resolve(code === 0);
        });
    });
}
export async function updateCommand(targetPath, options = {}) {
    const projectPath = path.resolve(targetPath);
    const log = options.json ? () => undefined : console.log;
    if (!options.json) {
        log(`\n  Driv Update`);
        log(`  Version: ${getPackageVersion()}\n`);
    }
    let npmStatus = 'skipped';
    if (!options.skipNpm) {
        const packageScope = options.scope ?? (await detectDrivPackageScope(projectPath));
        log(`  Updating npm package (${packageScope} scope)...`);
        log(`    $ ${formatNpmUpdateCommand(packageScope)}`);
        const npmUpdated = await updateDrivNpmPackage(packageScope, projectPath, log, options.json === true);
        if (npmUpdated) {
            npmStatus = 'updated';
            log(`  npm package: updated to latest ${PACKAGE_NAME}`);
        }
        else {
            npmStatus = 'failed';
            log(`  npm package: update failed, continuing with bundled skills`);
        }
    }
    const targets = await detectInstalledDrivTargets(projectPath, {
        scopes: options.scope ? [options.scope] : undefined,
    });
    if (targets.length === 0) {
        if (options.json) {
            console.log(JSON.stringify({
                npm: {
                    scope: options.skipNpm ? 'skipped' : (options.scope ?? 'auto'),
                    status: npmStatus,
                    command: options.skipNpm ? null : formatNpmUpdateCommand(options.scope ?? 'global'),
                },
                skills: { totalCopied: 0, targets: [] },
                templates: { totalCopied: 0 },
                codegraph: 'skipped',
            }, null, 2));
            return {
                commands: { copied: 0, skipped: 0 },
                templates: { copied: 0, skipped: 0 },
                scope: options.scope ?? 'project',
                summary: '',
                npmStatus,
                codegraph: 'skipped',
            };
        }
        log('\n  No platforms with Driv skills installed. Run `driv init` first.\n');
        return {
            commands: { copied: 0, skipped: 0 },
            templates: { copied: 0, skipped: 0 },
            scope: options.scope ?? 'project',
            summary: '',
            npmStatus,
            codegraph: 'skipped',
        };
    }
    log(`\n  Updating Driv skills on ${targets.length} installed target(s):`);
    for (const target of targets) {
        const language = options.language ?? target.language;
        const scopeLabel = target.scope === 'global' ? 'global' : `project (${projectPath})`;
        log(`    - ${target.platform.name} (${scopeLabel}, ${language})`);
    }
    let totalCopied = 0;
    let totalTemplatesCopied = 0;
    const targetResults = [];
    for (const target of targets) {
        const baseDir = getBaseDir(target.scope, projectPath);
        const languageSkillsDir = languageToSkillsDir(options.language, target.language);
        const manifest = await loadManifest(baseDir);
        const useZh = (options.language ?? target.language) === 'zh';
        const skillNames = getManifestSkills(manifest, useZh);
        const overwrite = options.overwrite ?? true;
        const commands = await createOpenCodeCommands(baseDir, skillNames, overwrite);
        totalCopied += commands.copied;
        const templates = target.scope === 'project' ? await syncDrivAssets(baseDir, { overwrite }) : { copied: 0, skipped: 0 };
        totalTemplatesCopied += templates.copied;
        targetResults.push({
            scope: target.scope,
            platform: target.platform.id,
            platformName: target.platform.name,
            language: options.language ?? target.language,
            copied: commands.copied,
            skipped: commands.skipped,
        });
        log(`  ${target.platform.name} (${target.scope}, ${languageSkillsDir}): ${commands.copied} copied, ${commands.skipped} skipped`);
    }
    let codegraphStatus = 'skipped';
    if (!options.json && !options.yes && !options.scope && !options.language && !options.overwrite && !options.skipNpm) {
        const shouldInstallCodegraph = await select({
            message: 'Install/update CodeGraph for semantic code intelligence?',
            choices: [
                { name: 'Yes (recommended — saves ~16% cost · cuts ~58% tool calls)', value: true },
                { name: 'No', value: false },
            ],
        });
        if (shouldInstallCodegraph) {
            log('\n  Installing CodeGraph...');
            try {
                const npmCmd = getNpmExecutable();
                const primaryScope = targets[0]?.scope ?? 'project';
                const args = primaryScope === 'global' ? ['install', '-g', '@colbymchenry/codegraph'] : ['install', '@colbymchenry/codegraph'];
                const cwd = primaryScope === 'global' ? os.homedir() : projectPath;
                await new Promise((resolve) => {
                    const child = spawn(npmCmd, args, { cwd, stdio: 'inherit', shell: true });
                    child.on('error', (err) => {
                        log(`  CodeGraph: failed to launch npm — ${err.message}`);
                        codegraphStatus = 'failed';
                        resolve();
                    });
                    child.on('exit', (code) => {
                        if (code !== 0) {
                            log(`  CodeGraph: install failed (exit code ${code})`);
                            log(`  Try running your terminal as administrator, or install manually: npm install -g @colbymchenry/codegraph`);
                            codegraphStatus = 'failed';
                        }
                        else {
                            codegraphStatus = 'installed';
                        }
                        resolve();
                    });
                });
            }
            catch {
                codegraphStatus = 'failed';
            }
            log(`  CodeGraph: ${codegraphStatus}`);
        }
        else {
            log('\n  CodeGraph: skipped');
        }
    }
    if (options.json) {
        console.log(JSON.stringify({
            npm: {
                scope: options.skipNpm ? 'skipped' : (options.scope ?? 'auto'),
                status: npmStatus,
                command: options.skipNpm ? null : formatNpmUpdateCommand(options.scope ?? 'global'),
            },
            skills: {
                totalCopied,
                targets: targetResults,
            },
            templates: { totalCopied: totalTemplatesCopied },
            codegraph: codegraphStatus,
        }, null, 2));
    }
    if (!options.json) {
        const languages = [...new Set(targetResults.map((target) => target.language))].join(', ');
        const scopes = [...new Set(targetResults.map((target) => target.scope))].join(', ');
        log(`\n  Summary:`);
        log(`    npm: ${npmStatus}${options.skipNpm ? '' : ` (${options.scope ?? 'auto'})`}`);
        log(`    skills: ${targets.length} target(s), ${totalCopied} files updated`);
        log(`    templates: ${totalTemplatesCopied} copied`);
        log(`    codegraph: ${codegraphStatus}`);
        log(`    scope: ${scopes}`);
        log(`    language: ${languages}`);
        log(`\n  Update complete.\n`);
    }
    return {
        commands: { copied: totalCopied, skipped: 0 },
        templates: { copied: totalTemplatesCopied, skipped: 0 },
        scope: options.scope ?? 'project',
        summary: `Driv commands: ${totalCopied} updated\nTemplates: ${totalTemplatesCopied} copied\nnpm: ${npmStatus}\ncodegraph: ${codegraphStatus}`,
        npmStatus,
        codegraph: codegraphStatus,
    };
}
//# sourceMappingURL=update.js.map