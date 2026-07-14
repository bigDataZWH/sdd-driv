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

describe('ContextRecovery 边界用例 (Round 43)', () => {
  it("recover phase='clarify' 且 openspec.prd 已设置时返回 tasksProgress='available'", async () => {
    const { ContextRecovery } = await import('../src/core/context-recovery.js');
    const recovery = new ContextRecovery();
    const result = await recovery.recover({
      change: 'test-change',
      phase: 'clarify',
      openspec: {
        changeDir: 'openspec/changes/test-change',
        prd: 'openspec/changes/test-change/prd.md',
      },
    });
    expect(result.tasksProgress).toBe('available');
    expect(result.partial).toBe(false);
    expect(result.handoffValid).toBe(false);
  });

  it("recover phase='design' 且无 openspec.tasks 时返回 tasksProgress='missing'", async () => {
    const { ContextRecovery } = await import('../src/core/context-recovery.js');
    const recovery = new ContextRecovery();
    const result = await recovery.recover({
      change: 'test-change',
      phase: 'design',
      openspec: { changeDir: 'openspec/changes/test-change' },
    });
    expect(result.tasksProgress).toBe('missing');
    expect(result.handoffValid).toBe(true);
  });

  it('recover 仅有 change 名称无 phase 时返回 partial=true', async () => {
    const { ContextRecovery } = await import('../src/core/context-recovery.js');
    const recovery = new ContextRecovery();
    const result = await recovery.recover({ change: 'partial-change' });
    expect(result.partial).toBe(true);
    expect(result.change).toBe('partial-change');
    expect(result.phase).toBe('clarify');
  });

  it('validateHandoff 接受包含 sources 数组的对象', async () => {
    const { ContextRecovery } = await import('../src/core/context-recovery.js');
    const recovery = new ContextRecovery();
    expect(recovery.validateHandoff({ sources: ['a.md', 'b.md'] })).toBe(true);
  });

  it('validateHandoff 拒绝 null', async () => {
    const { ContextRecovery } = await import('../src/core/context-recovery.js');
    const recovery = new ContextRecovery();
    expect(recovery.validateHandoff(null)).toBe(false);
  });

  it('validateHandoff 拒绝不含 sources 的对象', async () => {
    const { ContextRecovery } = await import('../src/core/context-recovery.js');
    const recovery = new ContextRecovery();
    expect(recovery.validateHandoff({ other: 'value' })).toBe(false);
  });

  it('validateHandoff 拒绝 sources 非数组的对象', async () => {
    const { ContextRecovery } = await import('../src/core/context-recovery.js');
    const recovery = new ContextRecovery();
    expect(recovery.validateHandoff({ sources: 'not-an-array' })).toBe(false);
  });

  it('validateHandoff 拒绝空 sources 数组（仍为数组类型）', async () => {
    const { ContextRecovery } = await import('../src/core/context-recovery.js');
    const recovery = new ContextRecovery();
    // 空数组仍是 Array.isArray === true
    expect(recovery.validateHandoff({ sources: [] })).toBe(true);
  });
});
