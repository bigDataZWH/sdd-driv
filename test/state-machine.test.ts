import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const PHASE_ORDER = ['clarify', 'design', 'build', 'verify', 'archive'];

describe('StateMachine', () => {
  let tmpDir: string;
  let stateMachine: InstanceType<any>;
  let FileSystem: any;
  let YamlParser: any;
  let PathResolver: any;
  let StateMachine: any;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-test-'));

    const fsModule = await import('../src/utils/file-system.js');
    const parserModule = await import('../src/utils/yaml-parser.js');
    const resolverModule = await import('../src/core/path-resolver.js');
    const smModule = await import('../src/core/state-machine.js');

    FileSystem = fsModule.FileSystem;
    YamlParser = parserModule.YamlParser;
    PathResolver = resolverModule.PathResolver;
    StateMachine = smModule.StateMachine;

    const fsImpl = new FileSystem(tmpDir);
    const parser = new YamlParser(fsImpl);
    const resolver = new PathResolver(tmpDir);
    stateMachine = new StateMachine(fsImpl, parser, resolver);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('2.1 initChange', () => {
    it('创建 .driv.yaml 文件并包含默认值', async () => {
      await stateMachine.initChange('test-change');

      const stateFilePath = path.join(tmpDir, 'openspec', 'changes', 'test-change', '.driv.yaml');
      expect(fs.existsSync(stateFilePath)).toBe(true);

      const content = fs.readFileSync(stateFilePath, 'utf-8');
      const { parse } = await import('yaml');
      const state = parse(content);

      expect(state.change).toBe('test-change');
      expect(state.workflow).toBe('full');
      expect(state.phase).toBe('clarify');
      expect(state.openspec.proposal).toBe('openspec/changes/test-change/proposal.md');
      expect(state.openspec.design).toBe('openspec/changes/test-change/design.md');
      expect(state.openspec.tasks).toBeUndefined();
      expect(state.openspec.specs).toEqual([]);
      expect(state.phases.clarify.status).toBe('in-progress');
      expect(state.phases.design.status).toBe('pending');
      expect(state.phases.build.status).toBe('pending');
      expect(state.phases.verify.status).toBe('pending');
      expect(state.phases.archive.status).toBe('pending');
    });
  });

  describe('2.2 getState 和 validate', () => {
    it('getState 读取状态正确', async () => {
      await stateMachine.initChange('test-change');
      const state = await stateMachine.getState('test-change');
      expect(state.change).toBe('test-change');
      expect(state.phase).toBe('clarify');
    });

    it('validate 返回 true 对于有效状态', async () => {
      await stateMachine.initChange('test-change');
      const valid = await stateMachine.validate('test-change');
      expect(valid).toBe(true);
    });

    it('validate 返回 false 对于不存在的 change', async () => {
      const valid = await stateMachine.validate('nonexistent');
      expect(valid).toBe(false);
    });

    it('validate 返回 false 对于缺少必填字段的状态', async () => {
      const statePath = path.join(tmpDir, 'openspec', 'changes', 'bad-change', '.driv.yaml');
      fs.mkdirSync(path.dirname(statePath), { recursive: true });
      fs.writeFileSync(statePath, 'invalid: yaml: content', 'utf-8');

      const valid = await stateMachine.validate('bad-change');
      expect(valid).toBe(false);
    });
  });

  describe('2.3 setField', () => {
    it('更新点路径字段并保留其他字段', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.setField('test-change', 'phases.design.status', 'in-progress');

      const state = await stateMachine.getState('test-change');
      expect(state.phases.design.status).toBe('in-progress');
      expect(state.phases.clarify.status).toBe('in-progress');
      expect(state.change).toBe('test-change');
    });

    it('更新顶层字段', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.setField('test-change', 'workflow', 'light');

      const state = await stateMachine.getState('test-change');
      expect(state.workflow).toBe('light');
    });
  });

  describe('2.4 transition', () => {
    it('从 clarify 转换到 design 成功', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.transition('test-change', 'design');

      const state = await stateMachine.getState('test-change');
      expect(state.phase).toBe('design');
      expect(state.phases.clarify.status).toBe('completed');
      expect(state.phases.design.status).toBe('in-progress');
      expect(state.phases.clarify.completedAt).toBeDefined();
      expect(state.phases.design.startedAt).toBeDefined();
    });

    it('从 clarify 转换到 build 失败（跳过 design）', async () => {
      await stateMachine.initChange('test-change');
      await expect(stateMachine.transition('test-change', 'build')).rejects.toThrow();
    });

    it('从 design 回到 clarify 失败（不能回退）', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.transition('test-change', 'design');
      await expect(stateMachine.transition('test-change', 'clarify')).rejects.toThrow();
    });

    it('不支持从 clarify 直接到 archive', async () => {
      await stateMachine.initChange('test-change');
      await expect(stateMachine.transition('test-change', 'archive')).rejects.toThrow();
    });

    it('无效阶段名抛出错误', async () => {
      await stateMachine.initChange('test-change');
      await expect(stateMachine.transition('test-change', 'invalid-phase')).rejects.toThrow();
    });

    it('完整序列转换: clarify → design → build → verify → archive', async () => {
      await stateMachine.initChange('test-change');

      await stateMachine.transition('test-change', 'design');
      expect((await stateMachine.getState('test-change')).phase).toBe('design');

      await stateMachine.transition('test-change', 'build');
      expect((await stateMachine.getState('test-change')).phase).toBe('build');

      await stateMachine.transition('test-change', 'verify');
      expect((await stateMachine.getState('test-change')).phase).toBe('verify');

      await stateMachine.transition('test-change', 'archive');
      expect((await stateMachine.getState('test-change')).phase).toBe('archive');
      expect((await stateMachine.getState('test-change')).phases.archive.status).toBe(
        'in-progress',
      );
    });
  });

  describe('2.5 assessScale', () => {
    it('少于 3 个任务且少于 4 个文件返回 light', () => {
      const scale = stateMachine.assessScale(['task1'], ['file1.ts']);
      expect(scale).toBe('light');
    });

    it('边界: 3 个任务返回 full', () => {
      const scale = stateMachine.assessScale(['t1', 't2', 't3'], ['file1.ts']);
      expect(scale).toBe('full');
    });

    it('边界: 4 个文件返回 full', () => {
      const scale = stateMachine.assessScale(['task1'], ['f1', 'f2', 'f3', 'f4']);
      expect(scale).toBe('full');
    });

    it('空任务和文件返回 light', () => {
      const scale = stateMachine.assessScale([], []);
      expect(scale).toBe('light');
    });

    it('大量任务和文件返回 full', () => {
      const scale = stateMachine.assessScale(
        ['t1', 't2', 't3', 't4', 't5'],
        ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'],
      );
      expect(scale).toBe('full');
    });
  });
});
