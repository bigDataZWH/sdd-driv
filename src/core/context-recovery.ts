import { ChangeState, Phase } from './types.js';

export interface RecoveryState {
  change: string;
  phase: Phase;
  tasksProgress: string;
  handoffValid: boolean;
  partial: boolean;
}

export class ContextRecovery {
  async recover(data: Partial<ChangeState>): Promise<RecoveryState> {
    const partial = !data.change || !data.phase;
    const tasksAvailable = !!(data.openspec?.tasks || data.phase === 'clarify');
    return {
      change: data.change || 'unknown',
      phase: data.phase || 'clarify',
      tasksProgress: tasksAvailable ? 'available' : 'missing',
      handoffValid: data.phase !== 'clarify', // 非 clarify 阶段应有 handoff
      partial,
    };
  }

  validateHandoff(_handoffData: unknown): boolean {
    if (!_handoffData) return false;
    return true;
  }
}
