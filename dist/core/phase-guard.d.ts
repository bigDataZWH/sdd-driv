import { Phase, ChangeState } from './types.js';
import { DirtyWorktreeChecker } from './dirty-worktree.js';
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
    constructor(dirtyWorktree?: DirtyWorktreeChecker | undefined);
    checkEntry(phase: Phase, state: ChangeState): Promise<GuardResult>;
    private checkDesignEntry;
    private checkBuildEntry;
    private checkVerifyEntry;
    private checkArchiveEntry;
    private validateHandoffHash;
    checkExit(phase: Phase, state: ChangeState): Promise<GuardResult>;
    applyTransition(from: Phase, to: Phase, state: ChangeState, stateMachine: any): Promise<GuardResult>;
    private checkClarifyExit;
    private checkDesignExit;
    private checkBuildExit;
    private checkVerifyExit;
    private checkArchiveExit;
}
