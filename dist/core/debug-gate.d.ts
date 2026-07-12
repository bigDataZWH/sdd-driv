export interface DebugGateResult {
    enforced: boolean;
    reason: string;
}
export declare class DebugGate {
    enforce(phase: string, passed: boolean): DebugGateResult;
}
