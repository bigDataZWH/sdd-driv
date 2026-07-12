import { describe, it, expect } from 'vitest';

describe('DecisionPoint', () => {
  it('require 默认返回 confirmed: false（不再默认 true）', async () => {
    const { DecisionPoint } = await import('../src/core/decision-point.js');
    const dp = new DecisionPoint();
    const result = await dp.require('需求确认', []);
    expect(result.confirmed).toBe(false);
    expect(result.timestamp).toBeDefined();
  });

  it('require 返回结果包含 message 字段', async () => {
    const { DecisionPoint } = await import('../src/core/decision-point.js');
    const dp = new DecisionPoint();
    const result = await dp.require('需求确认', []);
    expect(result.message).toBeDefined();
    expect(typeof result.message).toBe('string');
    expect(result.message).toContain('需求确认');
    expect(result.message).toContain('需用户确认');
  });

  it('confirm 返回 confirmed: true', async () => {
    const { DecisionPoint } = await import('../src/core/decision-point.js');
    const dp = new DecisionPoint();
    const result = await dp.confirm('需求确认');
    expect(result.confirmed).toBe(true);
    expect(result.timestamp).toBeDefined();
  });

  it('confirm 支持传入 choice', async () => {
    const { DecisionPoint } = await import('../src/core/decision-point.js');
    const dp = new DecisionPoint();
    const result = await dp.confirm('提案确认', 'accept');
    expect(result.confirmed).toBe(true);
    expect(result.choice).toBe('accept');
  });

  it('confirm 未传入 choice 时返回空字符串', async () => {
    const { DecisionPoint } = await import('../src/core/decision-point.js');
    const dp = new DecisionPoint();
    const result = await dp.confirm('设计确认');
    expect(result.confirmed).toBe(true);
    expect(result.choice).toBe('');
  });

  it('require 返回空 choice', async () => {
    const { DecisionPoint } = await import('../src/core/decision-point.js');
    const dp = new DecisionPoint();
    const result = await dp.require('任务确认', []);
    expect(result.choice).toBe('');
  });

  describe('DECISION_POINTS 常量', () => {
    it('8 个 DP 常量都已定义且 id 正确', async () => {
      const { DECISION_POINTS } = await import('../src/core/decision-point.js');
      expect(DECISION_POINTS.DP_0.id).toBe('DP-0');
      expect(DECISION_POINTS.DP_1.id).toBe('DP-1');
      expect(DECISION_POINTS.DP_2.id).toBe('DP-2');
      expect(DECISION_POINTS.DP_3.id).toBe('DP-3');
      expect(DECISION_POINTS.DP_4.id).toBe('DP-4');
      expect(DECISION_POINTS.DP_5.id).toBe('DP-5');
      expect(DECISION_POINTS.DP_6.id).toBe('DP-6');
      expect(DECISION_POINTS.DP_7.id).toBe('DP-7');
    });

    it('每个 DP 常量包含 name/phase/description 字段', async () => {
      const { DECISION_POINTS } = await import('../src/core/decision-point.js');
      const nodes = Object.values(DECISION_POINTS);
      expect(nodes).toHaveLength(8);
      for (const node of nodes) {
        expect(typeof node.name).toBe('string');
        expect(node.name.length).toBeGreaterThan(0);
        expect(typeof node.phase).toBe('string');
        expect(node.phase.length).toBeGreaterThan(0);
        expect(typeof node.description).toBe('string');
        expect(node.description.length).toBeGreaterThan(0);
      }
    });

    it('DP 节点 id 与 name 映射正确', async () => {
      const { DECISION_POINTS } = await import('../src/core/decision-point.js');
      expect(DECISION_POINTS.DP_0.name).toBe('需求确认');
      expect(DECISION_POINTS.DP_1.name).toBe('提案确认');
      expect(DECISION_POINTS.DP_2.name).toBe('规格确认');
      expect(DECISION_POINTS.DP_3.name).toBe('设计确认');
      expect(DECISION_POINTS.DP_4.name).toBe('任务确认');
      expect(DECISION_POINTS.DP_5.name).toBe('契约确认');
      expect(DECISION_POINTS.DP_6.name).toBe('批次确认');
      expect(DECISION_POINTS.DP_7.name).toBe('收尾确认');
    });
  });
});
