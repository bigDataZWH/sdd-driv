import * as path from 'path';
import { OPENCODE_SKILLS_DIR, OPENCODE_COMMANDS_DIR } from '../utils/paths.js';
import { DrivPhase } from './dispatch.js';

export type SlashCommandName =
  | '/driv-clarify'
  | '/driv-design'
  | '/driv-build'
  | '/driv-verify'
  | '/driv-archive'
  | '/driv-review'
  | '/driv-cleancode'
  | '/driv';

export interface SlashCommandEntry {
  name: SlashCommandName;
  phase: DrivPhase | 'review' | 'cleancode' | 'status';
  skillName: string;
}

export interface SlashCommandContext {
  changeName?: string;
  args?: string[];
  cwd?: string;
}

export interface SlashCommandResult {
  success: boolean;
  name: string;
  phase: string;
  skillPath: string;
  commandPath: string;
  error?: string;
}

const DRIV_COMMANDS: SlashCommandEntry[] = [
  { name: '/driv-clarify', phase: 'clarify', skillName: 'driv-clarify' },
  { name: '/driv-design', phase: 'design', skillName: 'driv-design' },
  { name: '/driv-build', phase: 'build', skillName: 'driv-build' },
  { name: '/driv-verify', phase: 'verify', skillName: 'driv-verify' },
  { name: '/driv-archive', phase: 'archive', skillName: 'driv-archive' },
  { name: '/driv-review', phase: 'review', skillName: 'driv-review' },
  { name: '/driv-cleancode', phase: 'cleancode', skillName: 'driv-cleancode' },
  { name: '/driv', phase: 'status', skillName: 'driv' },
];

export function registerSlashCommands(): string[] {
  return DRIV_COMMANDS.map((c) => c.name);
}

export function getSlashCommandEntry(name: string): SlashCommandEntry | undefined {
  return DRIV_COMMANDS.find((c) => c.name === name);
}

function resolveSkillPath(cwd: string, skillName: string): string {
  const base = cwd === process.cwd() ? OPENCODE_SKILLS_DIR : path.join(cwd, '.opencode', 'skills');
  return path.join(base, skillName, 'SKILL.md');
}

function resolveCommandPath(cwd: string, skillName: string): string {
  const base =
    cwd === process.cwd() ? OPENCODE_COMMANDS_DIR : path.join(cwd, '.opencode', 'commands');
  return path.join(base, `${skillName}.md`);
}

export async function executeSlashCommand(
  name: string,
  context?: SlashCommandContext,
): Promise<SlashCommandResult> {
  const entry = getSlashCommandEntry(name);
  if (!entry) {
    const available = DRIV_COMMANDS.map((c) => c.name).join(', ');
    return {
      success: false,
      name,
      phase: 'unknown',
      skillPath: '',
      commandPath: '',
      error: `未知命令: ${name}。可用命令: ${available}`,
    };
  }

  const cwd = context?.cwd || process.cwd();
  const skillPath = resolveSkillPath(cwd, entry.skillName);
  const commandPath = resolveCommandPath(cwd, entry.skillName);

  return {
    success: true,
    name: entry.name,
    phase: entry.phase,
    skillPath,
    commandPath,
  };
}
