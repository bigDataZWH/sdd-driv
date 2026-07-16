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
      expect(state.openspec.prd).toBe('openspec/changes/test-change/prd.md');
      expect(state.openspec.proposal).toBeUndefined();
      expect(state.openspec.design).toBeUndefined();
      expect(state.openspec.tasks).toBeUndefined();
      expect(state.openspec.specs).toBeUndefined();
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

    it('从 clarify 转换到 build 成功（catch-up 自动补齐 design）', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.transition('test-change', 'build');
      const state = await stateMachine.getState('test-change');
      expect(state.phase).toBe('build');
      expect(state.phases.clarify.status).toBe('completed');
      expect(state.phases.design.status).toBe('completed');
      expect(state.phases.build.status).toBe('in-progress');
    });

    it('从 design 回到 clarify 失败（不能回退）', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.transition('test-change', 'design');
      await expect(stateMachine.transition('test-change', 'clarify')).rejects.toThrow();
    });
    it('从 clarify 直接 catch-up 到 archive 成功', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.transition('test-change', 'archive');
      const state = await stateMachine.getState('test-change');
      expect(state.phase).toBe('archive');
      expect(state.phases.clarify.status).toBe('completed');
      expect(state.phases.design.status).toBe('completed');
      expect(state.phases.build.status).toBe('completed');
      expect(state.phases.verify.status).toBe('completed');
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

  describe('2.6 set* 辅助方法', () => {
    it('setBrainstormingPath 写入 superpowers.brainstorming 与 design.artifacts', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.setBrainstormingPath(
        'test-change',
        'openspec/changes/test-change/brainstorming.md',
      );

      const state = await stateMachine.getState('test-change');
      expect(state.superpowers.brainstorming).toBe(
        'openspec/changes/test-change/brainstorming.md',
      );
      expect(state.phases.design.artifacts.brainstorming).toBe(
        'openspec/changes/test-change/brainstorming.md',
      );
    });

    it('setDetailedDesignCompleted 写入 design.artifacts', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.setDetailedDesignCompleted('test-change');

      const state = await stateMachine.getState('test-change');
      expect(state.phases.design.artifacts['detailed-design-completed']).toBe('true');
    });

    it('setDesignPath 同时更新 openspec.design 与 design.artifacts.design', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.setDesignPath('test-change', 'openspec/changes/test-change/design.md');

      const state = await stateMachine.getState('test-change');
      expect(state.openspec.design).toBe('openspec/changes/test-change/design.md');
      expect(state.phases.design.artifacts.design).toBe('openspec/changes/test-change/design.md');
    });

    it('setSpecsPaths 写入 openspec.specs 数组与 artifacts.specs 逗号拼接', async () => {
      await stateMachine.initChange('test-change');
      const specs = [
        'openspec/changes/test-change/specs/cap-a/spec.md',
        'openspec/changes/test-change/specs/cap-b/spec.md',
      ];
      await stateMachine.setSpecsPaths('test-change', specs);

      const state = await stateMachine.getState('test-change');
      expect(state.openspec.specs).toEqual(specs);
      expect(state.phases.design.artifacts.specs).toBe(specs.join(','));
    });
  });

  describe('2.7 边界情况', () => {
    it('transition 在当前阶段无效（currentIndex < 0）时抛出错误', async () => {
      await stateMachine.initChange('test-change');
      // 将 phase 改为非法值，使 PHASE_ORDER.indexOf 返回 -1
      await stateMachine.setField('test-change', 'phase', 'invalid-phase');

      await expect(stateMachine.transition('test-change', 'design')).rejects.toThrow(
        /无效的当前阶段/,
      );
    });

    it('getState 在状态文件损坏/无效时抛出错误', async () => {
      const statePath = path.join(
        tmpDir,
        'openspec',
        'changes',
        'corrupt-change',
        '.driv.yaml',
      );
      fs.mkdirSync(path.dirname(statePath), { recursive: true });
      // 写入缺少 change 字段的内容，validateChangeState 应抛出
      fs.writeFileSync(statePath, 'foo: bar\n', 'utf-8');

      await expect(stateMachine.getState('corrupt-change')).rejects.toThrow(/Invalid state/);
    });

    it('setField 更新嵌套字段 hwProcess.technicalReview', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.setField('test-change', 'hwProcess.technicalReview', 'passed');

      const state = await stateMachine.getState('test-change');
      expect(state.hwProcess.technicalReview).toBe('passed');
      // 其他字段保留
      expect(state.hwProcess.requirementReview).toBe('pending');
      expect(state.hwProcess.codeReview).toBe('pending');
      expect(state.change).toBe('test-change');
    });
  });

  describe('2.8 Round 44: 转换与缓存边界用例', () => {
    it('从 archive（最终阶段）转换抛出错误（无后续阶段）', async () => {
      await stateMachine.initChange('test-change');
      // 完整转换到 archive
      await stateMachine.transition('test-change', 'design');
      await stateMachine.transition('test-change', 'build');
      await stateMachine.transition('test-change', 'verify');
      await stateMachine.transition('test-change', 'archive');

      // 从 archive 转换到任何阶段都应抛出（无向前转换可能）
      await expect(stateMachine.transition('test-change', 'verify')).rejects.toThrow();
      await expect(stateMachine.transition('test-change', 'clarify')).rejects.toThrow();
    });

    it('从 archive 转换到自身也抛出错误', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.transition('test-change', 'design');
      await stateMachine.transition('test-change', 'build');
      await stateMachine.transition('test-change', 'verify');
      await stateMachine.transition('test-change', 'archive');

      await expect(stateMachine.transition('test-change', 'archive')).rejects.toThrow();
    });

    it('transition 非相邻阶段（clarify → build）catch-up 成功', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.transition('test-change', 'build');
      const state = await stateMachine.getState('test-change');
      expect(state.phase).toBe('build');
      expect(state.phases.design.status).toBe('completed');
    });

    it('transition 向后转换（design → clarify）抛出错误', async () => {
      await stateMachine.initChange('test-change');
      await stateMachine.transition('test-change', 'design');
      await expect(stateMachine.transition('test-change', 'clarify')).rejects.toThrow(
        /不允许从.*转换到/,
      );
    });

    it('validate 有效状态返回 true', async () => {
      await stateMachine.initChange('test-change');
      const valid = await stateMachine.validate('test-change');
      expect(valid).toBe(true);
    });

    it('validate 缺少 phases 字段返回 false', async () => {
      const statePath = path.join(
        tmpDir,
        'openspec',
        'changes',
        'no-phases-change',
        '.driv.yaml',
      );
      fs.mkdirSync(path.dirname(statePath), { recursive: true });
      fs.writeFileSync(
        statePath,
        'change: no-phases-change\nworkflow: full\nphase: clarify\n',
        'utf-8',
      );
      const valid = await stateMachine.validate('no-phases-change');
      expect(valid).toBe(false);
    });

    it('clearCache 后 getState 返回手动修改的最新数据', async () => {
      await stateMachine.initChange('test-change');
      const stateFilePath = path.join(
        tmpDir,
        'openspec',
        'changes',
        'test-change',
        '.driv.yaml',
      );

      // 初次读取，填充缓存
      const state1 = await stateMachine.getState('test-change');
      expect(state1.workflow).toBe('full');

      // 手动修改文件
      let content = fs.readFileSync(stateFilePath, 'utf-8');
      content = content.replace('workflow: full', 'workflow: light');
      fs.writeFileSync(stateFilePath, content, 'utf-8');

      // clearCache 后 getState 返回最新数据
      stateMachine.clearCache('test-change');
      const state2 = await stateMachine.getState('test-change');
      expect(state2.workflow).toBe('light');
    });

    it('clearCache（无参数）清除所有缓存后 getState 返回最新数据', async () => {
      await stateMachine.initChange('test-change');
      const stateFilePath = path.join(
        tmpDir,
        'openspec',
        'changes',
        'test-change',
        '.driv.yaml',
      );

      // 初次读取，填充缓存
      await stateMachine.getState('test-change');

      // 手动修改文件
      let content = fs.readFileSync(stateFilePath, 'utf-8');
      content = content.replace('workflow: full', 'workflow: light');
      fs.writeFileSync(stateFilePath, content, 'utf-8');

      // clearCache（无参数）清除所有缓存
      stateMachine.clearCache();
      const state = await stateMachine.getState('test-change');
      expect(state.workflow).toBe('light');
    });
  });
});
