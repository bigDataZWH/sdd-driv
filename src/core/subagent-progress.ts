export interface SubagentProgress {
  change: string;
  taskId: string;
  startedAt: string;
  redEvidence: string;
  greenEvidence: string;
  reviewStatus: 'pending' | 'passed' | 'failed';
  fixRounds: number;
  completedAt?: string;
}

export class SubagentProgressTracker {
  private records: Map<string, SubagentProgress> = new Map();

  start(change: string, taskId: string): SubagentProgress {
    const record: SubagentProgress = {
      change,
      taskId,
      startedAt: new Date().toISOString(),
      redEvidence: '',
      greenEvidence: '',
      reviewStatus: 'pending',
      fixRounds: 0,
    };
    this.records.set(`${change}:${taskId}`, record);
    return record;
  }

  recordRedEvidence(change: string, taskId: string, evidence: string): void {
    const key = `${change}:${taskId}`;
    const record = this.records.get(key);
    if (record) {
      record.redEvidence = evidence;
    }
  }

  recordGreenEvidence(change: string, taskId: string, evidence: string): void {
    const key = `${change}:${taskId}`;
    const record = this.records.get(key);
    if (record) {
      record.greenEvidence = evidence;
    }
  }

  complete(
    change: string,
    taskId: string,
    reviewStatus: 'pending' | 'passed' | 'failed',
  ): SubagentProgress | undefined {
    const key = `${change}:${taskId}`;
    const record = this.records.get(key);
    if (record) {
      record.reviewStatus = reviewStatus;
      record.completedAt = new Date().toISOString();
    }
    return record;
  }

  getProgress(change: string, taskId: string): SubagentProgress | undefined {
    return this.records.get(`${change}:${taskId}`);
  }

  serialize(): SubagentProgress[] {
    return Array.from(this.records.values());
  }
}
