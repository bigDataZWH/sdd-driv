import { execFileSync } from 'child_process';
const SKILLS_AGENT_MAP = {
    opencode: 'opencode',
};
function getAgentNames(platformIds) {
    const names = platformIds
        .map((id) => SKILLS_AGENT_MAP[id])
        .filter((name) => Boolean(name));
    return [...new Set(names)];
}
export function getNpxExecutable(platform = process.platform) {
    return platform === 'win32' ? 'npx.cmd' : 'npx';
}
export function buildSuperpowersInstallCommand(_projectPath, scope, platformIds) {
    const agentNames = getAgentNames(platformIds);
    const args = ['skills', 'add', 'obra/superpowers', '-y'];
    if (scope === 'global') {
        args.push('-g');
    }
    for (const name of agentNames) {
        args.push('--agent', name);
    }
    return { command: getNpxExecutable(), args };
}
export async function installSuperpowersForPlatforms(projectPath, scope, platformIds) {
    if (platformIds.length === 0) {
        return 'skipped';
    }
    const command = buildSuperpowersInstallCommand(projectPath, scope, platformIds);
    try {
        execFileSync(command.command, command.args, {
            cwd: projectPath,
            stdio: 'inherit',
            timeout: 300_000,
            shell: process.platform === 'win32',
        });
        return 'installed';
    }
    catch {
        return 'failed';
    }
}
//# sourceMappingURL=superpowers.js.map