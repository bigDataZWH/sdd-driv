export interface WorktreeChange {
    path: string;
    type: 'modified' | 'added' | 'deleted' | 'untracked';
    category: 'user' | 'change' | 'unknown';
}
export interface DirtyWorktreeResult {
    dirty: boolean;
    changes: WorktreeChange[];
}
export declare class DirtyWorktreeChecker {
    private projectPath?;
    constructor(projectPath?: string | undefined);
    check(changeName: string): Promise<DirtyWorktreeResult>;
    classifyPaths(paths: string[], changeName: string): WorktreeChange[];
}
