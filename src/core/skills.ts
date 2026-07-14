import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { fileExists, ensureDir, writeFile, readJson } from '../utils/file-system.js';
import type { Logger } from '../utils/logger.js';
import { getPlatformSkillsDir, type Platform } from './platforms.js';
import type { InstallScope } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DRIV_PACKAGE_ROOT = path.resolve(__dirname, '..', '..');

type HookConfig = {
  matcher: string;
  description: string;
};

type DrivManifest = {
  version: string;
  skills: string[];
  rules?: string[];
  hooks?: Record<string, HookConfig>;
  languages?: Array<{ id: string; name: string; skillsDir: string }>;
};

const OPENCODE_COMMAND_HEADER = `---
description: Run the {skillName} OpenCode workflow
---
`;

function getPackageSkillsDir(): string {
  return path.join(DRIV_PACKAGE_ROOT, '.opencode', 'skills');
}

async function ensureSkillsDir(baseDir: string, skillName: string): Promise<string | null> {
  const dir = path.join(baseDir, '.opencode', 'skills', skillName);
  if (await fileExists(dir)) return dir;
  return null;
}

export async function installDrivSkills(
  baseDir: string,
  skillNames: string[],
  overwrite: boolean,
  skipExisting?: boolean,
): Promise<{ copied: number; skipped: number }> {
  let copied = 0;
  let skipped = 0;
  const packageSkillsDir = getPackageSkillsDir();

  for (const skillName of skillNames) {
    const srcSkillFile = path.join(packageSkillsDir, skillName, 'SKILL.md');
    const destDir = path.join(baseDir, '.opencode', 'skills', skillName);
    const destSkillFile = path.join(destDir, 'SKILL.md');

    if (!(await fileExists(srcSkillFile))) {
      skipped++;
      continue;
    }

    const exists = await fileExists(destSkillFile);
    if (exists && skipExisting) {
      skipped++;
      continue;
    }
    if (exists && !overwrite) {
      skipped++;
      continue;
    }

    await ensureDir(destDir);
    await fs.promises.copyFile(srcSkillFile, destSkillFile);
    copied++;
  }

  return { copied, skipped };
}

export async function createOpenCodeCommands(
  baseDir: string,
  skillNames: string[],
  overwrite: boolean,
): Promise<{ copied: number; skipped: number }> {
  let copied = 0;
  let skipped = 0;
  const commandsDir = path.join(baseDir, '.opencode', 'commands');

  for (const skillName of skillNames) {
    const dest = path.join(commandsDir, `${skillName}.md`);

    if (!overwrite && (await fileExists(dest))) {
      skipped++;
      continue;
    }

    const skillDir = await ensureSkillsDir(baseDir, skillName);
    if (!skillDir) {
      skipped++;
      continue;
    }
    const skillPath = path.join(skillDir, 'SKILL.md');
    if (!(await fileExists(skillPath))) {
      skipped++;
      continue;
    }

    const { readFile } = await import('fs/promises');
    const skillContent = await readFile(skillPath, 'utf-8');
    const skillBody = stripFrontmatter(skillContent);
    const content = `${OPENCODE_COMMAND_HEADER.replace('{skillName}', skillName)}
Equivalent skill: \`${skillName}\`
Command name: \`/${skillName}\`

Use the invocation arguments below as the user input for this workflow:

\`\`\`text
$ARGUMENTS
\`\`\`

${skillBody}
`;

    await ensureDir(path.dirname(dest));
    await writeFile(dest, content);
    copied++;
  }

  return { copied, skipped };
}

export function stripFrontmatter(content: string): string {
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    return content.trimStart();
  }

  const normalized = content.replace(/\r\n/g, '\n');
  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) {
    const eof = normalized.lastIndexOf('\n---');
    if (eof >= 4) return '';
    return content.trimStart();
  }

  return normalized.slice(end + '\n---\n'.length).trimStart();
}

async function readManifest(): Promise<DrivManifest> {
  const manifestPath = path.join(DRIV_PACKAGE_ROOT, 'assets', 'manifest.json');
  return readJson<DrivManifest>(manifestPath);
}

export async function copyDrivRulesForPlatform(
  baseDir: string,
  platform: Platform,
  overwrite: boolean,
  scope: InstallScope = 'project',
  logger?: Logger,
): Promise<{ copied: number; skipped: number }> {
  if (!platform.rulesDir || !platform.rulesFormat) {
    return { copied: 0, skipped: 0 };
  }

  const manifest = await readManifest();
  const rulePaths = manifest.rules;
  if (!rulePaths || rulePaths.length === 0) {
    return { copied: 0, skipped: 0 };
  }

  const rulesBase =
    platform.rulesBaseDir !== undefined
      ? platform.rulesBaseDir === ''
        ? baseDir
        : path.join(baseDir, platform.rulesBaseDir)
      : path.join(baseDir, getPlatformSkillsDir(platform, scope));
  let copied = 0;
  let skippedCount = 0;

  for (const ruleRelPath of rulePaths) {
    const src = path.join(DRIV_PACKAGE_ROOT, '.driv', ruleRelPath);
    if (!(await fileExists(src))) {
      const msg = `    Rule source not found: ${ruleRelPath}`;
      if (logger) {
        logger.error(msg);
      } else {
        console.error(msg);
      }
      continue;
    }

    const ruleFileName = path.basename(ruleRelPath);
    const rulesDestDir = path.join(rulesBase, platform.rulesDir);
    const dest = computeRuleDestPath(rulesDestDir, ruleFileName, platform.rulesFormat);

    if (!overwrite && (await fileExists(dest))) {
      skippedCount++;
      continue;
    }

    try {
      const content = await fs.promises.readFile(src, 'utf-8');
      await ensureDir(path.dirname(dest));
      const formatted = formatRuleContent(content, ruleFileName, platform.rulesFormat);
      await writeFile(dest, formatted);
      copied++;
    } catch (err) {
      const msg = `    Failed to copy rule ${ruleRelPath}: ${(err as Error).message}`;
      if (logger) {
        logger.error(msg);
      } else {
        console.error(msg);
      }
    }
  }

  return { copied, skipped: skippedCount };
}

function computeRuleDestPath(
  rulesDestDir: string,
  ruleFileName: string,
  rulesFormat: string,
): string {
  if (rulesFormat === 'mdc') {
    return path.join(rulesDestDir, ruleFileName.replace(/\.md$/, '.mdc'));
  }
  if (rulesFormat === 'copilot') {
    return path.join(rulesDestDir, ruleFileName.replace(/\.md$/, '.instructions.md'));
  }
  return path.join(rulesDestDir, ruleFileName);
}

function formatRuleContent(content: string, ruleFileName: string, rulesFormat: string): string {
  if (rulesFormat === 'mdc') {
    return `---
description: ${ruleFileName.replace(/\.md$/, '').replace(/-/g, ' ')}
globs:
alwaysApply: true
---

${content}`;
  }
  if (rulesFormat === 'copilot') {
    return `---
applyTo: "**"
---

${content}`;
  }
  return content;
}

export async function installDrivHooksForPlatform(
  baseDir: string,
  platform: Platform,
  scope: InstallScope = 'project',
): Promise<{ installed: boolean; reason?: string }> {
  if (!platform.supportsHooks || !platform.hookFormat) {
    return { installed: false, reason: 'platform does not support hooks' };
  }

  const manifest = await readManifest();
  const hooksConfig = manifest.hooks;
  if (!hooksConfig || Object.keys(hooksConfig).length === 0) {
    return { installed: false, reason: 'no hooks defined in manifest' };
  }

  const hookFormat = platform.hookFormat;
  const skillsDir = getPlatformSkillsDir(platform, scope);
  const platformBase = path.join(baseDir, skillsDir);

  try {
    switch (hookFormat) {
      case 'claude-code':
        return installClaudeCodeHooks(platformBase, skillsDir, hooksConfig);
      case 'qwen':
      case 'qoder':
        return installQwenStyleHooks(platformBase, skillsDir, hooksConfig);
      case 'gemini':
        return installGeminiHooks(platformBase, skillsDir, hooksConfig);
      case 'windsurf':
        return installWindsurfHooks(platformBase, skillsDir, hooksConfig);
      case 'copilot':
        return installCopilotHooks(platformBase, skillsDir, hooksConfig);
      case 'kiro':
        return installKiroHooks(platformBase, skillsDir, hooksConfig);
      default:
        return { installed: false, reason: `unsupported hook format: ${hookFormat}` };
    }
  } catch (err) {
    return { installed: false, reason: (err as Error).message };
  }
}

function buildHookCommand(skillsDir: string, scriptRelPath: string): string {
  return `bash ${skillsDir}/skills/${scriptRelPath}`;
}

function isManagedHookCommand(command: unknown, scriptRelPaths: string[]): boolean {
  if (typeof command !== 'string') return false;

  const commandPath = command
    .trim()
    .match(/^bash\s+["']?([^"'\s]+)["']?(?:\s|$)/)?.[1]
    ?.replace(/\\/g, '/');
  if (!commandPath) return false;

  return scriptRelPaths.some((scriptRelPath) =>
    commandPath.endsWith(`/skills/${scriptRelPath.replace(/\\/g, '/')}`),
  );
}

function mergeHookGroups<T extends { command: string }>(
  existingGroups: Array<Record<string, unknown>>,
  newGroups: Array<{ matcher: string; hooks: T[] }>,
  scriptRelPaths: string[],
): Array<Record<string, unknown>> {
  const mergedGroups = existingGroups.flatMap((group) => {
    if (!Array.isArray(group.hooks)) return [group];

    const hooks = group.hooks.filter(
      (hook) => !isManagedHookCommand((hook as Record<string, unknown>).command, scriptRelPaths),
    );
    if (hooks.length === 0 && group.hooks.length > 0) return [];

    return [{ ...group, hooks }];
  });

  for (const newGroup of newGroups) {
    const existingGroup = mergedGroups.find(
      (group) => group.matcher === newGroup.matcher && Array.isArray(group.hooks),
    );
    if (existingGroup) {
      existingGroup.hooks = [...(existingGroup.hooks as unknown[]), ...newGroup.hooks];
    } else {
      mergedGroups.push(newGroup);
    }
  }

  return mergedGroups;
}

function asHookGroup(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

async function installClaudeCodeHooks(
  platformBase: string,
  skillsDir: string,
  hooksConfig: Record<string, HookConfig>,
): Promise<{ installed: boolean; reason?: string }> {
  const settingsPath = path.join(platformBase, 'settings.local.json');

  const matcherGroups: Record<string, Array<{ type: string; command: string }>> = {};
  for (const [scriptRelPath, config] of Object.entries(hooksConfig)) {
    const command = buildHookCommand(skillsDir, scriptRelPath);
    if (!matcherGroups[config.matcher]) {
      matcherGroups[config.matcher] = [];
    }
    matcherGroups[config.matcher].push({ type: 'command', command });
  }

  const newEntries = Object.entries(matcherGroups).map(([matcher, hooks]) => ({ matcher, hooks }));

  let settings: Record<string, unknown> = {};
  if (await fileExists(settingsPath)) {
    try {
      settings = JSON.parse(await fs.promises.readFile(settingsPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      settings = {};
    }
  }

  const existingHooks = (settings.hooks as Record<string, unknown>) ?? {};
  const existingPreToolUse = asHookGroup(existingHooks.PreToolUse);
  const merged = mergeHookGroups(existingPreToolUse, newEntries, Object.keys(hooksConfig));

  settings.hooks = { ...existingHooks, PreToolUse: merged };
  await ensureDir(path.dirname(settingsPath));
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  return { installed: true };
}

async function installQwenStyleHooks(
  platformBase: string,
  skillsDir: string,
  hooksConfig: Record<string, HookConfig>,
): Promise<{ installed: boolean; reason?: string }> {
  const settingsPath = path.join(platformBase, 'settings.json');

  const matcherGroups: Record<
    string,
    Array<{ type: string; command: string; description: string }>
  > = {};
  for (const [scriptRelPath, config] of Object.entries(hooksConfig)) {
    if (!matcherGroups[config.matcher]) {
      matcherGroups[config.matcher] = [];
    }
    matcherGroups[config.matcher].push({
      type: 'command',
      command: buildHookCommand(skillsDir, scriptRelPath),
      description: config.description,
    });
  }

  const preToolUseEntries = Object.entries(matcherGroups).map(([matcher, hooks]) => ({
    matcher,
    hooks,
  }));

  let settings: Record<string, unknown> = {};
  if (await fileExists(settingsPath)) {
    try {
      settings = JSON.parse(await fs.promises.readFile(settingsPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      settings = {};
    }
  }

  const existingHooks = (settings.hooks as Record<string, unknown>) ?? {};
  const existingPreToolUse = asHookGroup(existingHooks.PreToolUse);
  const merged = mergeHookGroups(existingPreToolUse, preToolUseEntries, Object.keys(hooksConfig));

  settings.hooks = { ...existingHooks, PreToolUse: merged };
  await ensureDir(path.dirname(settingsPath));
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  return { installed: true };
}

async function installGeminiHooks(
  platformBase: string,
  skillsDir: string,
  hooksConfig: Record<string, HookConfig>,
): Promise<{ installed: boolean; reason?: string }> {
  const settingsPath = path.join(platformBase, 'settings.json');

  const entries: Array<{
    matcher: string;
    hooks: Array<{ type: string; command: string; name: string }>;
  }> = [];
  for (const [scriptRelPath, config] of Object.entries(hooksConfig)) {
    entries.push({
      matcher: config.matcher === 'Write|Edit' ? 'write_file|edit_file' : config.matcher,
      hooks: [
        {
          type: 'command',
          command: buildHookCommand(skillsDir, scriptRelPath),
          name: config.description,
        },
      ],
    });
  }

  let settings: Record<string, unknown> = {};
  if (await fileExists(settingsPath)) {
    try {
      settings = JSON.parse(await fs.promises.readFile(settingsPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      settings = {};
    }
  }

  const existingHooks = (settings.hooks as Record<string, unknown>) ?? {};
  const existingBeforeTool = asHookGroup(existingHooks.BeforeTool);
  const merged = mergeHookGroups(existingBeforeTool, entries, Object.keys(hooksConfig));

  settings.hooks = { ...existingHooks, BeforeTool: merged };
  await ensureDir(path.dirname(settingsPath));
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  return { installed: true };
}

async function installWindsurfHooks(
  platformBase: string,
  skillsDir: string,
  hooksConfig: Record<string, HookConfig>,
): Promise<{ installed: boolean; reason?: string }> {
  const hooksPath = path.join(platformBase, 'hooks.json');

  const entries: Array<{ command: string; show_output: boolean }> = [];
  for (const [scriptRelPath] of Object.entries(hooksConfig)) {
    entries.push({
      command: buildHookCommand(skillsDir, scriptRelPath),
      show_output: true,
    });
  }

  let hooksFile: Record<string, unknown> = {};
  if (await fileExists(hooksPath)) {
    try {
      hooksFile = JSON.parse(await fs.promises.readFile(hooksPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      hooksFile = {};
    }
  }

  const existingHooks = (hooksFile.hooks as Record<string, unknown>) ?? {};
  const existingPreWrite = asHookGroup(existingHooks.pre_write_code);
  const merged = existingPreWrite.filter(
    (entry) => !isManagedHookCommand(entry.command, Object.keys(hooksConfig)),
  );
  merged.push(...entries);

  hooksFile.hooks = { ...existingHooks, pre_write_code: merged };
  await ensureDir(path.dirname(hooksPath));
  await writeFile(hooksPath, JSON.stringify(hooksFile, null, 2) + '\n');
  return { installed: true };
}

async function installCopilotHooks(
  platformBase: string,
  skillsDir: string,
  hooksConfig: Record<string, HookConfig>,
): Promise<{ installed: boolean; reason?: string }> {
  const hooksDir = path.join(platformBase, 'hooks');
  const hookFilePath = path.join(hooksDir, 'driv-guard.json');

  const scriptEntries: Array<{ bash: string; powershell: string }> = [];
  for (const [scriptRelPath] of Object.entries(hooksConfig)) {
    const cmd = buildHookCommand(skillsDir, scriptRelPath);
    scriptEntries.push({ bash: cmd, powershell: `bash -c '${cmd}'` });
  }

  const hookConfig = {
    version: 1,
    hooks: {
      preToolUse: scriptEntries,
    },
  };

  await ensureDir(hooksDir);
  await writeFile(hookFilePath, JSON.stringify(hookConfig, null, 2) + '\n');
  return { installed: true };
}

async function installKiroHooks(
  platformBase: string,
  skillsDir: string,
  hooksConfig: Record<string, HookConfig>,
): Promise<{ installed: boolean; reason?: string }> {
  const hooksDir = path.join(platformBase, 'hooks');

  for (const [scriptRelPath, config] of Object.entries(hooksConfig)) {
    const hookFileName = path.basename(scriptRelPath).replace(/\.sh$/, '.kiro.hook');
    const hookFilePath = path.join(hooksDir, hookFileName);

    const toolName = config.matcher === 'Write|Edit' ? 'write' : '*';

    const hookConfig = {
      enabled: true,
      name: config.description,
      description: config.description,
      version: '1',
      when: {
        type: 'preToolUse',
        toolName,
      },
      then: {
        type: 'runCommand',
        command: buildHookCommand(skillsDir, scriptRelPath),
      },
    };

    await ensureDir(hooksDir);
    await writeFile(hookFilePath, JSON.stringify(hookConfig, null, 2) + '\n');
  }

  return { installed: true };
}
