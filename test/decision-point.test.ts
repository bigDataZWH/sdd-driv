import { describe, it, expect } from 'vitest';

describe('DecisionPoint', () => {
  it('require 返回 confirmed 结果', async () => {
    const { DecisionPoint } = await import('../src/core/decision-point.js');
    const dp = new DecisionPoint();
    const result = await dp.require('build-mode', []);
    expect(result.confirmed).toBe(true);
    expect(result.timestamp).toBeDefined();
  });
});
