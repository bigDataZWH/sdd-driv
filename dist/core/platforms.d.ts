import type { InstallScope } from './types.js';
export interface Platform {
    id: string;
    name: string;
    skillsDir: string;
    globalSkillsDir?: string;
    detectionPaths?: string[];
    openspecToolId: string;
    rulesDir?: string;
    rulesBaseDir?: string;
    rulesFormat?: 'md' | 'mdc' | 'copilot';
    supportsHooks?: boolean;
    hookFormat?: 'claude-code' | 'gemini' | 'windsurf' | 'copilot' | 'qwen' | 'kiro' | 'qoder';
}
export declare function getPlatformSkillsDir(platform: Platform, scope: InstallScope): string;
export declare function getPlatformSkillsDirs(platform: Platform, scope: InstallScope): string[];
export declare const PLATFORMS: Platform[];
