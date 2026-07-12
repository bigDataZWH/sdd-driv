import { describe, it, expect } from 'vitest';

describe('DebugGate', () => {
  it('passed 为 true 时不强制执行', async () => {
    const { DebugGate } = await import('../src/core/debug-gate.js');
    const gate = new DebugGate();
    const result = gate.enforce('build', true);
    expect(result.enforced).toBe(false);
  });

  it('passed 为 false 时强制执行', async () => {
    const { DebugGate } = await import('../src/core/debug-gate.js');
    const gate = new DebugGate();
    const result = gate.enforce('build', false);
    expect(result.enforced).toBe(true);
    expect(result.reason).toContain('investigate');
  });
});
