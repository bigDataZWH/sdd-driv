export interface UpdateOptions {
    overwrite?: boolean;
    json?: boolean;
    scope?: 'project' | 'global';
    language?: string;
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
}
export declare function getDrivSkills(): string[];
export declare function updateCommand(targetPath: string, options?: UpdateOptions): Promise<UpdateResult>;
