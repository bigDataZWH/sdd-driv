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
