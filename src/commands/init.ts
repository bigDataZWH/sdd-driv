import * as path from 'path';
import * as os from 'os';
import { ensureDir } from '../utils/file-system.js';
import { createOpenCodeCommands, installDrivSkills } from '../core/skills.js';
import { syncDrivAssets } from '../core/assets.js';
import { getDrivSkills } from './update.js';
import { getPackageVersion } from '../core/manifest.js';

export interface InitResult {
  createdDirs: string[];
  skillsCopied: number;
  skillsSkipped: number;
  commandsCopied: number;
  commandsSkipped: number;
  templatesCopied: number;
  templatesSkipped: number;
  openspec: string;
  superpowers: string;
  summary: string;
  scope: 'project' | 'global';
}

export interface InitOptions {
  yes?: boolean;
  scope?: 'project' | 'global';
  skipExisting?: boolean;
  overwrite?: boolean;
  json?: boolean;
}

const DRIV_BANNER = [
  `   ____       _ _    `,
  `  |  _ \\ _ __(_) |_  `,
  `  | | | | '__| | __| `,
  `  | |_| | |  | | |_  `,
  `  |____/|_|  |_|\\__| `,
  `  Driv – OpenSpec + Superpowers Workflow`,
].join('\n');

function printBanner(log: (msg: string) => void): void {
  log(`\n${DRIV_BANNER}\n`);
  log(`  Version: ${getPackageVersion()}\n`);
}

function selectScope(options: InitOptions): 'project' | 'global' {
  if (options.scope) return options.scope;
  if (options.yes) return 'project';
  return 'project';
}

export async function initCommand(
  projectPath: string,
  _platformIds: string[],
  options: InitOptions = {},
): Promise<InitResult> {
  const log = options.json ? () => undefined : console.log;
  const scope = selectScope(options);
  const baseDir = scope === 'global' ? os.homedir() : path.resolve(projectPath);

  if (!options.json) {
    printBanner(log);
    log(`  Setting up Driv in ${baseDir}\n`);
  }

  const createdDirs: string[] = [];
  let templatesResult = { copied: 0, skipped: 0 };

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
  }

  // Step 1: Install Driv skills from package to target
  const overwrite = options.overwrite ?? false;
  const skipExisting = options.skipExisting ?? (options.yes ? true : undefined);
  const existingSkills = [
    'openspec-propose',
    'openspec-apply',
    'openspec-explore',
    'openspec-archive',
  ];
  const drivSkills = getDrivSkills();
  const allSkillNames = [...existingSkills, ...drivSkills];

  const skillsResult = await installDrivSkills(baseDir, allSkillNames, overwrite, skipExisting);

  // Step 2: Generate OpenCode commands from installed skills
  const openspecResult = await createOpenCodeCommands(baseDir, existingSkills, overwrite);
  const drivResult = await createOpenCodeCommands(baseDir, drivSkills, overwrite);

  const openspec = skillsResult.copied > 0 ? 'installed' : 'skipped';
  const superpowers = 'skipped';

  if (options.json) {
    const jsonResult = {
      projectPath: baseDir,
      scope,
      createdDirs,
      skills: skillsResult,
      openspecCommands: openspecResult,
      drivCommands: drivResult,
      templates: templatesResult,
      workingDirsCreated: createdDirs.length,
    };
    console.log(JSON.stringify(jsonResult, null, 2));
    return {
      createdDirs,
      skillsCopied: skillsResult.copied,
      skillsSkipped: skillsResult.skipped,
      commandsCopied: drivResult.copied + openspecResult.copied,
      commandsSkipped: drivResult.skipped + openspecResult.skipped,
      templatesCopied: templatesResult.copied,
      templatesSkipped: templatesResult.skipped,
      openspec,
      superpowers,
      summary: '',
      scope,
    };
  }

  log(`  Installed:`);
  if (skillsResult.copied > 0) {
    log(`    Driv skills: ${skillsResult.copied} copied`);
  }
  if (openspecResult.copied > 0) {
    log(`    OpenSpec commands: ${openspecResult.copied} created`);
  }
  if (drivResult.copied > 0) {
    log(`    Driv commands: ${drivResult.copied} created`);
  }
  if (templatesResult.copied > 0) {
    log(`    Templates: ${templatesResult.copied} copied`);
  }
  if (scope === 'project') {
    log(`    Working directories: .driv/`);
  }

  if (skillsResult.skipped > 0) {
    log(`  Skipped:`);
    log(`    Skills: ${skillsResult.skipped} already exist`);
    if (openspecResult.skipped > 0)
      log(`    OpenSpec commands: ${openspecResult.skipped} already exist`);
    if (drivResult.skipped > 0) log(`    Driv commands: ${drivResult.skipped} already exist`);
    if (templatesResult.skipped > 0) log(`    Templates: ${templatesResult.skipped} already exist`);
  }

  log(`\n  Get started:`);
  log(`    /driv "your idea"  — Start a new change`);
  log(`    /driv-hotfix       — Quick bug fix`);
  log(`    /driv-tweak        — Small change\n`);

  const summary = `OpenSpec: ${openspec}\nSuperpowers: ${superpowers}\nSkills: ${skillsResult.copied} installed, ${skillsResult.skipped} skipped\nCommands: ${drivResult.copied + openspecResult.copied} created\nTemplates: ${templatesResult.copied} copied, ${templatesResult.skipped} skipped`;

  return {
    createdDirs,
    skillsCopied: skillsResult.copied,
    skillsSkipped: skillsResult.skipped,
    commandsCopied: drivResult.copied + openspecResult.copied,
    commandsSkipped: drivResult.skipped + openspecResult.skipped,
    templatesCopied: templatesResult.copied,
    templatesSkipped: templatesResult.skipped,
    openspec,
    superpowers,
    summary,
    scope,
  };
}
