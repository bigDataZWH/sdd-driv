export declare const Phase: {
    readonly Clarify: "clarify";
    readonly Design: "design";
    readonly Build: "build";
    readonly Verify: "verify";
    readonly Archive: "archive";
};
export type Phase = (typeof Phase)[keyof typeof Phase];
export declare const Workflow: {
    readonly Full: "full";
};
export type Workflow = (typeof Workflow)[keyof typeof Workflow];
export declare const ReviewStatus: {
    readonly Pending: "pending";
    readonly Passed: "passed";
    readonly Rejected: "rejected";
};
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];
export declare const BuildMode: {
    readonly Subagent: "subagent-driven-development";
    readonly Sequential: "executing-plans";
    readonly Manual: "manual";
};
export type BuildMode = (typeof BuildMode)[keyof typeof BuildMode];
export declare const TddMode: {
    readonly Tdd: "tdd";
    readonly TddLite: "tdd-lite";
    readonly NoTdd: "no-tdd";
};
export type TddMode = (typeof TddMode)[keyof typeof TddMode];
export declare const IsolationMode: {
    readonly Branch: "branch";
    readonly Worktree: "worktree";
    readonly Inline: "inline";
};
export type IsolationMode = (typeof IsolationMode)[keyof typeof IsolationMode];
export declare const VerifyMode: {
    readonly Light: "light";
    readonly Full: "full";
};
export type VerifyMode = (typeof VerifyMode)[keyof typeof VerifyMode];
export declare const VerifyResult: {
    readonly Pending: "pending";
    readonly Pass: "pass";
    readonly Fail: "fail";
};
export type VerifyResult = (typeof VerifyResult)[keyof typeof VerifyResult];
export interface PhaseState {
    status: 'pending' | 'in-progress' | 'completed' | 'skipped';
    artifacts: Record<string, string>;
    startedAt?: string;
    completedAt?: string;
}
export interface ChangeState {
    change: string;
    workflow: string;
    phase: Phase;
    createdAt: string;
    openspec: {
        changeDir: string;
        proposal?: string;
        design?: string;
        tasks?: string;
        specs?: string[];
    };
    superpowers: {
        plan?: string;
        brainstorming?: string;
    };
    phases: Record<Phase, PhaseState>;
    buildMode: string;
    tddMode: string;
    isolation: string;
    verifyMode: string;
    verifyResult: string;
    hwProcess: {
        requirementReview: string;
        technicalReview: string;
        codeReview: string;
    };
    baseRef: string | null;
    headRef: string | null;
    branchStatus?: string;
    contextCompression: string;
    autoTransition: boolean;
    archived: boolean;
    verifiedAt: string | null;
}
export interface DrivManifest {
    version: string;
    packageVersion: string;
    assetsVersion: string;
    skills: string[];
    skillsZh: string[];
    rules: string[];
    hooks: Record<string, {
        matcher: string;
        description: string;
    }>;
    languages: {
        id: string;
        name: string;
        skillsDir: string;
    }[];
    createdAt: string;
}
export type InstallScope = 'project' | 'global';
export interface InstallOptions {
    scope: InstallScope;
    overwrite: boolean;
    skipExisting?: boolean;
    language?: string;
}
export declare function createDefaultState(changeName: string): ChangeState;
/** 从 .driv/config.yaml 读取 defaults 段，用于覆盖 createDefaultState 的默认值 */
export declare function readDrivConfigDefaults(root: string): Promise<Partial<Pick<ChangeState, 'buildMode' | 'tddMode' | 'isolation' | 'verifyMode' | 'contextCompression'>>>;
/** 用 .driv/config.yaml 的 defaults 段覆盖 ChangeState 中的默认值 */
export declare function applyConfigDefaults(state: ChangeState, root: string): Promise<ChangeState>;
