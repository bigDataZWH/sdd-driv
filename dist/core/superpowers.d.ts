export declare function getNpxExecutable(platform?: NodeJS.Platform): string;
export declare function buildSuperpowersInstallCommand(_projectPath: string, scope: 'project' | 'global', platformIds: string[]): {
    command: string;
    args: string[];
};
export declare function installSuperpowersForPlatforms(projectPath: string, scope: 'project' | 'global', platformIds: string[]): Promise<'installed' | 'failed' | 'skipped'>;
