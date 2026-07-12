import { describe, it, expect, vi } from 'vitest';

describe('PhaseGuard', () => {
  describe('3.1 - 类型定义', () => {
    it('应导出 PhaseGuardImpl 类并实现 PhaseGuard 接口', async () => {
      const mod = await import('../src/core/phase-guard.js');
      expect(mod.PhaseGuardImpl).toBeDefined();
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new mod.PhaseGuardImpl();
      const state = createDefaultState('test');
      expect(typeof guard.checkEntry).toBe('function');
      expect(typeof guard.checkExit).toBe('function');
      expect(typeof guard.applyTransition).toBe('function');
    });
  });

  describe('3.2 - Clarify 阶段守卫', () => {
    it('Clarify entry 始终通过（无前置条件）', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');

      const result = await guard.checkEntry('clarify', state);

      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
      expect(result.phase).toBe('clarify');
      expect(result.direction).toBe('entry');
    });

    it('Clarify exit 在 proposal 存在且阶段完成时通过', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.openspec.proposal = 'openspec/changes/test/proposal.md';
      state.openspec.specs = ['openspec/changes/test/specs/auth/spec.md'];
      state.openspec.tasks = 'openspec/changes/test/tasks.md';
      state.phases.clarify.status = 'completed';
      state.phases.clarify.artifacts['design-converted'] = 'true';

      const result = await guard.checkExit('clarify', state);

      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('Clarify exit 在 proposal 缺失时失败', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.openspec.proposal = '';

      const result = await guard.checkExit('clarify', state);

      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.check === 'proposal_exists')).toBe(true);
    });
  });

  describe('3.3 - Design 阶段守卫', () => {
    it('Design exit 要求 design.md、详细设计完成、handoff 生成和技术评审通过', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.openspec.design = 'openspec/changes/test/design.md';
      state.phases.design.status = 'completed';
      state.phases.design.artifacts['detailed-design-completed'] = 'true';
      state.phases.design.artifacts.handoff = 'valid';
      state.hwProcess.technicalReview = 'passed';

      const result = await guard.checkExit('design', state);

      expect(result.passed).toBe(true);
    });

    it('Design exit 在 design 路径缺失时失败', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.openspec.design = '';

      const result = await guard.checkExit('design', state);

      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.check === 'design_doc_exists')).toBe(true);
    });

    it('Design entry 检查前置条件', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.phase = 'design';
      state.phases.clarify.status = 'completed';
      state.openspec.proposal = 'proposal.md';
      state.hwProcess.requirementReview = 'passed';

      const result = await guard.checkEntry('design', state);

      expect(result.passed).toBe(true);
    });
  });

  describe('3.4 - Build 阶段守卫', () => {
    it('Build exit 在所有条件满足时通过', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.buildMode = 'subagent-driven-development';
      state.tddMode = 'tdd';
      state.isolation = 'branch';
      state.phases.build.artifacts.committed = 'true';
      state.phases.build.artifacts.tests = 'passed';
      state.phases.build.artifacts['clean-code'] = 'passed';
      state.hwProcess.codeReview = 'passed';
      state.phases.build.artifacts['plan-created'] = 'true';

      const result = await guard.checkExit('build', state);

      expect(result.passed).toBe(true);
    });

    it('Build exit 在 build_mode 未设置时失败', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.buildMode = '';
      state.tddMode = 'tdd';
      state.isolation = 'branch';
      state.hwProcess.codeReview = 'passed';

      const result = await guard.checkExit('build', state);

      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.check === 'build_mode_set')).toBe(true);
    });
  });

  describe('3.5 - Verify & Archive 阶段守卫', () => {
    it('Verify exit 在 verify_result 通过时满足条件', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.verifyResult = 'pass';
      state.phases.verify.artifacts['branch-handled'] = 'true';
      state.phases.verify.artifacts.report = 'report.md';

      const result = await guard.checkExit('verify', state);

      expect(result.passed).toBe(true);
    });

    it('Verify exit 在 verify_result 未通过时失败', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.verifyResult = 'pending';

      const result = await guard.checkExit('verify', state);

      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.check === 'verify_passed')).toBe(true);
    });

    it('Archive entry 检查前置条件', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.phase = 'archive';
      state.phases.verify.status = 'completed';
      state.verifyResult = 'pass';
      state.phases.verify.artifacts['branch-handled'] = 'true';

      const result = await guard.checkEntry('archive', state);

      expect(result.passed).toBe(true);
    });

    it('Build entry 检查前置条件', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.phase = 'build';
      state.phases.design.status = 'completed';
      state.openspec.design = 'design.md';
      state.hwProcess.technicalReview = 'passed';
      state.phases.design.artifacts.handoff = 'handoff.json';

      const result = await guard.checkEntry('build', state);

      expect(result.passed).toBe(true);
    });

    it('Build entry 在 design 未完成时失败', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.phase = 'build';

      const result = await guard.checkEntry('build', state);

      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.check === 'design_completed')).toBe(true);
    });

    it('Verify entry 检查前置条件', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.phase = 'verify';
      state.phases.build.status = 'completed';
      state.phases.build.artifacts.committed = 'true';
      state.phases.build.artifacts.tests = 'passed';
      state.hwProcess.codeReview = 'passed';

      const result = await guard.checkEntry('verify', state);

      expect(result.passed).toBe(true);
    });

    it('Design entry 只要求 Clarify 完成且 proposal 存在', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.phase = 'design';
      state.phases.clarify.status = 'completed';
      state.openspec.proposal = 'proposal.md';

      const result = await guard.checkEntry('design', state);

      expect(result.passed).toBe(true);
      expect(result.failures.some((f) => f.check === 'requirement_review_passed')).toBe(false);
    });

    it('Design entry 在 clarify 未完成时失败', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.phase = 'design';

      const result = await guard.checkEntry('design', state);

      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.check === 'clarify_completed')).toBe(true);
    });
  });

  describe('3.6 - applyTransition', () => {
    it('守卫通过时调用 stateMachine.transition', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.openspec.proposal = 'proposal.md';
      state.openspec.specs = ['openspec/changes/test/specs/auth/spec.md'];
      state.openspec.tasks = 'openspec/changes/test/tasks.md';
      state.phases.clarify.status = 'completed';
      state.phases.clarify.artifacts['design-converted'] = 'true';

      const transition = vi.fn();
      const stateMachine = { transition };

      const result = await guard.applyTransition('clarify', 'design', state, stateMachine);

      expect(result.passed).toBe(true);
      expect(transition).toHaveBeenCalledWith('test', 'design');
    });

    it('守卫未通过时阻止转换', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.openspec.proposal = '';

      const transition = vi.fn();
      const stateMachine = { transition };

      const result = await guard.applyTransition('clarify', 'design', state, stateMachine);

      expect(result.passed).toBe(false);
      expect(transition).not.toHaveBeenCalled();
    });
  });
});
