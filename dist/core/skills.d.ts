import { type Platform } from './platforms.js';
import type { InstallScope } from './types.js';
export declare function installDrivSkills(baseDir: string, skillNames: string[], overwrite: boolean, skipExisting?: boolean): Promise<{
    copied: number;
    skipped: number;
}>;
export declare function createOpenCodeCommands(baseDir: string, skillNames: string[], overwrite: boolean): Promise<{
    copied: number;
    skipped: number;
}>;
export declare function stripFrontmatter(content: string): string;
export declare function copyDrivRulesForPlatform(baseDir: string, platform: Platform, overwrite: boolean, scope?: InstallScope): Promise<{
    copied: number;
    skipped: number;
}>;
export declare function installDrivHooksForPlatform(baseDir: string, platform: Platform, scope?: InstallScope): Promise<{
    installed: boolean;
    reason?: string;
}>;
