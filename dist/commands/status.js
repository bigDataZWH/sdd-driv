import * as path from 'path';
import { promises as fs } from 'fs';
import { parse } from 'yaml';
import { fileExists } from '../utils/file-system.js';
function getNextCommand(phase) {
    switch (phase) {
        case 'clarify':
            return '/driv-clarify';
        case 'design':
            return '/driv-design';
        case 'build':
            return '/driv-build';
        case 'verify':
            return '/driv-verify';
        case 'archive':
            return '/driv-archive';
        default:
            return null;
    }
}
async function countTasks(tasksPath) {
    if (!(await fileExists(tasksPath)))
        return { done: 0, total: 0 };
    const content = await fs.readFile(tasksPath, 'utf-8');
    const lines = content.split('\n');
    const total = lines.filter((line) => /^\s*- \[[ x]\]/i.test(line)).length;
    const done = lines.filter((line) => /^\s*- \[x\]/i.test(line)).length;
    return { done, total };
}
async function readDrivState(changeDir) {
    const statePath = path.join(changeDir, '.driv.yaml');
    if (!(await fileExists(statePath)))
        return null;
    const content = await fs.readFile(statePath, 'utf-8');
    return parse(content);
}
function getString(value, fallback) {
    return typeof value === 'string' && value.length > 0 ? value : fallback;
}
function getOptionalString(value) {
    return typeof value === 'string' && value !== 'null' && value.length > 0 ? value : null;
}
export async function getActiveChanges(projectPath) {
    const changesDir = path.join(projectPath, 'openspec', 'changes');
    if (!(await fileExists(changesDir)))
        return [];
    const entries = await fs.readdir(changesDir, { withFileTypes: true });
    const changes = [];
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        const changeDir = path.join(changesDir, entry.name);
        const state = await readDrivState(changeDir);
        if (!state)
            continue;
        if (state.archived === true || state.archived === 'true')
            continue;
        const { done, total } = await countTasks(path.join(changeDir, 'tasks.md'));
        const phase = getString(state.phase, 'unknown');
        const superpowers = typeof state.superpowers === 'object' && state.superpowers !== null
            ? state.superpowers
            : {};
        const openspec = typeof state.openspec === 'object' && state.openspec !== null
            ? state.openspec
            : {};
        changes.push({
            name: getString(state.change, entry.name),
            workflow: getString(state.workflow, 'full'),
            phase,
            buildMode: getString(state.buildMode, 'unset'),
            isolation: getString(state.isolation, 'unset'),
            verifyMode: getString(state.verifyMode, 'unset'),
            verifyResult: getString(state.verifyResult, 'pending'),
            designDoc: getOptionalString(openspec.design),
            plan: getOptionalString(superpowers.plan),
            tasksCompleted: done,
            tasksTotal: total,
            nextCommand: getNextCommand(phase),
        });
    }
    return changes;
}
export function formatChanges(changes) {
    if (changes.length === 0)
        return 'No active changes.\n';
    const lines = ['Active Changes:', ''];
    for (let i = 0; i < changes.length; i++) {
        const change = changes[i];
        const taskText = change.tasksTotal > 0 ? ` [${change.tasksCompleted}/${change.tasksTotal} tasks]` : '';
        lines.push(`  ${i + 1}. ${change.name} [phase: ${change.phase}${taskText}]`);
        lines.push(`     workflow: ${change.workflow} | build_mode: ${change.buildMode}`);
        if (change.designDoc)
            lines.push(`     design: ${change.designDoc}`);
        if (change.plan)
            lines.push(`     plan:   ${change.plan}`);
        if (change.nextCommand)
            lines.push(`     next: ${change.nextCommand}`);
        lines.push('');
    }
    return lines.join('\n');
}
export async function statusCommand(targetPath, options = {}) {
    const projectPath = path.resolve(targetPath);
    const changes = await getActiveChanges(projectPath);
    if (options.json) {
        console.log(JSON.stringify({ changes }, null, 2));
    }
    else {
        console.log(formatChanges(changes));
    }
    return changes;
}
//# sourceMappingURL=status.js.map