/**
 * driv 子代理契约
 * OpenCode Subagent 间的标准化通信协议
 * 包括子代理调度记录、调度计划、编排器、报告服务和阶段门禁
 */
/** driv 五阶段 */
export type DrivPhase = 'clarify' | 'design' | 'build' | 'verify' | 'archive';
/** 子代理能力 */
export type SubagentRole = 'explorer' | 'planner' | 'builder' | 'tester' | 'reviewer' | 'archiver';
/** 子代理上下文 */
export interface HandoffContext {
    changeName: string;
    currentPhase: DrivPhase;
    taskIndex: number;
    totalTasks: number;
    artifacts: string[];
    gates: GateResult[];
}
/** 门禁结果 */
export interface GateResult {
    gate: string;
    passed: boolean;
    detail: string;
}
/** 切换契约 */
export interface HandoffPayload {
    from: SubagentRole;
    to: SubagentRole;
    context: HandoffContext;
    timestamp: string;
    nextAction: string;
    priority: 'high' | 'medium' | 'low';
}
/** 子代理响应 */
export interface SubagentResponse {
    status: 'ok' | 'fail' | 'blocked' | 'pending';
    output: string;
    errors?: string[];
    recordId?: string;
    startedAt?: string;
}
/** Build 阶段子代理调度记录 */
export interface SubagentDispatchRecord {
    taskId: string;
    dependencies: string[];
    inputPaths: string[];
    expectedOutputs: string[];
    subagentType: SubagentRole;
    verifyCommand: string;
    status?: 'pending' | 'running' | 'success' | 'fail' | 'skipped';
    modifiedFiles?: string[];
    verificationEvidence?: string;
}
/** 调度计划 */
export interface DispatchPlan {
    changeName: string;
    phase: DrivPhase;
    records: SubagentDispatchRecord[];
    generatedAt: string;
}
/** 子代理验证事件 */
export interface VerificationEvent {
    taskId: string;
    passed: boolean;
    evidence: string;
    timestamp: string;
}
/** 调度报告 */
export interface DispatchReport {
    plan: DispatchPlan;
    results: SubagentResponse[];
    verifications: VerificationEvent[];
    successCount: number;
    failCount: number;
    allModifiedFiles: string[];
}
/** Build 编排器 - 生成 subagent 调度计划 */
export declare class BuildOrchestrator {
    private readonly changeName;
    private readonly sourcePaths;
    constructor(changeName: string, sourcePaths: string[]);
    generateDispatchPlan(): DispatchPlan;
    recordPlan(plan: DispatchPlan): DispatchReport;
}
/** 归档报告服务 - 生成调度报告 markdown */
export declare class ArchiveReportService {
    generateReport(report: DispatchReport): string;
}
/** 阶段门禁 - 控制阶段间转换 */
export declare class PhaseGuard {
    private static readonly PHASE_ORDER;
    static readonly PHASE_TRANSITIONS: ReadonlyMap<DrivPhase, DrivPhase[]>;
    static readonly VALID_TRANSITIONS: readonly [DrivPhase, DrivPhase][];
    canTransition(from: DrivPhase, to: DrivPhase, report?: DispatchReport): {
        allowed: boolean;
        reason?: string;
    };
}
