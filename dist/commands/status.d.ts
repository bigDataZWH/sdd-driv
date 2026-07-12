export interface ChangeStatus {
    name: string;
    workflow: string;
    phase: string;
    buildMode: string;
    isolation: string;
    verifyMode: string;
    verifyResult: string;
    designDoc: string | null;
    plan: string | null;
    tasksCompleted: number;
    tasksTotal: number;
    nextCommand: string | null;
}
export interface StatusOptions {
    json?: boolean;
}
export declare function getActiveChanges(projectPath: string): Promise<ChangeStatus[]>;
export declare function formatChanges(changes: ChangeStatus[]): string;
export declare function statusCommand(targetPath: string, options?: StatusOptions): Promise<ChangeStatus[]>;
