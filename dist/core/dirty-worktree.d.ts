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
    check(_changeName: string): Promise<DirtyWorktreeResult>;
    classifyPaths(_paths: string[], _changeName: string): WorktreeChange[];
}
