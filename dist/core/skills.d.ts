export declare function installDrivSkills(baseDir: string, skillNames: string[], overwrite: boolean, skipExisting?: boolean): Promise<{
    copied: number;
    skipped: number;
}>;
export declare function createOpenCodeCommands(baseDir: string, skillNames: string[], overwrite: boolean): Promise<{
    copied: number;
    skipped: number;
}>;
export declare function stripFrontmatter(content: string): string;
