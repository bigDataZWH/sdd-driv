import { FileSystem } from '../utils/file-system.js';
import { StateMachine } from './state-machine.js';
import { YamlParser } from '../utils/yaml-parser.js';
export type SpecMergeStrategy = 'append' | 'update' | 'supersede';
export interface ArchiveResult {
    archived: boolean;
    archivePath: string;
    specMerged: boolean;
    rollbackPerformed: boolean;
    errors: string[];
}
export declare class ArchiveService {
    private fs;
    private stateMachine;
    private parser;
    private root;
    constructor(fs: FileSystem, stateMachine: StateMachine, parser: YamlParser, root: string);
    checkPreconditions(changeName: string): Promise<string[]>;
    archive(changeName: string): Promise<ArchiveResult>;
    mergeDeltaSpec(changeName: string): Promise<boolean>;
    private markSuperpowersArtifacts;
    rollback(changeName: string): Promise<void>;
    private copyDirRecursive;
    private rollbackForDir;
    private updateIndex;
    private detectStrategy;
    private applyUpdate;
    private parseRequirements;
    private extractRequirementsSection;
}
