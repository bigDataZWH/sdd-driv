import { FileSystem } from '../utils/file-system.js';
import { StateMachine } from './state-machine.js';
import { CleanCodeChecker } from './clean-code-checker.js';
import { ScriptExec } from '../utils/script-exec.js';
import { DebugGate } from './debug-gate.js';
export type VerifyScale = 'light' | 'full';
export interface VerifyResult {
    scale: VerifyScale;
    buildPassed: boolean;
    testsPassed: boolean;
    cleanCodePassed: boolean;
    branchHandled: boolean;
    reportPath: string;
    passed: boolean;
}
export declare class VerifyService {
    private fs;
    private stateMachine;
    private cleanCodeChecker;
    private scriptExec;
    private root;
    private debugGate;
    constructor(fs: FileSystem, stateMachine: StateMachine, cleanCodeChecker: CleanCodeChecker, scriptExec: ScriptExec, root: string, debugGate?: DebugGate);
    assessScale(changeName: string): Promise<VerifyScale>;
    private readConfig;
    executeBuild(changeName: string): Promise<boolean>;
    executeTests(changeName: string): Promise<boolean>;
    private parseCommand;
    private runCommand;
    verify(changeName: string): Promise<VerifyResult>;
    generateReport(changeName: string, result: VerifyResult): Promise<string>;
    private writeCleanCodeArtifacts;
}
