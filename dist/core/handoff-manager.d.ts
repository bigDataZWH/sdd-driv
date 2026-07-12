import { FileSystem } from '../utils/file-system.js';
import { PathResolver } from './path-resolver.js';
import { YamlParser } from '../utils/yaml-parser.js';
import { Phase } from './types.js';
export interface SourceFile {
    path: string;
    hash: string;
    summary: string;
}
export interface CompressedContext {
    summary: string;
    decisions: string[];
    constraints: string[];
    tasks: string[];
    reviews: string[];
}
export interface VerificationInfo {
    totalHash: string;
    sourceCount: number;
}
export interface HandoffPackage {
    version: string;
    change: string;
    phase: Phase;
    timestamp: string;
    sources: SourceFile[];
    context: CompressedContext;
    verification: VerificationInfo;
}
export declare class HashUtils {
    static hashString(input: string): string;
    static hashObject(obj: unknown): string;
    static hashFile(fs: FileSystem, filePath: string): Promise<string>;
}
export declare class ContextCompression {
    compress(context: CompressedContext, strategy: 'off' | 'beta' | 'full'): CompressedContext;
}
export declare class HandoffManager {
    private fs;
    private resolver;
    private parser;
    constructor(fs: FileSystem, resolver: PathResolver, parser: YamlParser);
    collectSourceFiles(changeName: string): Promise<SourceFile[]>;
    generate(changeName: string, phase: Phase, compression?: string): Promise<HandoffPackage>;
    validate(changeName: string, _phase: Phase): Promise<boolean>;
    private hashAndSummarize;
    private buildContext;
    private writeHandoffFiles;
    private generateMarkdown;
}
