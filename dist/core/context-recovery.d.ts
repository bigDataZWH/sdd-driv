import { ChangeState, Phase } from './types.js';
export interface RecoveryState {
    change: string;
    phase: Phase;
    tasksProgress: string;
    handoffValid: boolean;
    partial: boolean;
}
export declare class ContextRecovery {
    recover(data: Partial<ChangeState>): Promise<RecoveryState>;
    validateHandoff(_handoffData: unknown): boolean;
}
