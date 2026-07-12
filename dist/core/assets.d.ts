export interface AssetSyncResult {
    copied: number;
    skipped: number;
}
export declare function syncDrivAssets(baseDir: string, options?: {
    overwrite?: boolean;
    skipExisting?: boolean;
}): Promise<AssetSyncResult>;
