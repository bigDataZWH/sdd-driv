import { describe, it, expect } from 'vitest';

describe('DirtyWorktreeChecker', () => {
  it('默认检查返回 clean', async () => {
    const { DirtyWorktreeChecker } = await import('../src/core/dirty-worktree.js');
    const checker = new DirtyWorktreeChecker();
    const result = await checker.check('test-change');
    expect(result.dirty).toBe(false);
    expect(result.changes).toHaveLength(0);
  });
});
