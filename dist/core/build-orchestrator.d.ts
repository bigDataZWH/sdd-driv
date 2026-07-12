import { FileSystem } from '../utils/file-system.js';
import { StateMachine } from './state-machine.js';
import { GitOps } from './git-ops.js';
import { PathResolver } from './path-resolver.js';
import { HandoffManager } from './handoff-manager.js';
export interface BuildModeConfig {
    buildMode: string;
    tddMode: string;
    isolation: string;
}
export declare class BuildOrchestrator {
    private fs;
    private stateMachine;
    private gitOps;
    private pathResolver;
    private handoffManager;
    constructor(fs: FileSystem, stateMachine: StateMachine, gitOps: GitOps, pathResolver: PathResolver, handoffManager: HandoffManager);
    checkPreconditions(changeName: string): Promise<{
        ok: boolean;
        reason?: string;
    }>;
    createPlan(changeName: string): Promise<string>;
    setupModes(changeName: string, config: BuildModeConfig): Promise<void>;
    initIsolation(changeName: string): Promise<void>;
    private generatePlanContent;
}
