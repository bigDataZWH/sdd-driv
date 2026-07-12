export interface SubagentProgress {
    change: string;
    taskId: string;
    startedAt: string;
    redEvidence: string;
    greenEvidence: string;
    reviewStatus: 'pending' | 'passed' | 'failed';
    fixRounds: number;
    completedAt?: string;
}
export declare class SubagentProgressTracker {
    private records;
    start(change: string, taskId: string): SubagentProgress;
    recordRedEvidence(change: string, taskId: string, evidence: string): void;
    recordGreenEvidence(change: string, taskId: string, evidence: string): void;
    complete(change: string, taskId: string, reviewStatus: 'pending' | 'passed' | 'failed'): SubagentProgress | undefined;
    getProgress(change: string, taskId: string): SubagentProgress | undefined;
    serialize(): SubagentProgress[];
}
