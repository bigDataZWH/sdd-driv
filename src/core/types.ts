import * as path from 'path';

export const Phase = {
  Clarify: 'clarify',
  Design: 'design',
  Build: 'build',
  Verify: 'verify',
  Archive: 'archive',
} as const;

export type Phase = (typeof Phase)[keyof typeof Phase];

/** P2-7: openspec changes 目录的相对路径前缀，单源定义避免散落硬编码 */
export const OPENSPEC_CHANGES_DIR = 'openspec/changes';

/** 构造 change 目录的相对路径（P2-7: 单源） */
export function changeDir(changeName: string): string {
  return `${OPENSPEC_CHANGES_DIR}/${changeName}`;
}

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
    prd?: string;
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
  const dir = changeDir(changeName);
  return {
    change: changeName,
    workflow: 'full',
    phase: 'clarify',
    createdAt: now,
    openspec: {
      changeDir: dir,
      prd: `${dir}/prd.md`,
    },
    superpowers: {},
    phases: {
      clarify: {
        status: 'in-progress',
        artifacts: {
          prd: `${dir}/prd.md`,
        },
      },
      design: {
        status: 'pending',
        artifacts: {
          proposal: `${dir}/proposal.md`,
          design: `${dir}/design.md`,
          tasks: `${dir}/tasks.md`,
          specs: `${dir}/specs.json`,
          'design-converted': 'false',
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
export async function readDrivConfigDefaults(
  root: string,
): Promise<Partial<Pick<ChangeState, 'buildMode' | 'tddMode' | 'isolation' | 'verifyMode' | 'contextCompression'>>> {
  const configPath = path.join(root, '.driv', 'config.yaml');
  try {
    const { readFile } = await import('fs/promises');
    const content = await readFile(configPath, 'utf-8');
    const { parse } = await import('yaml');
    const config = parse(content) as Record<string, unknown>;
    const defaults = config?.defaults as Record<string, unknown> | undefined;
    if (!defaults) return {};
    return {
      buildMode: defaults.build_mode as string | undefined,
      tddMode: defaults.tdd_mode as string | undefined,
      isolation: defaults.isolation as string | undefined,
      verifyMode: defaults.verify_mode as string | undefined,
      contextCompression: defaults.context_compression as string | undefined,
    };
  } catch {
    return {};
  }
}

/** 用 .driv/config.yaml 的 defaults 段覆盖 ChangeState 中的默认值 */
export async function applyConfigDefaults(state: ChangeState, root: string): Promise<ChangeState> {
  const configDefaults = await readDrivConfigDefaults(root);
  if (configDefaults.buildMode) state.buildMode = configDefaults.buildMode;
  if (configDefaults.tddMode) state.tddMode = configDefaults.tddMode;
  if (configDefaults.isolation) state.isolation = configDefaults.isolation;
  if (configDefaults.verifyMode) state.verifyMode = configDefaults.verifyMode;
  if (configDefaults.contextCompression) state.contextCompression = configDefaults.contextCompression;
  return state;
}
