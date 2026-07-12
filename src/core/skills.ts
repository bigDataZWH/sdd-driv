import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { fileExists, ensureDir, writeFile } from '../utils/file-system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DRIV_PACKAGE_ROOT = path.resolve(__dirname, '..', '..');

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
