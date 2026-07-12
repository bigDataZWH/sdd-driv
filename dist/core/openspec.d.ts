export declare function getNpmExecutable(platform?: NodeJS.Platform): string;
/**
 * Run a command without triggering DEP0190.
 * On Windows, .cmd/.bat files need cmd.exe wrapper when shell is false.
 */
export declare function execFileSafe(command: string, args: string[], options: {
    cwd: string;
    stdio?: 'inherit' | ['inherit', 'inherit', 'pipe'];
    timeout?: number;
}): void;
export declare function isCommandAvailable(command: string): boolean;
export declare function getNpxExecutable(platform?: NodeJS.Platform): string;
export declare function buildOpenSpecInitInvocation(projectPath: string, toolIds: string[], _scope: 'project' | 'global', includeProfileFlag?: boolean, useNpx?: boolean): {
    command: string;
    args: string[];
};
export declare function installOpenSpec(projectPath: string, toolIds: string[], _scope: 'project' | 'global'): Promise<'installed' | 'failed' | 'skipped'>;
