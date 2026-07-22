import * as path from 'path';
import * as os from 'os';
import { fileExists, readDir, readJson } from '../utils/file-system.js';
import { PLATFORMS, getPlatformSkillsDirs, type Platform } from './platforms.js';
import type { InstallScope } from './types.js';

const SUPERPOWERS_SKILLS = [
  'brainstorming',
  'using-superpowers',
  'writing-plans',
  'test-driven-development',
  'subagent-driven-development',
];

export function getBaseDir(scope: InstallScope, projectPath: string): string {
  return scope === 'global' ? os.homedir() : projectPath;
}

async function hasPluginSuperpowers(): Promise<boolean> {
  const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  const pluginsCacheDir = path.join(claudeDir, 'plugins', 'cache');

  try {
    const marketplaceEntries = await readDir(pluginsCacheDir);
    for (const marketplace of marketplaceEntries) {
      const superpowersDir = path.join(pluginsCacheDir, marketplace, 'superpowers');
      if (!(await fileExists(superpowersDir))) continue;

      const versionEntries = await readDir(superpowersDir);
      for (const version of versionEntries) {
        const skillsDir = path.join(superpowersDir, version, 'skills');
        if (!(await fileExists(skillsDir))) continue;
        const skills = await readDir(skillsDir);
        if (SUPERPOWERS_SKILLS.some((name) => skills.includes(name))) {
          return true;
        }
      }
    }
  } catch (err) {
    console.warn(`[driv] detect: failed to detect plugin superpowers: ${(err as Error).message}`);
  }
  return false;
}

async function hasOpenCodePluginSuperpowers(): Promise<boolean> {
  const opencodeDir =
    process.env.OPENCODE_CONFIG_DIR || path.join(os.homedir(), '.config', 'opencode');

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
      const config = (await readJson(configPath)) as Record<string, unknown>;
      const plugins = config.plugin;
      if (Array.isArray(plugins)) {
        if (plugins.some((entry) => typeof entry === 'string' && entry.includes('superpowers'))) {
          return true;
        }
      }
    } catch (err) {
      console.debug(`[driv] detect: failed to read opencode plugin config: ${(err as Error).message}`);
    }
  }

  return false;
}

async function hasDrivCommands(baseDir: string, skillsDir: string, entries: string[]) {
  const drivEntries = entries.filter((entry) => entry.startsWith('driv'));
  if (drivEntries.length === 0) return false;

  const commandsDir = path.join(baseDir, skillsDir, 'commands');
  if (!(await fileExists(commandsDir))) return false;
  const commandEntries = await readDir(commandsDir);
  return drivEntries.every((entry) => commandEntries.includes(`${entry}.md`));
}

export async function detectPlatforms(projectPath: string): Promise<Set<string>> {
  const detected = new Set<string>();

  for (const platform of PLATFORMS) {
    if (platform.detectionPaths && platform.detectionPaths.length > 0) {
      for (const p of platform.detectionPaths) {
        if (await fileExists(path.join(projectPath, p))) {
          detected.add(platform.id);
          break;
        }
      }
    } else {
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

async function getSkillDirEntries(
  baseDir: string,
  platform: Platform,
  scope: InstallScope,
): Promise<{ skillsDir: string; entries: string[] }[]> {
  return Promise.all(
    getPlatformSkillsDirs(platform, scope).map(async (skillsDir) => {
      const fullPath = path.join(baseDir, skillsDir, 'skills');
      return {
        skillsDir,
        entries: (await fileExists(fullPath)) ? await readDir(fullPath) : [],
      };
    }),
  );
}

function checkComponentInEntries(
  entries: string[],
  skillDirEntries: { skillsDir: string; entries: string[] }[],
  component: 'openspec' | 'superpowers' | 'driv',
  platform: Platform,
  baseDir: string,
): Promise<boolean> {
  switch (component) {
    case 'openspec':
      return Promise.resolve(entries.some((e) => e.startsWith('openspec-')));
    case 'superpowers':
      return Promise.resolve(SUPERPOWERS_SKILLS.some((name) => entries.includes(name)));
    case 'driv':
      if (platform.id === 'opencode' || platform.id === 'trae') {
        return (async () => {
          for (const dir of skillDirEntries) {
            if (await hasDrivCommands(baseDir, dir.skillsDir, dir.entries)) return true;
          }
          return false;
        })();
      }
      return Promise.resolve(entries.some((e) => e.startsWith('driv')));
  }
}

export async function hasSkills(
  baseDir: string,
  platform: Platform,
  component: 'openspec' | 'superpowers' | 'driv',
  _selectedPlatforms: Platform[] = [],
  scope: InstallScope = 'project',
): Promise<boolean> {
  const skillDirEntries = await getSkillDirEntries(baseDir, platform, scope);
  const entries = skillDirEntries.flatMap((dir) => dir.entries);

  if (await checkComponentInEntries(entries, skillDirEntries, component, platform, baseDir)) {
    return true;
  }

  if (scope === 'project' && baseDir !== os.homedir()) {
    const globalSkillDirEntries = await getSkillDirEntries(os.homedir(), platform, 'global');
    const globalEntries = globalSkillDirEntries.flatMap((dir) => dir.entries);

    if (
      await checkComponentInEntries(
        globalEntries,
        globalSkillDirEntries,
        component,
        platform,
        os.homedir(),
      )
    ) {
      return true;
    }
  }

  if (component === 'superpowers') {
    if (platform.id === 'claude' && (await hasPluginSuperpowers())) return true;
    if (platform.id === 'opencode' && (await hasOpenCodePluginSuperpowers())) return true;
  }

  return false;
}

export { hasPluginSuperpowers, hasOpenCodePluginSuperpowers };