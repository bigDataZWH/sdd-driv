import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';
import { fileExists, readDir } from '../utils/file-system.js';
import { loadManifest, getPackageVersion } from '../core/manifest.js';

export interface DoctorOptions {
  scope?: 'auto' | 'project' | 'global';
  json?: boolean;
}

export interface DoctorResult {
  check: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

const VALID_YAML_FIELDS = new Set([
  'change',
  'workflow',
  'phase',
  'buildMode',
  'tddMode',
  'isolation',
  'verifyMode',
  'verifyResult',
  'hwProcess',
  'baseRef',
  'headRef',
  'branchStatus',
  'contextCompression',
  'autoTransition',
  'archived',
  'verifiedAt',
  'openspec',
  'superpowers',
  'phases',
  'createdAt',
]);

function isCommandAvailable(command: string): boolean {
  try {
    execFileSync(command, ['--version'], { stdio: 'ignore', timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

function collectTopLevelYamlKeys(yamlContent: string): string[] {
  const topLevelKeys: string[] = [];
  for (const line of yamlContent.split(/\r?\n/u)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;
    if (/^\s/u.test(line)) continue;
    if (trimmedLine.startsWith('- ')) continue;
    const keyMatch = line.match(/^['"]?([A-Za-z0-9_-]+)['"]?\s*:/u);
    if (keyMatch) {
      topLevelKeys.push(keyMatch[1]);
    }
  }
  return topLevelKeys;
}

function getScopeBases(
  projectPath: string,
  scope: 'auto' | 'project' | 'global',
): Array<{ scope: 'project' | 'global'; baseDir: string }> {
  if (scope === 'project') return [{ scope: 'project', baseDir: projectPath }];
  if (scope === 'global') return [{ scope: 'global', baseDir: os.homedir() }];
  const bases: Array<{ scope: 'project' | 'global'; baseDir: string }> = [
    { scope: 'project', baseDir: projectPath },
  ];
  if (path.resolve(projectPath) !== path.resolve(os.homedir())) {
    bases.push({ scope: 'global', baseDir: os.homedir() });
  }
  return bases;
}

async function checkNode(): Promise<DoctorResult> {
  const nodeMajor = parseInt(process.version.slice(1).split('.')[0], 10);
  return {
    check: 'Node.js',
    status: nodeMajor >= 20 ? 'pass' : 'fail',
    message: `v${process.version.slice(1)}`,
  };
}

async function checkGit(): Promise<DoctorResult> {
  const available = isCommandAvailable('git');
  return {
    check: 'Git',
    status: available ? 'pass' : 'fail',
    message: available ? 'available' : 'not found',
  };
}

async function checkOpenSpec(): Promise<DoctorResult> {
  const available = isCommandAvailable('openspec');
  return {
    check: 'openspec CLI',
    status: available ? 'pass' : 'warn',
    message: available
      ? 'available'
      : 'not installed — install with: npm install -g @fission-ai/openspec@latest',
  };
}

async function checkCodeGraph(projectPath: string, scope: 'auto' | 'project' | 'global'): Promise<DoctorResult> {
  if (!isCommandAvailable('codegraph')) {
    return {
      check: 'CodeGraph CLI',
      status: 'warn',
      message: 'not installed — install with: npm install -g @colbymchenry/codegraph',
    };
  }

  if (scope === 'global') {
    return { check: 'CodeGraph CLI', status: 'pass', message: 'installed' };
  }

  const codegraphDir = path.join(projectPath, '.codegraph');
  if (!(await fileExists(codegraphDir))) {
    return {
      check: 'CodeGraph',
      status: 'warn',
      message: 'CLI installed but project not initialized — run: codegraph init -i',
    };
  }

  return { check: 'CodeGraph', status: 'pass', message: 'initialized (.codegraph/ present)' };
}

async function checkWorkingDirs(projectPath: string): Promise<DoctorResult> {
  const specsDir = path.join(projectPath, 'docs', 'superpowers', 'specs');
  const plansDir = path.join(projectPath, 'docs', 'superpowers', 'plans');
  const specsExist = await fileExists(specsDir);
  const plansExist = await fileExists(plansDir);

  if (specsExist && plansExist) {
    return { check: 'working directories', status: 'pass', message: 'present' };
  }
  if (!specsExist && !plansExist) {
    return { check: 'working directories', status: 'fail', message: 'missing — run: driv init' };
  }
  const missing: string[] = [];
  if (!specsExist) missing.push('specs');
  if (!plansExist) missing.push('plans');
  return {
    check: 'working directories',
    status: 'warn',
    message: `partial (missing: ${missing.join(', ')})`,
  };
}

async function checkVersion(): Promise<DoctorResult> {
  return {
    check: 'driv package',
    status: 'pass',
    message: `v${getPackageVersion()}`,
  };
}

async function checkSkillCompleteness(
  projectPath: string,
  scope: 'auto' | 'project' | 'global',
): Promise<DoctorResult[]> {
  const results: DoctorResult[] = [];
  const manifest = await loadManifest(projectPath);

  let anyFound = false;
  for (const base of getScopeBases(projectPath, scope)) {
    const skillsDir = path.join(base.baseDir, '.opencode', 'skills');
    if (!(await fileExists(skillsDir))) continue;
    anyFound = true;

    const missing: string[] = [];
    const skillList = manifest.skills || [];
    for (const skillName of skillList) {
      const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
      if (!(await fileExists(skillPath))) {
        missing.push(skillName);
      }
    }

    results.push(
      missing.length === 0
        ? {
            check: `skills (${base.scope})`,
            status: 'pass' as const,
            message: `complete (${skillList.length} skills)`,
          }
        : {
            check: `skills (${base.scope})`,
            status: 'warn' as const,
            message: `missing ${missing.length}: ${missing.join(', ')}`,
          },
    );
  }

  if (!anyFound) {
    results.push({
      check: 'skills',
      status: scope === 'global' ? 'warn' : 'fail',
      message:
        scope === 'global' ? 'no skills found in global scope' : 'no skills found — run: driv init',
    });
  }

  return results;
}

async function checkDrivYamlValidity(projectPath: string): Promise<DoctorResult[]> {
  const changesDir = path.join(projectPath, 'openspec', 'changes');
  if (!(await fileExists(changesDir))) return [];

  const entries = await readDir(changesDir);
  const results: DoctorResult[] = [];

  for (const entry of entries) {
    const yamlPath = path.join(changesDir, entry, '.driv.yaml');
    if (!(await fileExists(yamlPath))) continue;

    try {
      const { promises: fs } = await import('fs');
      const raw = await fs.readFile(yamlPath, 'utf-8');
      const unknownFields = collectTopLevelYamlKeys(raw).filter(
        (key) => !VALID_YAML_FIELDS.has(key),
      );
      results.push(
        unknownFields.length === 0
          ? { check: `.driv.yaml: ${entry}`, status: 'pass' as const, message: 'valid' }
          : {
              check: `.driv.yaml: ${entry}`,
              status: 'fail' as const,
              message: `unknown field(s): ${unknownFields.join(', ')}`,
            },
      );
    } catch {
      results.push({
        check: `.driv.yaml: ${entry}`,
        status: 'warn',
        message: 'unreadable',
      });
    }
  }

  return results;
}

async function checkScriptsPresent(): Promise<DoctorResult> {
  const scriptDirs = [
    path.join(os.homedir(), '.driv', 'scripts'),
    path.join(process.cwd(), '.driv', 'scripts'),
  ];

  for (const scriptDir of scriptDirs) {
    if (await fileExists(scriptDir)) {
      const entries = await readDir(scriptDir);
      const shFiles = entries.filter((e) => e.endsWith('.sh'));
      return {
        check: 'scripts',
        status: 'pass',
        message: `OK (${shFiles.length} scripts in ${scriptDir})`,
      };
    }
  }

  return {
    check: 'scripts',
    status: 'warn',
    message: 'scripts directory not found in global or project scope',
  };
}

function formatResults(results: DoctorResult[], scope: string): void {
  console.log(`Driv Doctor (scope: ${scope})\n`);
  for (const r of results) {
    const icon = r.status === 'pass' ? '✓' : r.status === 'warn' ? '⚠' : '✗';
    console.log(`  ${icon} ${r.check}: ${r.message}`);
  }
}

export async function doctorCommand(
  targetPath: string,
  options: DoctorOptions = {},
): Promise<DoctorResult[]> {
  const projectPath = path.resolve(targetPath);
  const scope = options.scope ?? 'auto';

  const results: DoctorResult[] = [];
  results.push(await checkVersion());
  results.push(await checkNode());
  results.push(await checkGit());
  results.push(await checkOpenSpec());
  results.push(await checkCodeGraph(projectPath, scope));
  if (scope !== 'global') {
    results.push(await checkWorkingDirs(projectPath));
  }
  results.push(...(await checkSkillCompleteness(projectPath, scope)));
  results.push(await checkScriptsPresent());
  results.push(...(await checkDrivYamlValidity(projectPath)));

  if (options.json) {
    console.log(JSON.stringify({ scope, results }, null, 2));
  } else {
    formatResults(results, scope);
  }

  return results;
}
