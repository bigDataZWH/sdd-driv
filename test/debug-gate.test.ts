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
    expect(result.investigateGuidance).toContain('investigate');
  });

  it("enforce('verify', true) 返回 enforced: false", async () => {
    const { DebugGate } = await import('../src/core/debug-gate.js');
    const gate = new DebugGate();
    const result = gate.enforce('verify', true);
    expect(result.enforced).toBe(false);
  });

  it("enforce('verify', false) 返回 enforced: true 且包含 investigateGuidance", async () => {
    const { DebugGate } = await import('../src/core/debug-gate.js');
    const gate = new DebugGate();
    const result = gate.enforce('verify', false);
    expect(result.enforced).toBe(true);
    expect(result.investigateGuidance).toBeTruthy();
    expect(typeof result.investigateGuidance).toBe('string');
  });

  it('investigateGuidance 包含 "investigate" 关键词', async () => {
    const { DebugGate } = await import('../src/core/debug-gate.js');
    const gate = new DebugGate();
    const result = gate.enforce('verify', false);
    expect(result.investigateGuidance).toContain('investigate');
  });
});
