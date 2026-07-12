import { FileSystem } from './file-system.js';
export declare class YamlParser {
    private fs?;
    constructor(fs?: FileSystem);
    parse(text: string): Record<string, unknown>;
    stringify(obj: Record<string, unknown>): string;
    readFile(filePath: string): Promise<Record<string, unknown>>;
    writeFile(filePath: string, obj: Record<string, unknown>): Promise<void>;
    setField(obj: Record<string, unknown>, field: string, value: unknown): void;
}
