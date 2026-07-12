export declare function getNpmExecutable(platform?: NodeJS.Platform): string;
export declare function isCommandAvailable(command: string): boolean;
export declare function buildOpenSpecInitInvocation(projectPath: string, toolIds: string[], _scope: 'project' | 'global', includeProfileFlag?: boolean): {
    command: string;
    args: string[];
};
export declare function installOpenSpec(projectPath: string, toolIds: string[], _scope: 'project' | 'global'): Promise<'installed' | 'failed' | 'skipped'>;
