import type { InstallScope } from '../core/types.js';
export interface InitResult {
    createdDirs: string[];
    skillsCopied: number;
    skillsSkipped: number;
    commandsCopied: number;
    commandsSkipped: number;
    templatesCopied: number;
    templatesSkipped: number;
    openspec: string;
    superpowers: string;
    summary: string;
    scope: InstallScope;
    codegraph: string;
}
export interface InitOptions {
    yes?: boolean;
    scope?: InstallScope;
    skipExisting?: boolean;
    overwrite?: boolean;
    json?: boolean;
}
export declare function initCommand(projectPath: string, _platformIds: string[], options?: InitOptions): Promise<InitResult>;
