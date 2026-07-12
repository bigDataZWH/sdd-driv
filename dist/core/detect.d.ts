import { type Platform } from './platforms.js';
import type { InstallScope } from './types.js';
export declare function getBaseDir(scope: InstallScope, projectPath: string): string;
declare function hasPluginSuperpowers(): Promise<boolean>;
declare function hasOpenCodePluginSuperpowers(): Promise<boolean>;
export declare function detectPlatforms(projectPath: string): Promise<Set<string>>;
export declare function hasSkills(baseDir: string, platform: Platform, component: 'openspec' | 'superpowers' | 'driv', _selectedPlatforms?: Platform[], scope?: InstallScope): Promise<boolean>;
export { hasPluginSuperpowers, hasOpenCodePluginSuperpowers };
