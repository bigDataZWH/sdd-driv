import type { InstallScope } from '../core/types.js';
export interface UninstallOptions {
    json?: boolean;
    scope?: InstallScope;
    force?: boolean;
}
export declare function uninstallCommand(targetPath: string, options?: UninstallOptions): Promise<{
    skillsRemoved: number;
    commandsRemoved: number;
    dirsRemoved: number;
}>;
