export interface DebugGateResult {
    enforced: boolean;
    reason: string;
    investigateGuidance?: string;
}
export declare class DebugGate {
    enforce(phase: string, passed: boolean): DebugGateResult;
}
