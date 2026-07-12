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
    scope: 'project' | 'global';
}
export interface InitOptions {
    yes?: boolean;
    scope?: 'project' | 'global';
    skipExisting?: boolean;
    overwrite?: boolean;
    json?: boolean;
}
export declare function initCommand(projectPath: string, _platformIds: string[], options?: InitOptions): Promise<InitResult>;
