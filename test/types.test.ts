import { describe, it, expect } from 'vitest';

describe('Driv 基础类型定义', () => {
  it('Phase 类型包含全部五个阶段', async () => {
    const { Phase } = await import('../src/core/types.js');
    const phases: string[] = Object.values(Phase);
    expect(phases).toContain('clarify');
    expect(phases).toContain('design');
    expect(phases).toContain('build');
    expect(phases).toContain('verify');
    expect(phases).toContain('archive');
  });

  it('Workflow 固定为 full', async () => {
    const { Workflow } = await import('../src/core/types.js');
    expect(Workflow.Full).toBe('full');
  });

  it('ReviewStatus 包含 pending/passed/rejected', async () => {
    const { ReviewStatus } = await import('../src/core/types.js');
    expect(ReviewStatus.Pending).toBe('pending');
    expect(ReviewStatus.Passed).toBe('passed');
    expect(ReviewStatus.Rejected).toBe('rejected');
  });

  it('BuildMode 包含 subagent/executing-plans/manual', async () => {
    const { BuildMode } = await import('../src/core/types.js');
    expect(BuildMode.Subagent).toBe('subagent-driven-development');
    expect(BuildMode.Sequential).toBe('executing-plans');
    expect(BuildMode.Manual).toBe('manual');
  });

  it('TddMode 包含 tdd/tdd-lite/no-tdd', async () => {
    const { TddMode } = await import('../src/core/types.js');
    expect(TddMode.Tdd).toBe('tdd');
    expect(TddMode.TddLite).toBe('tdd-lite');
    expect(TddMode.NoTdd).toBe('no-tdd');
  });

  it('IsolationMode 包含 branch/worktree/inline', async () => {
    const { IsolationMode } = await import('../src/core/types.js');
    expect(IsolationMode.Branch).toBe('branch');
    expect(IsolationMode.Worktree).toBe('worktree');
    expect(IsolationMode.Inline).toBe('inline');
  });

  it('VerifyMode 包含 light/full', async () => {
    const { VerifyMode } = await import('../src/core/types.js');
    expect(VerifyMode.Light).toBe('light');
    expect(VerifyMode.Full).toBe('full');
  });

  it('VerifyResult 包含 pending/pass/fail', async () => {
    const { VerifyResult } = await import('../src/core/types.js');
    expect(VerifyResult.Pending).toBe('pending');
    expect(VerifyResult.Pass).toBe('pass');
    expect(VerifyResult.Fail).toBe('fail');
  });

  it('ChangeState 接口包含必填字段', async () => {
    const { createDefaultState } = await import('../src/core/types.js');
    const state = createDefaultState('test-change');
    expect(state.change).toBe('test-change');
    expect(state.workflow).toBe('full');
    expect(state.phase).toBe('clarify');
    expect(state.openspec).toBeDefined();
    expect(state.openspec.proposal).toBe('openspec/changes/test-change/proposal.md');
    expect(state.openspec.design).toBe('openspec/changes/test-change/design.md');
    expect(state.openspec.tasks).toBeUndefined();
    expect(state.openspec.specs).toEqual([]);
    expect(state.superpowers).toBeDefined();
    expect(state.phases).toBeDefined();
    expect(state.phases.clarify).toBeDefined();
    expect(state.phases.design).toBeDefined();
    expect(state.phases.build).toBeDefined();
    expect(state.phases.verify).toBeDefined();
    expect(state.phases.archive).toBeDefined();
    expect(state.contextCompression).toBe('off');
    expect(state.archived).toBe(false);
    expect(state.branchStatus).toBeUndefined();
  });
});
