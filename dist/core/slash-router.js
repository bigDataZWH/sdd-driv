import * as path from 'path';
import { OPENCODE_SKILLS_DIR, OPENCODE_COMMANDS_DIR } from '../utils/paths.js';
const DRIV_COMMANDS = [
    { name: '/driv-clarify', phase: 'clarify', skillName: 'driv-clarify' },
    { name: '/driv-design', phase: 'design', skillName: 'driv-design' },
    { name: '/driv-build', phase: 'build', skillName: 'driv-build' },
    { name: '/driv-verify', phase: 'verify', skillName: 'driv-verify' },
    { name: '/driv-archive', phase: 'archive', skillName: 'driv-archive' },
    { name: '/driv-review', phase: 'review', skillName: 'driv-review' },
    { name: '/driv-cleancode', phase: 'cleancode', skillName: 'driv-cleancode' },
    { name: '/driv', phase: 'status', skillName: 'driv' },
];
export function registerSlashCommands() {
    return DRIV_COMMANDS.map((c) => c.name);
}
export function getSlashCommandEntry(name) {
    return DRIV_COMMANDS.find((c) => c.name === name);
}
async function initDrivState(_cwd) {
    // .driv.yaml 由 StateMachine.initChange() 在 openspec/changes/<name>/ 下管理
}
function resolveSkillPath(cwd, skillName) {
    const base = cwd === process.cwd() ? OPENCODE_SKILLS_DIR : path.join(cwd, '.opencode', 'skills');
    return path.join(base, skillName, 'SKILL.md');
}
function resolveCommandPath(cwd, skillName) {
    const base = cwd === process.cwd() ? OPENCODE_COMMANDS_DIR : path.join(cwd, '.opencode', 'commands');
    return path.join(base, `${skillName}.md`);
}
export async function executeSlashCommand(name, context) {
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
    if (entry.name === '/driv-clarify') {
        await initDrivState(cwd);
    }
    return {
        success: true,
        name: entry.name,
        phase: entry.phase,
        skillPath,
        commandPath,
    };
}
//# sourceMappingURL=slash-router.js.map