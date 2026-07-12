import type { InstallScope } from '../core/types.js';
export interface UpdateOptions {
    overwrite?: boolean;
    json?: boolean;
    scope?: InstallScope;
    language?: string;
    skipNpm?: boolean;
    yes?: boolean;
}
export interface UpdateResult {
    commands: {
        copied: number;
        skipped: number;
    };
    templates: {
        copied: number;
        skipped: number;
    };
    scope: string;
    summary: string;
    npmStatus?: 'updated' | 'failed' | 'skipped';
    codegraph?: 'installed' | 'failed' | 'skipped';
}
export declare function getDrivSkills(): string[];
export declare function updateCommand(targetPath: string, options?: UpdateOptions): Promise<UpdateResult>;
