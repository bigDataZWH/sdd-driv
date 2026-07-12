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
                    'design-converted': 'false',
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
//# sourceMappingURL=types.js.map