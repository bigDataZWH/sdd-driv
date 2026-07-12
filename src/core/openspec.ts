import { execFileSync } from 'child_process';

export function getNpmExecutable(platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? 'npm.cmd' : 'npm';
}

/**
 * Run a command without triggering DEP0190.
 * On Windows, .cmd/.bat files need cmd.exe wrapper when shell is false.
 */
export function execFileSafe(
  command: string,
  args: string[],
  options: { cwd: string; stdio?: 'inherit' | ['inherit', 'inherit', 'pipe']; timeout?: number },
): void {
  if (process.platform === 'win32' && (command.endsWith('.cmd') || command.endsWith('.bat'))) {
    execFileSync('cmd', ['/c', command, ...args], { ...options, shell: false });
  } else {
    execFileSync(command, args, { ...options, shell: false });
  }
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

export function getNpxExecutable(platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? 'npx.cmd' : 'npx';
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
    execFileSafe(invocation.command, invocation.args, {
      cwd: projectPath,
      stdio: ['inherit', 'inherit', 'pipe'],
      timeout: 120_000,
    });
    return 'installed';
  } catch (firstError) {
    const err = firstError as { stderr?: Buffer };
    const stderrText = err.stderr?.toString() ?? '';
    if (stderrText.includes('unknown option') && stderrText.includes('--profile')) {
      const fallbackInvocation = buildOpenSpecInitInvocation(projectPath, toolIds, _scope, false, true);
      try {
        execFileSafe(fallbackInvocation.command, fallbackInvocation.args, {
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
