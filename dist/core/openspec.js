import { execFileSync } from 'child_process';
export function getNpmExecutable(platform = process.platform) {
    return platform === 'win32' ? 'npm.cmd' : 'npm';
}
/**
 * Run a command without triggering DEP0190.
 * On Windows, .cmd/.bat files need cmd.exe wrapper when shell is false.
 */
export function execFileSafe(command, args, options) {
    if (process.platform === 'win32' && (command.endsWith('.cmd') || command.endsWith('.bat'))) {
        execFileSync('cmd', ['/c', command, ...args], { ...options, shell: false });
    }
    else {
        execFileSync(command, args, { ...options, shell: false });
    }
}
export function isCommandAvailable(command) {
    try {
        const checker = process.platform === 'win32' ? 'where' : 'which';
        execFileSync(checker, [command], { stdio: 'ignore', timeout: 10_000 });
        return true;
    }
    catch {
        return false;
    }
}
export function getNpxExecutable(platform = process.platform) {
    return platform === 'win32' ? 'npx.cmd' : 'npx';
}
export function buildOpenSpecInitInvocation(projectPath, toolIds, _scope, includeProfileFlag = true, useNpx = false) {
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
export async function installOpenSpec(projectPath, toolIds, _scope) {
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
    }
    catch (firstError) {
        const err = firstError;
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
            }
            catch {
                return 'failed';
            }
        }
        return 'failed';
    }
}
//# sourceMappingURL=openspec.js.map