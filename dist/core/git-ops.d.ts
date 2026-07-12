import { ScriptExec } from '../utils/script-exec.js';
export interface GitStatus {
    dirty: boolean;
    branch: string;
    untracked: string[];
    modified: string[];
}
export interface GitOps {
    status(): Promise<GitStatus>;
    getHeadSha(): Promise<string>;
    getChangedFiles(baseRef: string, headRef?: string): Promise<string[]>;
    createBranch(name: string): Promise<void>;
    checkoutBranch(name: string): Promise<void>;
    mergeBranch(name: string, strategy?: 'merge' | 'squash' | 'rebase' | 'retain'): Promise<void>;
}
export declare class GitOpsImpl implements GitOps {
    private exec;
    private cwd;
    constructor(exec: ScriptExec, cwd: string);
    status(): Promise<GitStatus>;
    getHeadSha(): Promise<string>;
    getChangedFiles(baseRef: string, headRef?: string): Promise<string[]>;
    createBranch(name: string): Promise<void>;
    checkoutBranch(name: string): Promise<void>;
    mergeBranch(name: string, strategy?: 'merge' | 'squash' | 'rebase' | 'retain'): Promise<void>;
    private extractFilePath;
}
