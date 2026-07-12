export const Phase = {
  Clarify: 'clarify',
  Design: 'design',
  Build: 'build',
  Verify: 'verify',
  Archive: 'archive',
} as const;

export type Phase = (typeof Phase)[keyof typeof Phase];

export const Workflow = {
  Full: 'full',
} as const;

export type Workflow = (typeof Workflow)[keyof typeof Workflow];

export const ReviewStatus = {
  Pending: 'pending',
  Passed: 'passed',
  Rejected: 'rejected',
} as const;

export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const BuildMode = {
  Subagent: 'subagent-driven-development',
  Sequential: 'executing-plans',
  Manual: 'manual',
} as const;

export type BuildMode = (typeof BuildMode)[keyof typeof BuildMode];

export const TddMode = {
  Tdd: 'tdd',
  TddLite: 'tdd-lite',
  NoTdd: 'no-tdd',
} as const;

export type TddMode = (typeof TddMode)[keyof typeof TddMode];

export const IsolationMode = {
  Branch: 'branch',
  Worktree: 'worktree',
  Inline: 'inline',
} as const;

export type IsolationMode = (typeof IsolationMode)[keyof typeof IsolationMode];

export const VerifyMode = {
  Light: 'light',
  Full: 'full',
} as const;

export type VerifyMode = (typeof VerifyMode)[keyof typeof VerifyMode];

export const VerifyResult = {
  Pending: 'pending',
  Pass: 'pass',
  Fail: 'fail',
} as const;

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
  hooks: Record<string, { matcher: string; description: string }>;
  languages: { id: string; name: string; skillsDir: string }[];
  createdAt: string;
}

export type InstallScope = 'project' | 'global';

export interface InstallOptions {
  scope: InstallScope;
  overwrite: boolean;
  skipExisting?: boolean;
  language?: string;
}

export function createDefaultState(changeName: string): ChangeState {
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
