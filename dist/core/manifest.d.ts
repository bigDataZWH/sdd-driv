import { DrivManifest, InstallOptions } from './types.js';
export declare function getDefaultManifest(): DrivManifest;
export declare function loadManifest(root: string): Promise<DrivManifest>;
export declare function writeManifest(root: string, manifest: DrivManifest): Promise<void>;
export declare function getPackageVersion(): string;
export declare function getManifestSkills(manifest: DrivManifest, useZh: boolean): string[];
export declare function ensureManifest(root: string, options: InstallOptions): Promise<DrivManifest>;
