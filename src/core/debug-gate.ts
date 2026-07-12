export interface DebugGateResult {
  enforced: boolean;
  reason: string;
}

export class DebugGate {
  enforce(phase: string, passed: boolean): DebugGateResult {
    if (!passed) {
      return {
        enforced: true,
        reason: `${phase} 未通过：禁止猜测修复，请使用 investigate 进行系统化调试`,
      };
    }
    return { enforced: false, reason: '' };
  }
}
