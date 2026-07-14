import { describe, it, expect } from 'vitest';

describe('ContextRecovery', () => {
  it('返回 RecoveryState 且 partial 标记正确', async () => {
    const { ContextRecovery } = await import('../src/core/context-recovery.js');
    const recovery = new ContextRecovery();
    const result = await recovery.recover({ change: 'test', phase: 'build' });
    expect(result.change).toBe('test');
    expect(result.phase).toBe('build');
    expect(result.partial).toBe(false);
  });

  it('数据缺失时标记为 partial', async () => {
    const { ContextRecovery } = await import('../src/core/context-recovery.js');
    const recovery = new ContextRecovery();
    const result = await recovery.recover({});
    expect(result.change).toBe('unknown');
    expect(result.partial).toBe(true);
    // data.phase 未提供，tasksProgress 为 missing
    expect(result.tasksProgress).toBe('missing');
  });
});
