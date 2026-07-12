import * as path from 'path';
import * as os from 'os';
import { select } from '@inquirer/prompts';
import { fileExists, readDir, removeFile, removeDir, isDirEmpty } from '../utils/file-system.js';
import { getDrivSkills } from './update.js';
import { PLATFORMS, getPlatformSkillsDir } from '../core/platforms.js';
import { getBaseDir, hasSkills } from '../core/detect.js';
async function removeDrivSkillsForPlatform(baseDir, platform, scope = 'project') {
    const drivSkills = getDrivSkills();
    const extraSkills = ['openspec-propose', 'openspec-apply', 'openspec-explore', 'openspec-archive'];
    const allSkills = [...drivSkills, ...extraSkills];
    const skillsDir = getPlatformSkillsDir(platform, scope);
    const skillsDirs = [skillsDir];
    if (scope === 'global' && platform.id === 'pi') {
        skillsDirs.push(platform.skillsDir);
    }
    const uniqueSkillsDirs = [...new Set(skillsDirs)];
    let skillsRemoved = 0;
    let commandsRemoved = 0;
    for (const targetSkillsDir of uniqueSkillsDirs) {
        for (const skillName of allSkills) {
            const skillDir = path.join(baseDir, targetSkillsDir, 'skills', skillName);
            const result = await removeDir(skillDir);
            if (result) {
                skillsRemoved++;
            }
        }
    }
    if (platform.id === 'opencode' || platform.id === 'trae') {
        const commandsDir = path.join(baseDir, skillsDir, 'commands');
        for (const skillName of allSkills) {
            const commandFile = path.join(commandsDir, `${skillName}.md`);
            const result = await removeFile(commandFile);
            if (result) {
                commandsRemoved++;
            }
        }
    }
    for (const targetSkillsDir of uniqueSkillsDirs) {
        const skillsPath = path.join(baseDir, targetSkillsDir, 'skills');
        if (await fileExists(skillsPath)) {
            const entries = await readDir(skillsPath);
            if (entries.length === 0) {
                await removeDir(skillsPath);
            }
        }
    }
    return { skillsRemoved, commandsRemoved };
}
async function removeDrivRulesForPlatform(baseDir, platform, scope = 'project') {
    if (!platform.rulesDir) {
        return { removed: 0, failed: 0 };
    }
    const skillsDir = getPlatformSkillsDir(platform, scope);
    const rulesBase = platform.rulesBaseDir !== undefined
        ? platform.rulesBaseDir === ''
            ? baseDir
            : path.join(baseDir, platform.rulesBaseDir)
        : path.join(baseDir, skillsDir);
    const rulesDir = path.join(rulesBase, platform.rulesDir);
    if (!(await fileExists(rulesDir))) {
        return { removed: 0, failed: 0 };
    }
    let removed = 0;
    const entries = await readDir(rulesDir);
    for (const entry of entries) {
        if (entry.startsWith('driv') || entry.startsWith('phase')) {
            const filePath = path.join(rulesDir, entry);
            if (await removeFile(filePath)) {
                removed++;
            }
        }
    }
    if (await isDirEmpty(rulesDir)) {
        await removeDir(rulesDir);
    }
    return { removed, failed: 0 };
}
async function removeDrivHooksForPlatform(baseDir, platform, scope = 'project') {
    if (!platform.supportsHooks || !platform.hookFormat) {
        return { removed: 0, failed: 0 };
    }
    const skillsDir = getPlatformSkillsDir(platform, scope);
    const platformBase = path.join(baseDir, skillsDir);
    try {
        switch (platform.hookFormat) {
            case 'claude-code':
            case 'qwen':
            case 'qoder': {
                const settingsPath = platform.hookFormat === 'claude-code'
                    ? path.join(platformBase, 'settings.local.json')
                    : path.join(platformBase, 'settings.json');
                if (!(await fileExists(settingsPath))) {
                    return { removed: 0, failed: 0 };
                }
                const { readFile, writeFile } = await import('fs/promises');
                let settings;
                try {
                    settings = JSON.parse(await readFile(settingsPath, 'utf-8'));
                }
                catch {
                    return { removed: 0, failed: 0 };
                }
                if (settings.hooks) {
                    delete settings.hooks;
                    const content = JSON.stringify(settings, null, 2) + '\n';
                    await writeFile(settingsPath, content, 'utf-8');
                    return { removed: 1, failed: 0 };
                }
                break;
            }
            case 'gemini': {
                const settingsPath = path.join(platformBase, 'settings.json');
                if (!(await fileExists(settingsPath))) {
                    return { removed: 0, failed: 0 };
                }
                const { readFile, writeFile } = await import('fs/promises');
                let settings;
                try {
                    settings = JSON.parse(await readFile(settingsPath, 'utf-8'));
                }
                catch {
                    return { removed: 0, failed: 0 };
                }
                if (settings.hooks) {
                    delete settings.hooks;
                    const content = JSON.stringify(settings, null, 2) + '\n';
                    await writeFile(settingsPath, content, 'utf-8');
                    return { removed: 1, failed: 0 };
                }
                break;
            }
            case 'windsurf': {
                const hooksPath = path.join(platformBase, 'hooks.json');
                if (!(await removeFile(hooksPath))) {
                    return { removed: 0, failed: 0 };
                }
                return { removed: 1, failed: 0 };
            }
            case 'copilot': {
                const hookFilePath = path.join(platformBase, 'hooks', 'driv-guard.json');
                const removed = (await removeFile(hookFilePath)) ? 1 : 0;
                const hooksDir = path.join(platformBase, 'hooks');
                if (await isDirEmpty(hooksDir)) {
                    await removeDir(hooksDir);
                }
                return { removed, failed: 0 };
            }
            case 'kiro': {
                const hooksDir = path.join(platformBase, 'hooks');
                if (!(await fileExists(hooksDir))) {
                    return { removed: 0, failed: 0 };
                }
                let removed = 0;
                const entries = await readDir(hooksDir);
                for (const entry of entries) {
                    if (entry.startsWith('driv') && entry.endsWith('.kiro.hook')) {
                        const hookPath = path.join(hooksDir, entry);
                        if (await removeFile(hookPath)) {
                            removed++;
                        }
                    }
                }
                if (await isDirEmpty(hooksDir)) {
                    await removeDir(hooksDir);
                }
                return { removed, failed: 0 };
            }
        }
    }
    catch {
        return { removed: 0, failed: 1 };
    }
    return { removed: 0, failed: 0 };
}
async function removeWorkingDirs(projectPath) {
    let removed = 0;
    const drivDir = path.join(projectPath, '.driv');
    if (await removeDir(drivDir)) {
        removed++;
    }
    return { removed, failed: 0 };
}
async function detectInstalledDrivTargets(projectPath, options = {}) {
    const scopes = options.scopes ?? ['project', 'global'];
    const targets = [];
    for (const scope of scopes) {
        const baseDir = scope === 'global' ? os.homedir() : projectPath;
        for (const platform of PLATFORMS) {
            if (!(await hasSkills(baseDir, platform, 'driv', [], scope)))
                continue;
            targets.push({ scope, platform });
        }
    }
    return targets;
}
export async function uninstallCommand(targetPath, options = {}) {
    const projectPath = path.resolve(targetPath);
    const log = options.json ? () => undefined : console.log;
    if (!options.json) {
        log(`\n  Driv Uninstall\n`);
    }
    const targets = await detectInstalledDrivTargets(projectPath, {
        scopes: options.scope ? [options.scope] : undefined,
    });
    if (targets.length === 0) {
        if (options.json) {
            console.log(JSON.stringify({ targets: [], results: [], workingDirsRemoved: 0 }, null, 2));
        }
        else {
            log('  No Driv installations found. Nothing to uninstall.\n');
        }
        return { skillsRemoved: 0, commandsRemoved: 0, dirsRemoved: 0 };
    }
    const scopeLabel = (scope) => scope === 'global' ? 'global' : `project (${projectPath})`;
    if (!options.json) {
        log('  Found Driv installations on the following targets:\n');
        for (const target of targets) {
            const skillsDir = getPlatformSkillsDir(target.platform, target.scope);
            const prefix = target.scope === 'global' ? '~/' : '';
            log(`    ${target.platform.name} (${scopeLabel(target.scope)})`);
            log(`      Path: ${prefix}${skillsDir}/skills/`);
        }
        log('');
    }
    if (!options.force && !options.json) {
        const confirmed = await select({
            message: 'Remove all Driv skills, rules, and hooks from these targets?',
            choices: [
                { name: 'Yes, uninstall all', value: true },
                { name: 'No, cancel', value: false },
            ],
        });
        if (!confirmed) {
            log('\n  Cancelled.\n');
            return { skillsRemoved: 0, commandsRemoved: 0, dirsRemoved: 0 };
        }
    }
    log('');
    const results = [];
    let totalSkills = 0;
    let totalCommands = 0;
    let totalRules = 0;
    let totalHooks = 0;
    for (const target of targets) {
        const baseDir = getBaseDir(target.scope, projectPath);
        const skillsResult = await removeDrivSkillsForPlatform(baseDir, target.platform, target.scope);
        totalSkills += skillsResult.skillsRemoved;
        totalCommands += skillsResult.commandsRemoved;
        const rulesResult = await removeDrivRulesForPlatform(baseDir, target.platform, target.scope);
        totalRules += rulesResult.removed;
        const hooksResult = await removeDrivHooksForPlatform(baseDir, target.platform, target.scope);
        totalHooks += hooksResult.removed;
        log(`  ${target.platform.name} (${target.scope}): ${skillsResult.skillsRemoved} skills, ${rulesResult.removed} rules, ${hooksResult.removed} hooks removed`);
        results.push({
            scope: target.scope,
            platform: target.platform.id,
            platformName: target.platform.name,
            skillsRemoved: skillsResult.skillsRemoved,
            rulesRemoved: rulesResult.removed,
            hooksRemoved: hooksResult.removed,
        });
    }
    let workingDirsRemoved = 0;
    const hasProjectScope = targets.some((t) => t.scope === 'project');
    if (hasProjectScope) {
        const dirsResult = await removeWorkingDirs(projectPath);
        workingDirsRemoved = dirsResult.removed;
        if (workingDirsRemoved > 0) {
            log(`  Working directories: ${workingDirsRemoved} removed`);
        }
    }
    if (options.json) {
        console.log(JSON.stringify({
            targets: results.map((r) => ({
                scope: r.scope,
                platform: r.platform,
                platformName: r.platformName,
                skillsRemoved: r.skillsRemoved,
                rulesRemoved: r.rulesRemoved,
                hooksRemoved: r.hooksRemoved,
            })),
            workingDirsRemoved,
            summary: {
                targetsProcessed: results.length,
                totalSkillsRemoved: totalSkills,
                totalCommandsRemoved: totalCommands,
                totalRulesRemoved: totalRules,
                totalHooksRemoved: totalHooks,
            },
        }, null, 2));
    }
    else {
        log(`\n  Summary:`);
        log(`    Targets: ${results.length}`);
        log(`    Skills removed: ${totalSkills}`);
        log(`    Commands removed: ${totalCommands}`);
        log(`    Rules removed: ${totalRules}`);
        log(`    Hooks removed: ${totalHooks}`);
        if (workingDirsRemoved > 0)
            log(`    Working directories removed: ${workingDirsRemoved}`);
        log(`\n  Uninstall complete.\n`);
    }
    return { skillsRemoved: totalSkills, commandsRemoved: totalCommands, dirsRemoved: workingDirsRemoved };
}
//# sourceMappingURL=uninstall.js.map