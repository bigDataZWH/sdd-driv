import { execFileSync } from 'child_process';
export function getNpmExecutable(platform = process.platform) {
    return platform === 'win32' ? 'npm.cmd' : 'npm';
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
export function buildOpenSpecInitInvocation(projectPath, toolIds, _scope, includeProfileFlag = true) {
    const args = ['init', projectPath, '--tools', toolIds.join(',')];
    if (includeProfileFlag) {
        args.push('--profile', 'custom');
    }
    return { command: 'openspec', args };
}
export async function installOpenSpec(projectPath, toolIds, _scope) {
    const cliReady = isCommandAvailable('openspec');
    if (!cliReady) {
        try {
            execFileSync(getNpmExecutable(), ['install', '@fission-ai/openspec@latest'], {
                cwd: projectPath,
                stdio: 'inherit',
                timeout: 120_000,
                shell: process.platform === 'win32',
            });
        }
        catch {
            return 'failed';
        }
        if (!isCommandAvailable('openspec')) {
            return 'failed';
        }
    }
    try {
        const invocation = buildOpenSpecInitInvocation(projectPath, toolIds, _scope);
        execFileSync(invocation.command, invocation.args, {
            cwd: projectPath,
            stdio: ['inherit', 'inherit', 'pipe'],
            timeout: 120_000,
            shell: process.platform === 'win32',
        });
        return 'installed';
    }
    catch (firstError) {
        const stderrText = firstError.stderr?.toString() ?? '';
        if (stderrText.includes('unknown option') && stderrText.includes('--profile')) {
            const fallbackInvocation = buildOpenSpecInitInvocation(projectPath, toolIds, _scope, false);
            try {
                execFileSync(fallbackInvocation.command, fallbackInvocation.args, {
                    cwd: projectPath,
                    stdio: 'inherit',
                    timeout: 120_000,
                    shell: process.platform === 'win32',
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