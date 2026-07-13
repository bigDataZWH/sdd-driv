import * as path from 'path';
export const Phase = {
    Clarify: 'clarify',
    Design: 'design',
    Build: 'build',
    Verify: 'verify',
    Archive: 'archive',
};
export const Workflow = {
    Full: 'full',
};
export const ReviewStatus = {
    Pending: 'pending',
    Passed: 'passed',
    Rejected: 'rejected',
};
export const BuildMode = {
    Subagent: 'subagent-driven-development',
    Sequential: 'executing-plans',
    Manual: 'manual',
};
export const TddMode = {
    Tdd: 'tdd',
    TddLite: 'tdd-lite',
    NoTdd: 'no-tdd',
};
export const IsolationMode = {
    Branch: 'branch',
    Worktree: 'worktree',
    Inline: 'inline',
};
export const VerifyMode = {
    Light: 'light',
    Full: 'full',
};
export const VerifyResult = {
    Pending: 'pending',
    Pass: 'pass',
    Fail: 'fail',
};
export function createDefaultState(changeName) {
    const now = new Date().toISOString().slice(0, 10);
    const changeDir = `openspec/changes/${changeName}`;
    return {
        change: changeName,
        workflow: 'full',
        phase: 'clarify',
        createdAt: now,
        openspec: {
            changeDir,
            proposal: `${changeDir}/proposal.md`,
            design: `${changeDir}/design.md`,
            specs: [],
        },
        superpowers: {},
        phases: {
            clarify: {
                status: 'in-progress',
                artifacts: {
                    proposal: `${changeDir}/proposal.md`,
                    design: `${changeDir}/design.md`,
                    tasks: `${changeDir}/tasks.md`,
                    specs: `${changeDir}/specs.json`,
                },
            },
            design: {
                status: 'pending',
                artifacts: {
                    'detailed-design-completed': 'false',
                },
            },
            build: { status: 'pending', artifacts: {} },
            verify: { status: 'pending', artifacts: {} },
            archive: { status: 'pending', artifacts: {} },
        },
        buildMode: 'subagent-driven-development',
        tddMode: 'tdd',
        isolation: 'branch',
        verifyMode: 'light',
        verifyResult: 'pending',
        hwProcess: {
            requirementReview: 'pending',
            technicalReview: 'pending',
            codeReview: 'pending',
        },
        baseRef: null,
        headRef: null,
        contextCompression: 'off',
        autoTransition: false,
        archived: false,
        verifiedAt: null,
    };
}
/** 从 .driv/config.yaml 读取 defaults 段，用于覆盖 createDefaultState 的默认值 */
export async function readDrivConfigDefaults(root) {
    const configPath = path.join(root, '.driv', 'config.yaml');
    try {
        const { readFile } = await import('fs/promises');
        const content = await readFile(configPath, 'utf-8');
        const { parse } = await import('yaml');
        const config = parse(content);
        const defaults = config?.defaults;
        if (!defaults)
            return {};
        return {
            buildMode: defaults.build_mode,
            tddMode: defaults.tdd_mode,
            isolation: defaults.isolation,
            verifyMode: defaults.verify_mode,
            contextCompression: defaults.context_compression,
        };
    }
    catch {
        return {};
    }
}
/** 用 .driv/config.yaml 的 defaults 段覆盖 ChangeState 中的默认值 */
export async function applyConfigDefaults(state, root) {
    const configDefaults = await readDrivConfigDefaults(root);
    if (configDefaults.buildMode)
        state.buildMode = configDefaults.buildMode;
    if (configDefaults.tddMode)
        state.tddMode = configDefaults.tddMode;
    if (configDefaults.isolation)
        state.isolation = configDefaults.isolation;
    if (configDefaults.verifyMode)
        state.verifyMode = configDefaults.verifyMode;
    if (configDefaults.contextCompression)
        state.contextCompression = configDefaults.contextCompression;
    return state;
}
//# sourceMappingURL=types.js.map