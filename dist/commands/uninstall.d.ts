export interface UninstallOptions {
    json?: boolean;
    scope?: 'project' | 'global';
    force?: boolean;
}
interface UninstallResult {
    skillsRemoved: number;
    commandsRemoved: number;
    dirsRemoved: number;
}
export declare function uninstallCommand(targetPath: string, options?: UninstallOptions): Promise<UninstallResult>;
export {};
