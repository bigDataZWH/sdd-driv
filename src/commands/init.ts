import * as path from 'path';
import * as os from 'os';
import { select, checkbox } from '@inquirer/prompts';
import { ensureDir, fileExists, writeFile } from '../utils/file-system.js';
import { createOpenCodeCommands, installDrivSkills, installDrivScripts, copyDrivRulesForPlatform, installDrivHooksForPlatform, OPENSPEC_SKILL_NAMES } from '../core/skills.js';
import { syncDrivAssets } from '../core/assets.js';
import { getDrivSkills } from './update.js';
import { getPackageVersion } from '../core/manifest.js';
import { PLATFORMS, getPlatformSkillsDir, type Platform } from '../core/platforms.js';
import { detectPlatforms, hasSkills, getBaseDir } from '../core/detect.js';
import { installSuperpowersForPlatforms } from '../core/superpowers.js';
import { installOpenSpec, getNpmExecutable, execFileSafe } from '../core/openspec.js';
import {
  resolveBundle,
  installOpenSpecOffline,
  installSuperpowersOffline,
  installCodegraphOffline,
  type ResolvedBundle,
} from '../core/offline.js';
import type { InstallScope } from '../core/types.js';

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
  scope: InstallScope;
  codegraph: string;
}

export interface InitOptions {
  yes?: boolean;
  scope?: InstallScope;
  skipExisting?: boolean;
  overwrite?: boolean;
  json?: boolean;
  /** 离线模式：跳过所有联网操作，使用离线兜底 */
  offline?: boolean;
  /** 离线包目录路径，配合 --offline 使用 */
  bundle?: string;
}

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

type InstallStatus = 'installed' | 'skipped' | 'failed';
type ComponentAction = 'overwrite' | 'skip' | 'install';
type BulkOverwriteChoice = 'overwrite-all' | 'skip-all' | 'choose';

interface PlatformResult {
  platform: Platform;
  driv: InstallStatus;
  codegraph: InstallStatus;
}

type ComponentPlan = {
  drivAction: ComponentAction;
};

async function printBanner(log: (msg: string) => void): Promise<void> {
  log(`\n${DRIV_BANNER}\n`);
  log(`  Version: ${await getPackageVersion()}\n`);
}

function isInteractive(options: InitOptions): boolean {
  if (options.yes || options.json || options.scope || options.overwrite || options.skipExisting || options.offline) {
    return false;
  }
  // 非 TTY 环境（CI、管道、容器）自动降级为非交互模式
  if (process.stdin.isTTY === false) {
    return false;
  }
  return true;
}

async function createWorkingDirs(projectPath: string): Promise<void> {
  const plansDir = path.join(projectPath, 'docs', 'superpowers', 'plans');
  await ensureDir(plansDir);
}

async function selectScope(options: InitOptions): Promise<InstallScope> {
  if (options.scope) return options.scope;
  if (!isInteractive(options)) return 'project';

  return select({
    message: 'Install scope:',
    choices: [
      { name: 'Project (current directory)', value: 'project' as const },
      { name: 'Global (home directory)', value: 'global' as const },
    ],
  });
}

async function selectLanguage(options: InitOptions): Promise<typeof LANGUAGES[0]> {
  if (!isInteractive(options)) return LANGUAGES[0];

  const langId = await select({
    message: 'Language for Driv skills:',
    choices: LANGUAGES.map((lang) => ({ name: lang.name, value: lang.id })),
  });

  return LANGUAGES.find((l) => l.id === langId) ?? LANGUAGES[0];
}

async function selectPlatforms(detected: Set<string>, options: InitOptions): Promise<string[]> {
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

async function promptOverwriteChoice(
  componentName: string,
  platformName: string,
): Promise<'overwrite' | 'skip'> {
  return select({
    message: `${componentName} already installed on ${platformName}. What to do?`,
    choices: [
      { name: 'Overwrite', value: 'overwrite' as const },
      { name: 'Skip', value: 'skip' as const },
    ],
  });
}

async function promptBulkOverwriteChoice(
  platformName: string,
  components: string[],
): Promise<BulkOverwriteChoice> {
  return select({
    message: `${platformName} already has ${components.join(', ')} installed. What to do?`,
    choices: [
      { name: 'Overwrite all existing components', value: 'overwrite-all' as const },
      { name: 'Skip all existing components', value: 'skip-all' as const },
      { name: 'Choose per component', value: 'choose' as const },
    ],
  });
}

function applyBulkOverwriteChoice<T extends ComponentPlan>(
  plan: T,
  choice: Exclude<BulkOverwriteChoice, 'choose'>,
): T {
  const action = choice === 'overwrite-all' ? 'overwrite' : 'skip';
  return {
    ...plan,
    drivAction: plan.drivAction === 'install' ? action : plan.drivAction,
  };
}

function resolveAction(
  hasExisting: boolean,
  options: InitOptions,
): 'overwrite' | 'skip' | 'install' {
  if (!hasExisting) return 'install';
  if (options.overwrite) return 'overwrite';
  if (options.skipExisting) return 'skip';
  if (!isInteractive(options)) return 'skip';
  return 'install';
}

interface Configuration {
  scope: InstallScope;
  language: typeof LANGUAGES[0];
  selectedPlatformIds: string[];
  selectedPlatforms: Platform[];
  baseDir: string;
}

async function selectConfiguration(
  targetPath: string,
  options: InitOptions,
  log: (msg: string) => void,
): Promise<Configuration> {
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

  return { scope, language, selectedPlatformIds, selectedPlatforms, baseDir };
}

async function installPlatforms(
  platforms: Platform[],
  baseDir: string,
  scope: InstallScope,
  selectedPlatformIds: string[],
  options: InitOptions,
  log: (msg: string) => void,
): Promise<PlatformResult[]> {
  type PlatformPlan = ComponentPlan & {
    platform: Platform;
    hasDriv: boolean;
  };

  const plans: PlatformPlan[] = [];

  for (const platform of platforms) {
    const hasDriv = await hasSkills(baseDir, platform, 'driv', platforms, scope);
    let drivAction = resolveAction(hasDriv, options);

    if (isInteractive(options)) {
      const existingComponents = [hasDriv && drivAction === 'install' ? 'Driv' : null].filter(
        (component): component is string => Boolean(component),
      );

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

  const results: PlatformResult[] = [];

  for (const plan of plans) {
    const { platform, drivAction } = plan;
    const platformSkillsDir = getPlatformSkillsDir(platform, scope);
    const skillsPath = `${scope === 'global' ? '~/' : ''}${platformSkillsDir}/skills/`;

    let drivStatus: InstallStatus = 'skipped';
      if (drivAction !== 'skip') {
        const overwrite = drivAction === 'overwrite';
        const existingSkills = OPENSPEC_SKILL_NAMES;
        const drivSkills = getDrivSkills();
        const allSkillNames = [...existingSkills, ...drivSkills];

        const skillsResult = await installDrivSkills(baseDir, allSkillNames, overwrite, options.skipExisting, platform.id, scope);
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
        if (platform.id === 'opencode') {
          const scriptsResult = await installDrivScripts(baseDir);
          if (scriptsResult.copied > 0) {
            log(`    Scripts: ${scriptsResult.copied} copied`);
          }
        }
      } else {
        log(`  Driv -> ${platform.name}: skipped (already exists)`);
      }

    results.push({
      platform,
      driv: drivStatus,
      codegraph: 'skipped',
    });
  }

  return results;
}

async function installOpenSpecIfNeeded(
  targetPath: string,
  scope: InstallScope,
  selectedPlatformIds: string[],
  options: InitOptions,
  log: (msg: string) => void,
): Promise<InstallStatus> {
  if (scope !== 'project') return 'skipped';

  const openspecDir = path.join(targetPath, 'openspec');
  const openspecConfigExists = await fileExists(path.join(openspecDir, 'config.yaml'));

  if (openspecConfigExists) {
    log('  OpenSpec: already initialized');
    return 'skipped';
  }

  // 离线模式：写最小化 openspec/config.yaml，不调用 npx
  if (options.offline) {
    const status = await installOpenSpecOffline(targetPath);
    if (status === 'installed') {
      log('  OpenSpec: installed (offline, minimal config) -> openspec/');
    }
    return status;
  }

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
      const openspecStatus = await installOpenSpec(targetPath, selectedPlatformIds, scope);
      if (openspecStatus === 'installed') {
        log('  OpenSpec: installed -> openspec/');
      } else if (openspecStatus === 'failed') {
        log('  OpenSpec: failed (you can install manually with: npx @fission-ai/openspec init)');
      }
      return openspecStatus;
    }
    return 'skipped';
  }

  // Non-interactive: auto-create minimal openspec config
  await ensureDir(openspecDir);
  await ensureDir(path.join(openspecDir, 'changes'));
  await ensureDir(path.join(openspecDir, 'specs'));
  await writeFile(
    path.join(openspecDir, 'config.yaml'),
    'profile: custom\ntools:\n  - opencode\n',
  );
  return 'installed';
}

async function installSuperpowersIfNeeded(
  targetPath: string,
  scope: InstallScope,
  selectedPlatformIds: string[],
  options: InitOptions,
  log: (msg: string) => void,
  bundle: ResolvedBundle | null,
): Promise<InstallStatus> {
  // 离线模式：从 bundle 复制 superpowers skills
  if (options.offline) {
    if (!bundle || !bundle.superpowersDir) {
      log('  Superpowers: skipped (offline, no bundle superpowers content)');
      return 'skipped';
    }
    const baseDir = getBaseDir(scope, targetPath);
    const result = await installSuperpowersOffline(baseDir, scope, selectedPlatformIds, bundle);
    if (result.status === 'installed') {
      log(`  Superpowers: installed (offline) -> ${result.copied} skill files copied`);
    } else {
      log('  Superpowers: skipped (offline, no skills found in bundle)');
    }
    return result.status;
  }

  if (options.json || !isInteractive(options) || selectedPlatformIds.length === 0) {
    return 'skipped';
  }

  const shouldInstallSuperpowers = await select({
    message: 'Install Superpowers for enhanced AI workflows?',
    choices: [
      { name: 'Yes (adds brainstorming, TDD, subagent development skills)', value: true },
      { name: 'No', value: false },
    ],
  });

  if (!shouldInstallSuperpowers) return 'skipped';

  log('\n  Installing Superpowers...');
  const superpowersStatus = await installSuperpowersForPlatforms(targetPath, scope, selectedPlatformIds);
  if (superpowersStatus === 'installed') {
    log('  Superpowers: installed');
  } else if (superpowersStatus === 'failed') {
    log('  Superpowers: failed to clone from GitHub');
    log('  You can install manually: npx skills add obra/superpowers');
  }
  return superpowersStatus;
}

async function installCodegraphIfNeeded(
  scope: InstallScope,
  targetPath: string,
  results: PlatformResult[],
  options: InitOptions,
  log: (msg: string) => void,
  bundle: ResolvedBundle | null,
): Promise<InstallStatus> {
  // 离线模式：从 bundle 的本地 tarball 安装
  if (options.offline) {
    if (!bundle || !bundle.codegraphTarball) {
      log('  CodeGraph: skipped (offline, no bundle codegraph tarball)');
      return 'skipped';
    }
    log('\n  Installing CodeGraph (offline)...');
    const codegraphStatus = await installCodegraphOffline(scope, targetPath, bundle);
    if (codegraphStatus === 'installed') {
      log('  CodeGraph: installed (offline)');
    } else if (codegraphStatus === 'failed') {
      log('  CodeGraph: install failed (offline)');
    }
    for (const r of results) {
      r.codegraph = codegraphStatus;
    }
    return codegraphStatus;
  }

  if (options.json || !isInteractive(options)) return 'skipped';

  const shouldInstallCodegraph =
    options.yes ||
    (await select({
      message: 'Install CodeGraph for semantic code intelligence?',
      choices: [
        { name: 'Yes (recommended — saves ~16% cost · cuts ~58% tool calls)', value: true },
        { name: 'No', value: false },
      ],
    }));

  if (!shouldInstallCodegraph) {
    log('\n  CodeGraph: skipped');
    return 'skipped';
  }

  log('\n  Installing CodeGraph...');
  let codegraphStatus: InstallStatus;
  try {
    const npmCmd = getNpmExecutable();
    if (scope !== 'global') {
      // Ensure package.json exists so npm doesn't walk up to drive root
      const pkgJsonPath = path.join(targetPath, 'package.json');
      if (!(await fileExists(pkgJsonPath))) {
        await writeFile(
          pkgJsonPath,
          JSON.stringify(
            {
              name: path.basename(targetPath).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
              version: '1.0.0',
              private: true,
            },
            null,
            2,
          ) + '\n',
        );
      }
    }
    const args =
      scope === 'global'
        ? ['install', '-g', '@colbymchenry/codegraph']
        : ['install', '--prefix', targetPath, '@colbymchenry/codegraph'];
    const cwd = scope === 'global' ? os.homedir() : targetPath;
    await execFileSafe(npmCmd, args, {
      cwd,
      stdio: 'inherit',
      timeout: 300_000,
    });
    codegraphStatus = 'installed';
  } catch {
    codegraphStatus = 'failed';
    log('  CodeGraph: install failed');
    log('  Try running your terminal as administrator, or install manually:');
    log('    npm install -g @colbymchenry/codegraph');
  }
  log(`  CodeGraph: ${codegraphStatus}`);
  for (const r of results) {
    r.codegraph = codegraphStatus;
  }
  return codegraphStatus;
}

export async function initCommand(
  projectPath: string,
  _platformIds: string[],
  options: InitOptions = {},
): Promise<InitResult> {
  const log = options.json ? () => undefined : console.log;
  const targetPath = path.resolve(projectPath);

  if (!options.json) {
    await printBanner(log);
    log(`  Setting up Driv in ${targetPath}\n`);
  }

  // 解析离线包（若提供）
  let bundle: ResolvedBundle | null = null;
  if (options.offline && options.bundle) {
    bundle = await resolveBundle(options.bundle);
    if (!bundle) {
      log(`  Warning: bundle directory not found: ${options.bundle}`);
      log(`  Continuing in offline mode without bundle (online deps will be skipped).\n`);
    }
  }
  if (options.offline && !options.json) {
    log(`  Mode: offline${bundle ? ` (bundle: ${bundle.bundlePath})` : ' (no bundle)'}\n`);
  }

  const { scope, language, selectedPlatformIds, selectedPlatforms, baseDir } =
    await selectConfiguration(targetPath, options, log);

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

    await createWorkingDirs(targetPath);
    createdDirs.push(path.join(targetPath, 'docs', 'superpowers', 'plans'));
  }

  const results = await installPlatforms(
    selectedPlatforms,
    baseDir,
    scope,
    selectedPlatformIds,
    options,
    log,
  );

  const openspecStatus = await installOpenSpecIfNeeded(
    targetPath,
    scope,
    selectedPlatformIds,
    options,
    log,
  );

  const superpowersStatus = await installSuperpowersIfNeeded(
    targetPath,
    scope,
    selectedPlatformIds,
    options,
    log,
    bundle,
  );

  const codegraphStatus = await installCodegraphIfNeeded(
    scope,
    targetPath,
    results,
    options,
    log,
    bundle,
  );

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
