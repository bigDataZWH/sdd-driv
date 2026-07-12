export interface Platform {
    id: string;
    name: string;
    skillsDir: string;
    globalSkillsDir?: string;
    openspecToolId: string;
}
export declare const PLATFORMS: Platform[];
export declare function getPlatformSkillsDir(platform: Platform, scope: 'project' | 'global'): string;
