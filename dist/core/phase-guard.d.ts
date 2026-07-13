import { Phase, ChangeState } from './types.js';
import { DirtyWorktreeChecker } from './dirty-worktree.js';
import { HandoffManager } from './handoff-manager.js';
import { FileSystem } from '../utils/file-system.js';
import { SchemaRegistry } from './schema-registry.js';
export type ReviewType = 'requirement' | 'technical' | 'code';
export interface GuardFailure {
    check: string;
    expected: string;
    actual: string;
    severity: 'error' | 'warning';
    message: string;
}
export interface GuardResult {
    phase: Phase;
    direction: 'entry' | 'exit';
    passed: boolean;
    failures: GuardFailure[];
}
export interface PhaseGuard {
    checkEntry(phase: Phase, state: ChangeState): Promise<GuardResult>;
    checkExit(phase: Phase, state: ChangeState): Promise<GuardResult>;
    applyTransition(from: Phase, to: Phase, state: ChangeState, stateMachine: any): Promise<GuardResult>;
}
export declare class PhaseGuardImpl implements PhaseGuard {
    private dirtyWorktree?;
    private handoffManager?;
    private fs?;
    private schemaRegistry?;
    constructor(dirtyWorktree?: DirtyWorktreeChecker | undefined, handoffManager?: HandoffManager | undefined, fs?: FileSystem | undefined, schemaRegistry?: SchemaRegistry | undefined);
    private resolvePath;
    checkEntry(phase: Phase, state: ChangeState): Promise<GuardResult>;
    private checkDesignEntry;
    private checkBuildEntry;
    private checkVerifyEntry;
    private checkArchiveEntry;
    private validateHandoffHash;
    private checkIntentAlignment;
    private intentAligned;
    private extractKeywords;
    checkExit(phase: Phase, state: ChangeState): Promise<GuardResult>;
    applyTransition(from: Phase, to: Phase, state: ChangeState, stateMachine: any): Promise<GuardResult>;
    private checkClarifyExit;
    private checkDesignExit;
    private checkBuildExit;
    private checkVerifyExit;
    private checkArchiveExit;
}
