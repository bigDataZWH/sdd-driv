export interface DebugGateResult {
  enforced: boolean;
  reason: string;
  investigateGuidance?: string;
}

export class DebugGate {
  enforce(phase: string, passed: boolean): DebugGateResult {
    if (!passed) {
      return {
        enforced: true,
        reason: `${phase} 未通过`,
        investigateGuidance:
          '请使用 investigate 子流程进行系统化调试：1) 复现问题 2) 定位根因 3) 修复 4) 重新验证。禁止猜测式修复。',
      };
    }
    return { enforced: false, reason: '' };
  }
}
