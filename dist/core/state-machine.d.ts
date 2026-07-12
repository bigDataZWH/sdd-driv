import { FileSystem } from '../utils/file-system.js';
import { YamlParser } from '../utils/yaml-parser.js';
import { PathResolver } from './path-resolver.js';
import { ChangeState } from './types.js';
export declare class StateMachine {
    private fs;
    private parser;
    private resolver;
    constructor(fs: FileSystem, parser: YamlParser, resolver: PathResolver);
    initChange(changeName: string): Promise<void>;
    getState(changeName: string): Promise<ChangeState>;
    validate(changeName: string): Promise<boolean>;
    setField(changeName: string, field: string, value: unknown): Promise<void>;
    transition(changeName: string, toPhase: string): Promise<void>;
    assessScale(tasks: string[], changedFiles: string[]): string;
    setDesignPath(changeName: string, designPath: string): Promise<void>;
    setSpecsPaths(changeName: string, specsPaths: string[]): Promise<void>;
    setDesignConverted(changeName: string): Promise<void>;
    setDetailedDesignCompleted(changeName: string): Promise<void>;
}
