import { describe, it, expect } from 'vitest';

describe('SubagentProgressTracker', () => {
  it('start 创建进度记录', async () => {
    const { SubagentProgressTracker } = await import('../src/core/subagent-progress.js');
    const tracker = new SubagentProgressTracker();
    const record = tracker.start('test', 'task-1');
    expect(record.change).toBe('test');
    expect(record.taskId).toBe('task-1');
    expect(record.reviewStatus).toBe('pending');
    expect(record.fixRounds).toBe(0);
  });

  it('complete 标记为完成', async () => {
    const { SubagentProgressTracker } = await import('../src/core/subagent-progress.js');
    const tracker = new SubagentProgressTracker();
    tracker.start('test', 'task-1');
    const completed = tracker.complete('test', 'task-1', 'passed');
    expect(completed?.reviewStatus).toBe('passed');
    expect(completed?.completedAt).toBeDefined();
  });

  it('serialize 返回所有记录', async () => {
    const { SubagentProgressTracker } = await import('../src/core/subagent-progress.js');
    const tracker = new SubagentProgressTracker();
    tracker.start('test', 'task-1');
    tracker.start('test', 'task-2');
    const all = tracker.serialize();
    expect(all).toHaveLength(2);
  });
});
