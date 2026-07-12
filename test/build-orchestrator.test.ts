import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('BuildOrchestrator (1.1-1.5)', () => {
  let tmpDir: string;
  let orchestrator: any;
  let stateMachine: any;
  let fsImpl: any;
  let ScriptExec: any;
  let exec: any;
  let gitOps: any;
  let BuildOrchestrator: any;
  let HandoffManager: any;
  let PathResolver: any;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-build-'));

    const fsModule = await import('../src/utils/file-system.js');
    const parserModule = await import('../src/utils/yaml-parser.js');
    const resolverModule = await import('../src/core/path-resolver.js');
    const smModule = await import('../src/core/state-machine.js');
    const handoffModule = await import('../src/core/handoff-manager.js');
    const gitOpsModule = await import('../src/core/git-ops.js');
    const scriptExecModule = await import('../src/utils/script-exec.js');
    const orchestratorModule = await import('../src/core/build-orchestrator.js');

    ScriptExec = scriptExecModule.ScriptExec;
    BuildOrchestrator = orchestratorModule.BuildOrchestrator;
    HandoffManager = handoffModule.HandoffManager;
    PathResolver = resolverModule.PathResolver;

    fsImpl = new fsModule.FileSystem(tmpDir);
    const parser = new parserModule.YamlParser(fsImpl);
    const resolver = new resolverModule.PathResolver(tmpDir);
    stateMachine = new smModule.StateMachine(fsImpl, parser, resolver);

    exec = new ScriptExec();
    await exec.exec('git', ['init'], { cwd: tmpDir });
    await exec.exec('git', ['config', 'user.email', 'test@test.com'], { cwd: tmpDir });
    await exec.exec('git', ['config', 'user.name', 'Test'], { cwd: tmpDir });
    await fs.promises.writeFile(path.join(tmpDir, 'README.md'), '# Test');
    await exec.exec('git', ['add', '.'], { cwd: tmpDir });
    await exec.exec('git', ['commit', '-m', 'initial'], { cwd: tmpDir });

    gitOps = new gitOpsModule.GitOpsImpl(exec, tmpDir);
    const handoffManager = new HandoffManager(fsImpl, resolver, parser);

    orchestrator = new BuildOrchestrator(fsImpl, stateMachine, gitOps, resolver, handoffManager);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('1.1 checkPreconditions', () => {
    it('design 完成且技术评审通过时返回 ok: true', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.transition('test-change', 'design');
      await stateMachine.transition('test-change', 'build');
      await stateMachine.setField('test-change', 'hwProcess.technicalReview', 'passed');

      const result = await orchestrator.checkPreconditions('test-change');
      expect(result.ok).toBe(true);
    });

    it('design 未完成时返回 ok: false', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.setField('test-change', 'hwProcess.technicalReview', 'passed');

      const result = await orchestrator.checkPreconditions('test-change');
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/设计/);
    });

    it('技术评审未通过时返回 ok: false', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.transition('test-change', 'design');
      await stateMachine.transition('test-change', 'build');

      const result = await orchestrator.checkPreconditions('test-change');
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/技术评审/);
    });

    it('技术评审为 pending 时同样返回 false', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.transition('test-change', 'design');
      await stateMachine.transition('test-change', 'build');
      await stateMachine.setField('test-change', 'hwProcess.technicalReview', 'pending');

      const result = await orchestrator.checkPreconditions('test-change');
      expect(result.ok).toBe(false);
    });
  });

  describe('1.2-1.3 createPlan', () => {
    async function setupBuildReady(name: string) {
      await stateMachine.initChange(name);
      await stateMachine.transition(name, 'design');
      await stateMachine.transition(name, 'build');
      await stateMachine.setField(name, 'openspec.design', `openspec/changes/${name}/design.md`);
      await stateMachine.setField(name, 'openspec.tasks', `openspec/changes/${name}/tasks.md`);
      await stateMachine.setField(name, 'openspec.specs', [
        `openspec/changes/${name}/specs/**/*.md`,
      ]);
      await stateMachine.setField(name, 'hwProcess.technicalReview', 'passed');
    }

    it('创建 plan 文件并返回路径', async () => {
      await setupBuildReady('test-change');
      const planPath = await orchestrator.createPlan('test-change');

      expect(planPath).toMatch(/openspec\/changes\/test-change\/plan\.md/);
      expect(planPath).toContain('plan.md');
      expect(fs.existsSync(path.join(tmpDir, planPath))).toBe(true);
    });

    it('plan 内容引用 OpenSpec 路径', async () => {
      await setupBuildReady('test-change');
      const planPath = await orchestrator.createPlan('test-change');
      const content = fs.readFileSync(path.join(tmpDir, planPath), 'utf-8');

      expect(content).toContain('openspec/changes/test-change');
      expect(content).toContain('Proposal');
      expect(content).toContain('Design');
      expect(content).toContain('Tasks');
    });

    it('plan 内容包含 build 模式配置', async () => {
      await setupBuildReady('test-change');
      const planPath = await orchestrator.createPlan('test-change');
      const content = fs.readFileSync(path.join(tmpDir, planPath), 'utf-8');

      expect(content).toContain('subagent-driven-development');
      expect(content).toContain('tdd');
      expect(content).toContain('branch');
    });

    it('plan 记录 handoff hash', async () => {
      await setupBuildReady('test-change');
      const planPath = await orchestrator.createPlan('test-change');
      const content = fs.readFileSync(path.join(tmpDir, planPath), 'utf-8');

      expect(content).toMatch(/[0-9a-f]{64}/);
    });
  });

  describe('1.4 setupModes', () => {
    it('写入 build_mode 到状态', async () => {
      await stateMachine.initChange('test-change');
      await orchestrator.setupModes('test-change', {
        buildMode: 'subagent-driven-development',
        tddMode: 'tdd',
        isolation: 'branch',
      });

      const state = await stateMachine.getState('test-change');
      expect(state.buildMode).toBe('subagent-driven-development');
      expect(state.tddMode).toBe('tdd');
      expect(state.isolation).toBe('branch');
    });

    it('支持不同的模式组合', async () => {
      await stateMachine.initChange('test-change');
      await orchestrator.setupModes('test-change', {
        buildMode: 'manual',
        tddMode: 'no-tdd',
        isolation: 'worktree',
      });

      const state = await stateMachine.getState('test-change');
      expect(state.buildMode).toBe('manual');
      expect(state.tddMode).toBe('no-tdd');
      expect(state.isolation).toBe('worktree');
    });
  });

  describe('1.5 initIsolation', () => {
    it('branch 隔离创建分支并切换到 driv/ 前缀分支', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.setField('test-change', 'isolation', 'branch');
      await orchestrator.initIsolation('test-change');

      const status = await gitOps.status();
      expect(status.branch).toBe('driv/test-change');
    });

    it('worktree 隔离创建分支但不切换', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.setField('test-change', 'isolation', 'worktree');

      const statusBefore = await gitOps.status();
      await orchestrator.initIsolation('test-change');
      const statusAfter = await gitOps.status();

      expect(statusAfter.branch).toBe(statusBefore.branch);
    });

    it('inline 隔离不执行分支操作', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.setField('test-change', 'isolation', 'inline');

      const shaBefore = await gitOps.getHeadSha();
      await orchestrator.initIsolation('test-change');
      const shaAfter = await gitOps.getHeadSha();

      expect(shaAfter).toBe(shaBefore);
    });
  });
});
