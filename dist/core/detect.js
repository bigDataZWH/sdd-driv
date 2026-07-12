import * as path from 'path';
import * as os from 'os';
import { fileExists, readDir, readJson } from '../utils/file-system.js';
import { PLATFORMS, getPlatformSkillsDirs } from './platforms.js';
const SUPERPOWERS_SKILLS = [
    'brainstorming',
    'using-superpowers',
    'writing-plans',
    'test-driven-development',
    'subagent-driven-development',
];
export function getBaseDir(scope, projectPath) {
    return scope === 'global' ? os.homedir() : projectPath;
}
async function hasPluginSuperpowers() {
    const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
    const pluginsCacheDir = path.join(claudeDir, 'plugins', 'cache');
    try {
        const marketplaceEntries = await readDir(pluginsCacheDir);
        for (const marketplace of marketplaceEntries) {
            const superpowersDir = path.join(pluginsCacheDir, marketplace, 'superpowers');
            if (!(await fileExists(superpowersDir)))
                continue;
            const versionEntries = await readDir(superpowersDir);
            for (const version of versionEntries) {
                const skillsDir = path.join(superpowersDir, version, 'skills');
                if (!(await fileExists(skillsDir)))
                    continue;
                const skills = await readDir(skillsDir);
                if (SUPERPOWERS_SKILLS.some((name) => skills.includes(name))) {
                    return true;
                }
            }
        }
    }
    catch {
    }
    return false;
}
async function hasOpenCodePluginSuperpowers() {
    const opencodeDir = process.env.OPENCODE_CONFIG_DIR || path.join(os.homedir(), '.config', 'opencode');
    const pluginSkillsDir = path.join(opencodeDir, 'superpowers', 'skills');
    if (await fileExists(pluginSkillsDir)) {
        const skills = await readDir(pluginSkillsDir);
        if (SUPERPOWERS_SKILLS.some((name) => skills.includes(name))) {
            return true;
        }
    }
    const configPath = path.join(opencodeDir, 'opencode.json');
    if (await fileExists(configPath)) {
        try {
            const config = (await readJson(configPath));
            const plugins = config.plugin;
            if (Array.isArray(plugins)) {
                if (plugins.some((entry) => typeof entry === 'string' && entry.includes('superpowers'))) {
                    return true;
                }
            }
        }
        catch {
        }
    }
    return false;
}
async function hasDrivCommands(baseDir, skillsDir, entries) {
    const drivEntries = entries.filter((entry) => entry.startsWith('driv'));
    if (drivEntries.length === 0)
        return false;
    const commandsDir = path.join(baseDir, skillsDir, 'commands');
    if (!(await fileExists(commandsDir)))
        return false;
    const commandEntries = await readDir(commandsDir);
    return drivEntries.every((entry) => commandEntries.includes(`${entry}.md`));
}
export async function detectPlatforms(projectPath) {
    const detected = new Set();
    for (const platform of PLATFORMS) {
        if (platform.detectionPaths && platform.detectionPaths.length > 0) {
            for (const p of platform.detectionPaths) {
                if (await fileExists(path.join(projectPath, p))) {
                    detected.add(platform.id);
                    break;
                }
            }
        }
        else {
            for (const skillsDir of getPlatformSkillsDirs(platform, 'project')) {
                const dirPath = path.join(projectPath, skillsDir);
                if (await fileExists(dirPath)) {
                    detected.add(platform.id);
                    break;
                }
            }
        }
    }
    return detected;
}
export async function hasSkills(baseDir, platform, component, _selectedPlatforms = [], scope = 'project') {
    const skillDirEntries = await Promise.all(getPlatformSkillsDirs(platform, scope).map(async (skillsDir) => {
        const fullPath = path.join(baseDir, skillsDir, 'skills');
        return {
            skillsDir,
            entries: (await fileExists(fullPath)) ? await readDir(fullPath) : [],
        };
    }));
    const entries = skillDirEntries.flatMap((dir) => dir.entries);
    switch (component) {
        case 'openspec':
            if (entries.some((e) => e.startsWith('openspec-')))
                return true;
            break;
        case 'superpowers':
            if (SUPERPOWERS_SKILLS.some((name) => entries.includes(name)))
                return true;
            break;
        case 'driv':
            if (platform.id === 'opencode' || platform.id === 'trae') {
                for (const dir of skillDirEntries) {
                    if (await hasDrivCommands(baseDir, dir.skillsDir, dir.entries))
                        return true;
                }
                break;
            }
            if (entries.some((e) => e.startsWith('driv')))
                return true;
            break;
    }
    if (scope === 'project' && baseDir !== os.homedir()) {
        const globalSkillDirEntries = await Promise.all(getPlatformSkillsDirs(platform, 'global').map(async (skillsDir) => {
            const fullPath = path.join(os.homedir(), skillsDir, 'skills');
            return {
                skillsDir,
                entries: (await fileExists(fullPath)) ? await readDir(fullPath) : [],
            };
        }));
        const globalEntries = globalSkillDirEntries.flatMap((dir) => dir.entries);
        switch (component) {
            case 'openspec':
                if (globalEntries.some((e) => e.startsWith('openspec-')))
                    return true;
                break;
            case 'superpowers':
                if (SUPERPOWERS_SKILLS.some((name) => globalEntries.includes(name)))
                    return true;
                break;
            case 'driv':
                if (platform.id === 'opencode' || platform.id === 'trae') {
                    for (const dir of globalSkillDirEntries) {
                        if (await hasDrivCommands(os.homedir(), dir.skillsDir, dir.entries)) {
                            return true;
                        }
                    }
                    break;
                }
                if (globalEntries.some((e) => e.startsWith('driv')))
                    return true;
                break;
        }
    }
    if (component === 'superpowers' && platform.id === 'claude') {
        if (await hasPluginSuperpowers())
            return true;
    }
    if (component === 'superpowers' && platform.id === 'opencode') {
        if (await hasOpenCodePluginSuperpowers())
            return true;
    }
    return false;
}
export { hasPluginSuperpowers, hasOpenCodePluginSuperpowers };
//# sourceMappingURL=detect.js.map