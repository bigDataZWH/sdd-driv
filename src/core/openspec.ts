import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import { getNpxExecutable } from '../utils/platform.js';

const execFileAsync = promisify(execFile);

export { getNpxExecutable };

export function getNpmExecutable(platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? 'npm.cmd' : 'npm';
}

/**
 * Run a command without triggering DEP0190.
 * On Windows, .cmd/.bat files need cmd.exe wrapper when shell is false.
 */
export async function execFileSafe(
  command: string,
  args: string[],
  options: { cwd?: string; stdio?: 'inherit' | ['inherit', 'inherit', 'pipe']; timeout?: number } = {},
): Promise<string> {
  const useCmdWrapper =
    process.platform === 'win32' && (command.endsWith('.cmd') || command.endsWith('.bat'));
  const finalCmd = useCmdWrapper ? 'cmd' : command;
  const finalArgs = useCmdWrapper ? ['/c', command, ...args] : args;
  const { stdout } = await execFileAsync(finalCmd, finalArgs, {
    timeout: 120000,
    ...options,
    shell: false,
  });
  return stdout;
}

export function isCommandAvailable(command: string): boolean {
  try {
    const checker = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(checker, [command], { stdio: 'ignore', timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

export function buildOpenSpecInitInvocation(
  projectPath: string,
  toolIds: string[],
  _scope: 'project' | 'global',
  includeProfileFlag = true,
  useNpx = false,
): { command: string; args: string[] } {
  if (useNpx) {
    const args = ['-y', '@fission-ai/openspec', 'init', projectPath, '--tools', toolIds.join(',')];
    if (includeProfileFlag) {
      args.push('--profile', 'custom');
    }
    return { command: getNpxExecutable(), args };
  }
  const args = ['init', projectPath, '--tools', toolIds.join(',')];
  if (includeProfileFlag) {
    args.push('--profile', 'custom');
  }
  return { command: 'openspec', args };
}

export async function installOpenSpec(
  projectPath: string,
  toolIds: string[],
  _scope: 'project' | 'global',
): Promise<'installed' | 'failed' | 'skipped'> {
  // Always use npx to invoke openspec — reliable on all platforms,
  // auto-downloads if not installed, finds global install if present
  try {
    const invocation = buildOpenSpecInitInvocation(projectPath, toolIds, _scope, true, true);
    await execFileSafe(invocation.command, invocation.args, {
      cwd: projectPath,
      stdio: ['inherit', 'inherit', 'pipe'],
      timeout: 120_000,
    });
    return 'installed';
  } catch (firstError) {
    const err = firstError as { stderr?: Buffer | string };
    const stderrText = err.stderr?.toString() ?? '';
    if (stderrText.includes('unknown option') && stderrText.includes('--profile')) {
      const fallbackInvocation = buildOpenSpecInitInvocation(projectPath, toolIds, _scope, false, true);
      try {
        await execFileSafe(fallbackInvocation.command, fallbackInvocation.args, {
          cwd: projectPath,
          stdio: 'inherit',
          timeout: 120_000,
        });
        return 'installed';
      } catch {
        return 'failed';
      }
    }
    return 'failed';
  }
}
