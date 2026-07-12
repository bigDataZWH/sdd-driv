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
export interface InstallOptions {
    scope: 'project' | 'global';
    overwrite: boolean;
    skipExisting?: boolean;
    language?: string;
}
export declare function createDefaultState(changeName: string): ChangeState;
