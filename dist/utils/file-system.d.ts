export declare class FileSystem {
    readonly root: string;
    constructor(root: string);
    ensureDir(dir: string): Promise<void>;
    writeFile(filePath: string, content: string): Promise<void>;
    readFile(filePath: string): Promise<string>;
    exists(filePath: string): Promise<boolean>;
    copyFile(src: string, dest: string): Promise<void>;
    listDir(dir: string): Promise<string[]>;
    readJson<T = unknown>(filePath: string): Promise<T>;
}
export declare function fileExists(filePath: string): Promise<boolean>;
export declare function ensureDir(dir: string): Promise<void>;
export declare function writeFile(filePath: string, content: string): Promise<void>;
export declare function readDir(dir: string): Promise<string[]>;
export declare function readJson<T = unknown>(filePath: string): Promise<T>;
export declare function copyFile(src: string, dest: string): Promise<void>;
export declare function copyDir(srcDir: string, destDir: string, options?: {
    overwrite?: boolean;
    skipExisting?: boolean;
    ignore?: string[];
}): Promise<{
    copied: number;
    skipped: number;
}>;
