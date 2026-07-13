import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
      state.superpowers.brainstorming = 'openspec/changes/test/brainstorming.md';

      const result = await guard.checkExit('design', state);

      expect(result.passed).toBe(true);
    });

    it('Design exit 在 brainstorming 未设置时产生 warning', async () => {
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

      expect(result.failures.some((f) => f.check === 'brainstorming_generated')).toBe(true);
      expect(result.failures.find((f) => f.check === 'brainstorming_generated')?.severity).toBe('warning');
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
      state.superpowers.plan = 'openspec/changes/test/plan.md';

      const result = await guard.checkExit('build', state);

      expect(result.passed).toBe(true);
    });

    it('Build exit 在 superpowers.plan 未设置时产生 warning', async () => {
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

      const result = await guard.checkExit('build', state);

      expect(result.failures.some((f) => f.check === 'superpowers_plan_set')).toBe(true);
      expect(result.failures.find((f) => f.check === 'superpowers_plan_set')?.severity).toBe('warning');
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

    it('Build exit 在 tddMode 为 tdd 时不报 tdd 相关失败', async () => {
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
      state.superpowers.plan = 'openspec/changes/test/plan.md';

      const result = await guard.checkExit('build', state);

      expect(result.failures.some((f) => f.check === 'tdd_mode_set')).toBe(false);
      expect(result.failures.some((f) => f.check === 'tdd_mode_warning')).toBe(false);
    });

    it('Build exit 在 tddMode 为 tdd-lite 时不报 tdd 相关失败', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.buildMode = 'subagent-driven-development';
      state.tddMode = 'tdd-lite';
      state.isolation = 'branch';
      state.phases.build.artifacts.committed = 'true';
      state.phases.build.artifacts.tests = 'passed';
      state.phases.build.artifacts['clean-code'] = 'passed';
      state.hwProcess.codeReview = 'passed';
      state.phases.build.artifacts['plan-created'] = 'true';
      state.superpowers.plan = 'openspec/changes/test/plan.md';

      const result = await guard.checkExit('build', state);

      expect(result.failures.some((f) => f.check === 'tdd_mode_set')).toBe(false);
      expect(result.failures.some((f) => f.check === 'tdd_mode_warning')).toBe(false);
    });

    it('Build exit 在 tddMode 为 no-tdd 时报 tdd_mode_warning 且不报 tdd_mode_set', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.buildMode = 'subagent-driven-development';
      state.tddMode = 'no-tdd';
      state.isolation = 'branch';
      state.phases.build.artifacts.committed = 'true';
      state.phases.build.artifacts.tests = 'passed';
      state.phases.build.artifacts['clean-code'] = 'passed';
      state.hwProcess.codeReview = 'passed';
      state.phases.build.artifacts['plan-created'] = 'true';
      state.superpowers.plan = 'openspec/changes/test/plan.md';

      const result = await guard.checkExit('build', state);

      expect(result.failures.some((f) => f.check === 'tdd_mode_set')).toBe(false);
      const warning = result.failures.find((f) => f.check === 'tdd_mode_warning');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('warning');
    });

    it('Build exit 在 tddMode 未设置时报 tdd_mode_set error', async () => {
      const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
      const { createDefaultState } = await import('../src/core/types.js');
      const guard = new PhaseGuardImpl();
      const state = createDefaultState('test');
      state.buildMode = 'subagent-driven-development';
      state.tddMode = '';
      state.isolation = 'branch';
      state.phases.build.artifacts.committed = 'true';
      state.phases.build.artifacts.tests = 'passed';
      state.phases.build.artifacts['clean-code'] = 'passed';
      state.hwProcess.codeReview = 'passed';
      state.phases.build.artifacts['plan-created'] = 'true';
      state.superpowers.plan = 'openspec/changes/test/plan.md';

      const result = await guard.checkExit('build', state);

      expect(result.passed).toBe(false);
      const tddFailure = result.failures.find((f) => f.check === 'tdd_mode_set');
      expect(tddFailure).toBeDefined();
      expect(tddFailure?.severity).toBe('error');
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

describe('1.4 - validateHandoffHash 真实校验', () => {
  let tmpDir: string;
  const changeName = 'hash-test-change';

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-phase-guard-hash-'));
    const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
    await fs.promises.mkdir(changeDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(changeDir, 'proposal.md'),
      '# 提案\n\n实现用户登录功能',
    );
    await fs.promises.writeFile(
      path.join(changeDir, 'design.md'),
      '# 设计\n\n## Decisions\n使用 JWT 认证',
    );
    await fs.promises.writeFile(
      path.join(changeDir, 'tasks.md'),
      '# 任务\n\n- [ ] 实现登录 API',
    );
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  async function createGuardWithHandoff() {
    const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
    const { HandoffManager } = await import('../src/core/handoff-manager.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const { YamlParser } = await import('../src/utils/yaml-parser.js');
    const { createDefaultState } = await import('../src/core/types.js');

    const fsImpl = new FileSystem(tmpDir);
    const resolver = new PathResolver(tmpDir);
    const parser = new YamlParser(fsImpl);
    const handoffManager = new HandoffManager(fsImpl, resolver, parser);
    await handoffManager.generate(changeName, 'design', 'off');

    const guard = new PhaseGuardImpl(undefined, handoffManager);
    const state = createDefaultState(changeName);
    state.phase = 'build';
    state.phases.design.status = 'completed';
    state.openspec.design = `openspec/changes/${changeName}/design.md`;
    state.hwProcess.technicalReview = 'passed';
    state.phases.design.artifacts.handoff = 'valid';

    return { guard, state };
  }

  it('哈希全部匹配时 build entry 校验通过', async () => {
    const { guard, state } = await createGuardWithHandoff();

    const result = await guard.checkEntry('build', state);

    expect(result.failures.some((f) => f.check === 'handoff_hash_valid')).toBe(false);
  });

  it('任一文件被修改后 build entry 报 error 级失败', async () => {
    const { guard, state } = await createGuardWithHandoff();

    const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
    await fs.promises.writeFile(path.join(changeDir, 'proposal.md'), '# 被篡改的提案');

    const result = await guard.checkEntry('build', state);

    const hashFailure = result.failures.find((f) => f.check === 'handoff_hash_valid');
    expect(hashFailure).toBeDefined();
    expect(hashFailure?.severity).toBe('error');
    expect(hashFailure?.message).toContain('proposal.md');
  });

  it('handoff.json 不存在时跳过哈希校验', async () => {
    const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
    const { HandoffManager } = await import('../src/core/handoff-manager.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const { YamlParser } = await import('../src/utils/yaml-parser.js');
    const { createDefaultState } = await import('../src/core/types.js');

    const fsImpl = new FileSystem(tmpDir);
    const resolver = new PathResolver(tmpDir);
    const parser = new YamlParser(fsImpl);
    const handoffManager = new HandoffManager(fsImpl, resolver, parser);

    const guard = new PhaseGuardImpl(undefined, handoffManager);
    const state = createDefaultState(changeName);
    state.phase = 'build';
    state.phases.design.status = 'completed';
    state.openspec.design = `openspec/changes/${changeName}/design.md`;
    state.hwProcess.technicalReview = 'passed';
    state.phases.design.artifacts.handoff = 'valid';

    const result = await guard.checkEntry('build', state);

    expect(result.failures.some((f) => f.check === 'handoff_hash_valid')).toBe(false);
  });
});

describe('1.5 - DirtyWorktreeChecker 真实检测', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-phase-guard-git-'));
    const { ScriptExec } = await import('../src/utils/script-exec.js');
    const exec = new ScriptExec();
    await exec.exec('git', ['init'], { cwd: tmpDir });
    await exec.exec('git', ['config', 'user.email', 'test@test.com'], { cwd: tmpDir });
    await exec.exec('git', ['config', 'user.name', 'Test'], { cwd: tmpDir });
    await fs.promises.writeFile(path.join(tmpDir, 'README.md'), '# Test');
    await exec.exec('git', ['add', '.'], { cwd: tmpDir });
    await exec.exec('git', ['commit', '-m', 'initial'], { cwd: tmpDir });
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it('干净工作区通过', async () => {
    const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
    const { DirtyWorktreeChecker } = await import('../src/core/dirty-worktree.js');
    const { createDefaultState } = await import('../src/core/types.js');

    const checker = new DirtyWorktreeChecker(tmpDir);
    const guard = new PhaseGuardImpl(checker);
    const state = createDefaultState('test-change');
    state.phase = 'build';
    state.phases.design.status = 'completed';
    state.openspec.design = 'design.md';
    state.hwProcess.technicalReview = 'passed';

    const result = await guard.checkEntry('build', state);

    expect(result.failures.some((f) => f.check === 'dirty_worktree')).toBe(false);
  });

  it('有未提交变更时报 warning 级失败', async () => {
    const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
    const { DirtyWorktreeChecker } = await import('../src/core/dirty-worktree.js');
    const { createDefaultState } = await import('../src/core/types.js');

    await fs.promises.writeFile(path.join(tmpDir, 'uncommitted.txt'), 'dirty');

    const checker = new DirtyWorktreeChecker(tmpDir);
    const guard = new PhaseGuardImpl(checker);
    const state = createDefaultState('test-change');
    state.phase = 'build';
    state.phases.design.status = 'completed';
    state.openspec.design = 'design.md';
    state.hwProcess.technicalReview = 'passed';

    const result = await guard.checkEntry('build', state);

    const dirtyFailure = result.failures.find((f) => f.check === 'dirty_worktree');
    expect(dirtyFailure).toBeDefined();
    expect(dirtyFailure?.severity).toBe('warning');
  });
});

describe('2.x - Intent 对齐校验', () => {
  let tmpDir: string;
  const changeName = 'intent-align-test';

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-intent-align-'));
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  async function setupChangeAndGenerateHandoff(
    proposalContent: string,
    designContent: string,
    tasksContent: string,
  ) {
    const { HandoffManager } = await import('../src/core/handoff-manager.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const { YamlParser } = await import('../src/utils/yaml-parser.js');
    const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
    const { createDefaultState } = await import('../src/core/types.js');

    const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
    await fs.promises.mkdir(changeDir, { recursive: true });
    await fs.promises.writeFile(path.join(changeDir, 'proposal.md'), proposalContent);
    await fs.promises.writeFile(path.join(changeDir, 'design.md'), designContent);
    await fs.promises.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);

    const fsImpl = new FileSystem(tmpDir);
    const resolver = new PathResolver(tmpDir);
    const parser = new YamlParser(fsImpl);
    const handoffManager = new HandoffManager(fsImpl, resolver, parser);
    await handoffManager.generate(changeName, 'design', 'off');

    const guard = new PhaseGuardImpl(undefined, handoffManager);
    const state = createDefaultState(changeName);
    state.phase = 'build';
    state.phases.design.status = 'completed';
    state.openspec.design = `openspec/changes/${changeName}/design.md`;
    state.hwProcess.technicalReview = 'passed';
    state.phases.design.artifacts.handoff = 'valid';

    return { guard, state };
  }

  it('intent 非空且 design.md 包含 intent 关键词时，不报 intent_alignment 失败', async () => {
    const { guard, state } = await setupChangeAndGenerateHandoff(
      '# 提案\n\n## Intent\n修复 login timeout 问题\n',
      '# 设计\n\n## Decisions\n使用 JWT 解决 login 超时\n',
      '# 任务\n\n- [ ] 实现登录 API',
    );

    const result = await guard.checkEntry('build', state);

    expect(result.failures.some((f) => f.check === 'intent_alignment')).toBe(false);
  });

  it('intent 非空且 design.md 不包含 intent 关键词时，报 warning 级别 intent_alignment 失败', async () => {
    const { guard, state } = await setupChangeAndGenerateHandoff(
      '# 提案\n\n## Intent\n修复 login timeout 问题\n',
      '# 设计\n\n## Decisions\n使用 Redis 缓存优化性能\n',
      '# 任务\n\n- [ ] 配置 Redis',
    );

    const result = await guard.checkEntry('build', state);

    const intentFailure = result.failures.find((f) => f.check === 'intent_alignment');
    expect(intentFailure).toBeDefined();
    expect(intentFailure?.severity).toBe('warning');
    expect(intentFailure?.message).toContain('修复 login timeout 问题');
  });

  it('intent 为空时，跳过 intent 对齐校验', async () => {
    const { guard, state } = await setupChangeAndGenerateHandoff(
      '# 提案\n\n实现用户登录功能\n',
      '# 设计\n\n## Decisions\n使用 JWT 认证\n',
      '# 任务\n\n- [ ] 实现登录 API',
    );

    const result = await guard.checkEntry('build', state);

    expect(result.failures.some((f) => f.check === 'intent_alignment')).toBe(false);
  });
});

describe('P3-1 - PhaseGuard 集成 SchemaRegistry', () => {
  let tmpDir: string;
  const changeName = 'schema-test-change';

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-phase-guard-schema-'));
    const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
    await fs.promises.mkdir(path.join(changeDir, 'specs', 'auth'), { recursive: true });
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  async function buildGuardWithProposal(proposalContent: string) {
    const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { SchemaRegistry } = await import('../src/core/schema-registry.js');
    const { createDefaultState } = await import('../src/core/types.js');

    const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
    await fs.promises.writeFile(path.join(changeDir, 'proposal.md'), proposalContent);

    const fsImpl = new FileSystem(tmpDir);
    const schemaRegistry = new SchemaRegistry();
    const guard = new PhaseGuardImpl(undefined, undefined, fsImpl, schemaRegistry);
    const state = createDefaultState(changeName);
    state.openspec.proposal = path.join('openspec', 'changes', changeName, 'proposal.md');
    state.openspec.design = path.join('openspec', 'changes', changeName, 'design.md');
    state.openspec.tasks = path.join('openspec', 'changes', changeName, 'tasks.md');
    state.openspec.specs = [];
    state.phases.clarify.status = 'completed';
    return { guard, state };
  }

  it('proposal 符合 schema 时不报 proposal-schema-valid 失败', async () => {
    const { guard, state } = await buildGuardWithProposal('# 提案\n\n## 概述\n内容\n');
    const result = await guard.checkExit('clarify', state);
    expect(result.failures.some((f) => f.check === 'proposal-schema-valid')).toBe(false);
  });

  it('proposal 缺少标题时报 proposal-schema-valid warning', async () => {
    // 无 # 标题 -> schema 校验失败
    const { guard, state } = await buildGuardWithProposal('只有正文\n\n没有标题\n');
    const result = await guard.checkExit('clarify', state);
    const schemaFailure = result.failures.find((f) => f.check === 'proposal-schema-valid');
    expect(schemaFailure).toBeDefined();
    expect(schemaFailure?.severity).toBe('warning');
    expect(schemaFailure?.message).toContain('proposal schema 校验失败');
  });

  it('proposal 内容为空时报 proposal-schema-valid warning', async () => {
    const { guard, state } = await buildGuardWithProposal('   \n  ');
    const result = await guard.checkExit('clarify', state);
    const schemaFailure = result.failures.find((f) => f.check === 'proposal-schema-valid');
    expect(schemaFailure).toBeDefined();
    expect(schemaFailure?.severity).toBe('warning');
  });

  it('未注入 SchemaRegistry 时跳过 schema 校验', async () => {
    const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
    const { createDefaultState } = await import('../src/core/types.js');
    const guard = new PhaseGuardImpl();
    const state = createDefaultState(changeName);
    state.openspec.proposal = 'openspec/changes/test/proposal.md';
    state.openspec.design = 'design.md';
    state.openspec.tasks = 'tasks.md';
    state.openspec.specs = [];
    state.phases.clarify.status = 'completed';
    const result = await guard.checkExit('clarify', state);
    expect(result.failures.some((f) => f.check === 'proposal-schema-valid')).toBe(false);
  });

  it('proposal 文件不存在时不阻断（best-effort）', async () => {
    const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { SchemaRegistry } = await import('../src/core/schema-registry.js');
    const { createDefaultState } = await import('../src/core/types.js');
    const fsImpl = new FileSystem(tmpDir);
    const schemaRegistry = new SchemaRegistry();
    const guard = new PhaseGuardImpl(undefined, undefined, fsImpl, schemaRegistry);
    const state = createDefaultState(changeName);
    // 指向不存在的文件
    state.openspec.proposal = path.join('openspec', 'changes', changeName, 'missing.md');
    state.openspec.design = 'design.md';
    state.openspec.tasks = 'tasks.md';
    state.openspec.specs = [];
    state.phases.clarify.status = 'completed';
    const result = await guard.checkExit('clarify', state);
    // 读文件失败被 catch，不应产生 schema 失败
    expect(result.failures.some((f) => f.check === 'proposal-schema-valid')).toBe(false);
  });
});

describe('P3-2 - PhaseGuard 集成 EARS Validator', () => {
  let tmpDir: string;
  const changeName = 'ears-test-change';

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-phase-guard-ears-'));
    const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
    await fs.promises.mkdir(path.join(changeDir, 'specs', 'auth'), { recursive: true });
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  async function buildGuardWithSpec(specContent: string) {
    const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { createDefaultState } = await import('../src/core/types.js');

    const specPath = path.join('openspec', 'changes', changeName, 'specs', 'auth', 'spec.md');
    const fullSpecPath = path.join(tmpDir, specPath);
    await fs.promises.writeFile(fullSpecPath, specContent);

    const fsImpl = new FileSystem(tmpDir);
    const guard = new PhaseGuardImpl(undefined, undefined, fsImpl);
    const state = createDefaultState(changeName);
    state.openspec.proposal = path.join('openspec', 'changes', changeName, 'proposal.md');
    state.openspec.design = path.join('openspec', 'changes', changeName, 'design.md');
    state.openspec.tasks = path.join('openspec', 'changes', changeName, 'tasks.md');
    state.openspec.specs = [specPath];
    state.phases.clarify.status = 'completed';
    return { guard, state };
  }

  it('spec 全部符合 EARS 句式时不报 ears-syntax 失败', async () => {
    const { guard, state } = await buildGuardWithSpec(
      '# Spec\n\n## Requirements\n\nThe system SHALL log all operations.\n',
    );
    const result = await guard.checkExit('clarify', state);
    expect(result.failures.some((f) => f.check === 'ears-syntax')).toBe(false);
  });

  it('spec 存在不符合 EARS 句式的语句时报 ears-syntax warning', async () => {
    // "Logs shall be generated." 不以 "The system" 开头，不符合 EARS
    const { guard, state } = await buildGuardWithSpec(
      '# Spec\n\n## Requirements\n\nLogs shall be generated.\n',
    );
    const result = await guard.checkExit('clarify', state);
    const earsFailure = result.failures.find((f) => f.check === 'ears-syntax');
    expect(earsFailure).toBeDefined();
    expect(earsFailure?.severity).toBe('warning');
    expect(earsFailure?.message).toContain('EARS 句式建议');
  });

  it('spec 文件不存在时不报 ears-syntax 失败（best-effort）', async () => {
    const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { createDefaultState } = await import('../src/core/types.js');
    const fsImpl = new FileSystem(tmpDir);
    const guard = new PhaseGuardImpl(undefined, undefined, fsImpl);
    const state = createDefaultState(changeName);
    state.openspec.proposal = path.join('openspec', 'changes', changeName, 'proposal.md');
    state.openspec.design = path.join('openspec', 'changes', changeName, 'design.md');
    state.openspec.tasks = path.join('openspec', 'changes', changeName, 'tasks.md');
    state.openspec.specs = [path.join('openspec', 'changes', changeName, 'specs', 'nope', 'spec.md')];
    state.phases.clarify.status = 'completed';
    const result = await guard.checkExit('clarify', state);
    expect(result.failures.some((f) => f.check === 'ears-syntax')).toBe(false);
  });

  it('未注入 FileSystem 时跳过 EARS 校验', async () => {
    const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
    const { createDefaultState } = await import('../src/core/types.js');
    const guard = new PhaseGuardImpl();
    const state = createDefaultState(changeName);
    state.openspec.proposal = 'proposal.md';
    state.openspec.design = 'design.md';
    state.openspec.tasks = 'tasks.md';
    state.openspec.specs = ['openspec/changes/test/specs/auth/spec.md'];
    state.phases.clarify.status = 'completed';
    const result = await guard.checkExit('clarify', state);
    expect(result.failures.some((f) => f.check === 'ears-syntax')).toBe(false);
  });

  it('多个 spec 路径时分别校验', async () => {
    const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { createDefaultState } = await import('../src/core/types.js');

    const spec1Path = path.join('openspec', 'changes', changeName, 'specs', 'auth', 'spec.md');
    const spec2Path = path.join('openspec', 'changes', changeName, 'specs', 'user', 'spec.md');
    await fs.promises.mkdir(path.dirname(path.join(tmpDir, spec2Path)), { recursive: true });
    await fs.promises.writeFile(
      path.join(tmpDir, spec1Path),
      '# Spec1\n\nThe system SHALL authenticate.\n',
    );
    await fs.promises.writeFile(
      path.join(tmpDir, spec2Path),
      '# Spec2\n\nLogs shall be generated.\n',
    );

    const fsImpl = new FileSystem(tmpDir);
    const guard = new PhaseGuardImpl(undefined, undefined, fsImpl);
    const state = createDefaultState(changeName);
    state.openspec.proposal = path.join('openspec', 'changes', changeName, 'proposal.md');
    state.openspec.design = path.join('openspec', 'changes', changeName, 'design.md');
    state.openspec.tasks = path.join('openspec', 'changes', changeName, 'tasks.md');
    state.openspec.specs = [spec1Path, spec2Path];
    state.phases.clarify.status = 'completed';

    const result = await guard.checkExit('clarify', state);
    const earsFailures = result.failures.filter((f) => f.check === 'ears-syntax');
    expect(earsFailures.length).toBe(1);
    expect(earsFailures[0].message).toContain(spec2Path);
  });
});

describe('P3-3 - ArchiveService 集成 DeltaSpecParser', () => {
  let tmpDir: string;
  let archiveService: InstanceType<any>;
  const changeName = 'delta-strategy-test';

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-archive-delta-'));

    const fsModule = await import('../src/utils/file-system.js');
    const parserModule = await import('../src/utils/yaml-parser.js');
    const smModule = await import('../src/core/state-machine.js');
    const archiveModule = await import('../src/core/archive-service.js');
    const resolverModule = await import('../src/core/path-resolver.js');

    const fsImpl = new fsModule.FileSystem(tmpDir);
    const parser = new parserModule.YamlParser(fsImpl);
    const resolver = new resolverModule.PathResolver(tmpDir);
    const sm = new smModule.StateMachine(fsImpl, parser, resolver);
    archiveService = new archiveModule.ArchiveService(fsImpl, sm, parser, tmpDir);

    await sm.initChange(changeName);
    await sm.transition(changeName, 'design');
    await sm.transition(changeName, 'build');
    await sm.transition(changeName, 'verify');
    await sm.transition(changeName, 'archive');

    const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
    const statePath = path.join(changeDir, '.driv.yaml');
    const { parse, stringify } = await import('yaml');
    const state = parse(fs.readFileSync(statePath, 'utf-8'));
    state.phases.verify.status = 'completed';
    state.verifyResult = 'pass';
    state.verifiedAt = new Date().toISOString();
    state.archived = false;
    fs.writeFileSync(statePath, stringify(state), 'utf-8');

    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Proposal', 'utf-8');
    fs.writeFileSync(path.join(changeDir, 'design.md'), '# Design', 'utf-8');
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '# Tasks', 'utf-8');
    fs.mkdirSync(path.join(changeDir, 'reports'), { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, 'reports', 'verification-report.md'),
      '# Report',
      'utf-8',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('DeltaSpecParser 识别 ## REMOVED Requirements 为 supersede 策略', async () => {
    const deltaSpecDir = path.join(
      tmpDir,
      'openspec',
      'changes',
      changeName,
      'specs',
      'removed-cap',
    );
    fs.mkdirSync(deltaSpecDir, { recursive: true });
    fs.writeFileSync(
      path.join(deltaSpecDir, 'spec.md'),
      '## REMOVED Requirements\n\n### Requirement: Old feature\nThe system SHALL old.\n',
      'utf-8',
    );
    await archiveService.mergeDeltaSpec(changeName);
    const mainSpecPath = path.join(tmpDir, 'openspec', 'specs', 'removed-cap', 'spec.md');
    expect(fs.existsSync(mainSpecPath)).toBe(true);
  });

  it('DeltaSpecParser 识别 ## MODIFIED Requirements 为 update 策略', async () => {
    const mainSpecDir = path.join(tmpDir, 'openspec', 'specs', 'mod-cap');
    fs.mkdirSync(mainSpecDir, { recursive: true });
    fs.writeFileSync(
      path.join(mainSpecDir, 'spec.md'),
      '# Spec\n\n### Requirement: Mod feature\nThe system SHALL old.\n',
      'utf-8',
    );
    const deltaSpecDir = path.join(
      tmpDir,
      'openspec',
      'changes',
      changeName,
      'specs',
      'mod-cap',
    );
    fs.mkdirSync(deltaSpecDir, { recursive: true });
    fs.writeFileSync(
      path.join(deltaSpecDir, 'spec.md'),
      '## MODIFIED Requirements\n\n### Requirement: Mod feature\nThe system SHALL new.\n',
      'utf-8',
    );
    await archiveService.mergeDeltaSpec(changeName);
    const mainSpec = fs.readFileSync(path.join(mainSpecDir, 'spec.md'), 'utf-8');
    expect(mainSpec).toContain('SHALL new');
    expect(mainSpec).not.toContain('SHALL old');
  });
});

describe('schema-registry 单元测试', () => {
  it('parseArtifact 提取 frontmatter 与 body', async () => {
    const { SchemaRegistry } = await import('../src/core/schema-registry.js');
    const reg = new SchemaRegistry();
    const parsed = reg.parseArtifact('---\ntemplate: x\nversion: 1.0\n---\n\n# Title\n\nbody\n');
    expect(parsed.frontmatter?.template).toBe('x');
    expect(parsed.body).toContain('# Title');
    expect(parsed.body).not.toContain('---');
    expect(parsed.sections).toContain('# Title');
  });

  it('validate 无 schema 类型时返回 valid', async () => {
    const { SchemaRegistry } = await import('../src/core/schema-registry.js');
    const reg = new SchemaRegistry();
    const result = reg.validate('unknown-type', { body: 'x' });
    expect(result.valid).toBe(true);
  });

  it('validate 缺少必需章节时报错', async () => {
    const { SchemaRegistry } = await import('../src/core/schema-registry.js');
    const reg = new SchemaRegistry();
    const parsed = reg.parseArtifact('仅文本无标题');
    const result = reg.validate('proposal', parsed);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => /缺少必需章节/.test(e))).toBe(true);
  });
});

describe('ears-validator 单元测试', () => {
  it('符合 EARS 句式的 spec 通过校验', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const result = validateEARS(
      '# Spec\n\n## Requirements\n\nThe system SHALL log all operations.\nWhen user logs in, the system SHALL redirect to dashboard.\n',
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('不符合 EARS 句式的语句被记录', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const result = validateEARS('# Spec\n\nLogs shall be generated.\n');
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toContain('EARS');
  });

  it('WHEN/WHILE/WHERE/IF 句式均通过', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const result = validateEARS(
      'When trigger fires, the system SHALL respond.\nWhile idle, the system SHALL sleep.\nWhere feature is enabled, the system SHALL activate.\nIf error occurs, then the system SHALL retry.\n',
    );
    expect(result.valid).toBe(true);
  });
});

describe('delta-spec-parser 单元测试', () => {
  it('解析 ADDED/MODIFIED/REMOVED 三类 requirement', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const delta = parseDeltaSpec(
      [
        '## ADDED Requirements',
        '',
        '### Requirement: New feature',
        'The system SHALL new.',
        '',
        '## MODIFIED Requirements',
        '',
        '### Requirement: Changed feature',
        'The system SHALL changed.',
        '',
        '## REMOVED Requirements',
        '',
        '### Requirement: Old feature',
        'The system SHALL old.',
      ].join('\n'),
    );
    expect(delta.added).toEqual(['New feature']);
    expect(delta.modified).toEqual(['Changed feature']);
    expect(delta.removed).toEqual(['Old feature']);
  });

  it('UPDATED Requirements 归类为 modified', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const delta = parseDeltaSpec(
      '## UPDATED Requirements\n\n### Requirement: Upd feature\nThe system SHALL upd.\n',
    );
    expect(delta.modified).toEqual(['Upd feature']);
    expect(delta.added).toHaveLength(0);
    expect(delta.removed).toHaveLength(0);
  });

  it('SUPERSEDE 归类为 removed', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const delta = parseDeltaSpec(
      '## SUPERSEDE\n\n### Requirement: Old\nThe system SHALL old.\n',
    );
    expect(delta.removed).toEqual(['Old']);
  });

  it('空内容返回空 delta', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const delta = parseDeltaSpec('# 仅标题\n\n无章节');
    expect(delta.added).toHaveLength(0);
    expect(delta.modified).toHaveLength(0);
    expect(delta.removed).toHaveLength(0);
  });
});
