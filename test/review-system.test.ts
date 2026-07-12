import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const { execFileMock } = vi.hoisted(() => {
  const execFileMock = vi.fn();
  const PROMISIFY_SYMBOL = Symbol.for('nodejs.util.promisify.custom');
  const customPromisified = function (this: unknown, ...args: unknown[]) {
    return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const cb = (err: unknown, stdout: string, stderr: string) => {
        if (err) {
          (err as Record<string, unknown>).stdout = stdout;
          (err as Record<string, unknown>).stderr = stderr;
          reject(err);
        } else {
          resolve({ stdout, stderr });
        }
      };
      (execFileMock as unknown as (...a: unknown[]) => void).apply(this, [
        ...args,
        cb,
      ]);
    });
  };
  Object.defineProperty(execFileMock, PROMISIFY_SYMBOL, {
    value: customPromisified,
    configurable: true,
    enumerable: true,
  });
  return { execFileMock };
});

vi.mock('child_process', () => ({
  execFile: execFileMock,
}));

let tmpDir: string;

beforeEach(async () => {
  execFileMock.mockClear();
  execFileMock.mockImplementation((...args: unknown[]) => {
    const cb = args[args.length - 1] as (err: unknown, stdout: string, stderr: string) => void;
    cb(null, '', '');
  });
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-review-'));

  // Create review template files
  await fs.promises.mkdir(path.join(tmpDir, '.driv', 'templates', 'reviews'), { recursive: true });

  await fs.promises.writeFile(
    path.join(tmpDir, '.driv', 'templates', 'reviews', 'requirement-review.md'),
    [
      '# 需求评审',
      '',
      '## 变更',
      '',
      '**变更名称**: {{change_name}}',
      '',
      '**变更类型**: {{change_type}}',
      '',
      '**评审日期**: {{review_date}}',
      '',
      '## 检查项',
      '',
      '{{checklist}}',
      '',
      '## 结论',
      '',
      '- **状态**: {{status:pending}}',
      '',
      '> 审批人填写结论',
    ].join('\n'),
  );

  await fs.promises.writeFile(
    path.join(tmpDir, '.driv', 'templates', 'reviews', 'technical-review.md'),
    [
      '# 技术评审',
      '',
      '## 变更',
      '',
      '**变更名称**: {{change_name}}',
      '',
      '**变更类型**: {{change_type}}',
      '',
      '**评审日期**: {{review_date}}',
      '',
      '## 检查项',
      '',
      '{{checklist}}',
      '',
      '## 结论',
      '',
      '- **状态**: {{status:pending}}',
      '',
      '> 审批人填写结论',
    ].join('\n'),
  );

  await fs.promises.writeFile(
    path.join(tmpDir, '.driv', 'templates', 'reviews', 'code-review.md'),
    [
      '# 代码评审',
      '',
      '## 变更',
      '',
      '**变更名称**: {{change_name}}',
      '',
      '**变更类型**: {{change_type}}',
      '',
      '**评审日期**: {{review_date}}',
      '',
      '## 检查项',
      '',
      '{{checklist}}',
      '',
      '## 结论',
      '',
      '- **状态**: {{status:pending}}',
      '',
      '> 审批人填写结论',
    ].join('\n'),
  );
});

afterEach(async () => {
  await fs.promises.rm(tmpDir, { recursive: true, force: true });
});

describe('ReviewSystem', () => {
  async function setup(opts?: { cleanCodeChecker?: unknown; root?: string }) {
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { TemplateManager } = await import('../src/core/template-manager.js');
    const { StateMachine } = await import('../src/core/state-machine.js');
    const { YamlParser } = await import('../src/utils/yaml-parser.js');
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const { ReviewSystemImpl } = await import('../src/core/review-system.js');

    const fileSystem = new FileSystem(tmpDir);
    const tm = new TemplateManager(fileSystem, tmpDir);
    const parser = new YamlParser(fileSystem);
    const resolver = new PathResolver(tmpDir);
    const sm = new StateMachine(fileSystem, parser, resolver);

    await sm.initChange('test-change');

    const reviewSys = new ReviewSystemImpl(
      fileSystem,
      tm,
      sm,
      resolver,
      opts?.cleanCodeChecker as never,
      opts?.root ?? tmpDir,
    );
    return { reviewSys, fileSystem, resolver, sm };
  }

  // ── createReview (2.1) ──

  it('createReview 生成需求评审 markdown 到正确路径', async () => {
    const { reviewSys } = await setup();

    const filePath = await reviewSys.createReview('test-change', 'requirement');

    expect(filePath).toBeDefined();
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('# 需求评审');
    expect(content).toContain('test-change');
    expect(content).toContain('requirement');
    expect(content).toContain('人工检查');
    expect(content).toContain('自动检查');
  });

  it('createReview 生成技术评审 markdown', async () => {
    const { reviewSys } = await setup();

    const filePath = await reviewSys.createReview('test-change', 'technical');

    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('# 技术评审');
    expect(content).toContain('test-change');
  });

  it('createReview 生成代码评审 markdown', async () => {
    const { reviewSys } = await setup();

    const filePath = await reviewSys.createReview('test-change', 'code');

    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('# 代码评审');
    expect(content).toContain('test-change');
  });

  it('createReview 在 reviews 目录下创建文件', async () => {
    const { reviewSys } = await setup();

    await reviewSys.createReview('test-change', 'requirement');
    await reviewSys.createReview('test-change', 'technical');
    await reviewSys.createReview('test-change', 'code');

    const reviewsDir = path.join(tmpDir, 'openspec', 'changes', 'test-change', 'reviews');
    expect(fs.existsSync(path.join(reviewsDir, 'requirement-review.md'))).toBe(true);
    expect(fs.existsSync(path.join(reviewsDir, 'technical-review.md'))).toBe(true);
    expect(fs.existsSync(path.join(reviewsDir, 'code-review.md'))).toBe(true);
  });

  // ── executeChecklist (2.2) ──

  it('executeChecklist 自动检查和人工检查项分离（需求评审）', async () => {
    const { reviewSys, fileSystem } = await setup();
    // Create proposal and tasks files for auto checks to pass
    const resolver = (await import('../src/core/path-resolver.js')).PathResolver;
    const r = new resolver(tmpDir);
    await fileSystem.writeFile(
      path.join(r.changeDir('test-change'), 'proposal.md'),
      '# Test Proposal',
    );
    await fileSystem.writeFile(path.join(r.changeDir('test-change'), 'tasks.md'), '- [ ] task 1');

    const result = await reviewSys.executeChecklist('test-change', 'requirement');

    expect(result.type).toBe('requirement');
    expect(result.items.length).toBeGreaterThanOrEqual(6);
    expect(result.timestamp).toBeDefined();

    const autoItems = result.items.filter((i) => i.autoCheck);
    const manualItems = result.items.filter((i) => !i.autoCheck);
    expect(autoItems.length).toBeGreaterThan(0);
    expect(manualItems.length).toBeGreaterThan(0);

    // Auto items should have results
    for (const item of autoItems) {
      expect(item.passed).toBeDefined();
      expect(item.detail).toBeDefined();
    }
    // Manual items should not have results
    for (const item of manualItems) {
      expect(item.passed).toBeUndefined();
      expect(item.detail).toBeUndefined();
    }
  });

  it('executeChecklist 返回技术评审正确检查项', async () => {
    const { reviewSys, fileSystem } = await setup();
    const resolver = (await import('../src/core/path-resolver.js')).PathResolver;
    const r = new resolver(tmpDir);
    await fileSystem.writeFile(
      path.join(r.changeDir('test-change'), 'design.md'),
      '# Design\n\n## 架构\n\nThe architecture\n\n## 接口\n\nAPI\n',
    );

    const result = await reviewSys.executeChecklist('test-change', 'technical');

    expect(result.type).toBe('technical');
    const autoItems = result.items.filter((i) => i.autoCheck);
    expect(autoItems.length).toBeGreaterThan(0);
  });

  it('executeChecklist 返回代码评审正确检查项', async () => {
    const { reviewSys } = await setup();

    const result = await reviewSys.executeChecklist('test-change', 'code');

    expect(result.type).toBe('code');
    const autoItems = result.items.filter((i) => i.autoCheck);
    expect(autoItems.length).toBeGreaterThan(0);
  });

  // ── submitReview (2.3) ──

  it('submitReview 解析通过结论并更新状态', async () => {
    const { reviewSys, resolver } = await setup();

    // Create a review file with passed conclusion
    await reviewSys.createReview('test-change', 'requirement');
    const reviewPath = path.join(
      resolver.changeDir('test-change'),
      'reviews',
      'requirement-review.md',
    );
    let content = fs.readFileSync(reviewPath, 'utf-8');
    content = content.replace('- **状态**: pending', '- **状态**: passed');
    fs.writeFileSync(reviewPath, content, 'utf-8');

    await reviewSys.submitReview('test-change', 'requirement');

    const state = fs.readFileSync(resolver.stateFile('test-change'), 'utf-8');
    const { parse } = await import('yaml');
    const parsed = parse(state);
    expect(parsed.hwProcess.requirementReview).toBe('passed');
  });

  it('submitReview 解析失败结论并更新状态', async () => {
    const { reviewSys, resolver } = await setup();

    await reviewSys.createReview('test-change', 'technical');
    const reviewPath = path.join(
      resolver.changeDir('test-change'),
      'reviews',
      'technical-review.md',
    );
    let content = fs.readFileSync(reviewPath, 'utf-8');
    content = content.replace('- **状态**: pending', '- **状态**: failed');
    fs.writeFileSync(reviewPath, content, 'utf-8');

    await reviewSys.submitReview('test-change', 'technical');

    const state = fs.readFileSync(resolver.stateFile('test-change'), 'utf-8');
    const { parse } = await import('yaml');
    const parsed = parse(state);
    expect(parsed.hwProcess.technicalReview).toBe('failed');
  });

  it('submitReview 保持 pending 状态当结论未填写', async () => {
    const { reviewSys, resolver } = await setup();

    await reviewSys.createReview('test-change', 'code');

    await reviewSys.submitReview('test-change', 'code');

    const state = fs.readFileSync(resolver.stateFile('test-change'), 'utf-8');
    const { parse } = await import('yaml');
    const parsed = parse(state);
    expect(parsed.hwProcess.codeReview).toBe('pending');
  });

  // ── checkStatus (2.4) ──

  it('checkStatus 返回当前评审状态', async () => {
    const { reviewSys, resolver } = await setup();

    // Initially pending
    const initial = await reviewSys.checkStatus('test-change', 'requirement');
    expect(initial).toBe('pending');

    // After manual update
    const statePath = resolver.stateFile('test-change');
    const raw = fs.readFileSync(statePath, 'utf-8');
    const { parse, stringify } = await import('yaml');
    const data = parse(raw);
    data.hwProcess.requirementReview = 'passed';
    fs.writeFileSync(statePath, stringify(data, { lineWidth: 120 }), 'utf-8');

    const updated = await reviewSys.checkStatus('test-change', 'requirement');
    expect(updated).toBe('passed');
  });

  it('checkStatus 返回各类评审状态', async () => {
    const { reviewSys } = await setup();

    const reqStatus = await reviewSys.checkStatus('test-change', 'requirement');
    const techStatus = await reviewSys.checkStatus('test-change', 'technical');
    const codeStatus = await reviewSys.checkStatus('test-change', 'code');

    expect(reqStatus).toBe('pending');
    expect(techStatus).toBe('pending');
    expect(codeStatus).toBe('pending');
  });

  // ── listReviews (2.4) ──

  it('listReviews 返回变更关联的所有评审', async () => {
    const { reviewSys } = await setup();

    await reviewSys.createReview('test-change', 'requirement');
    await reviewSys.createReview('test-change', 'technical');
    await reviewSys.createReview('test-change', 'code');

    const reviews = await reviewSys.listReviews('test-change');

    expect(reviews.length).toBe(3);
    expect(reviews.map((r) => r.type).sort()).toEqual(['code', 'requirement', 'technical']);
    for (const r of reviews) {
      expect(r.path).toBeDefined();
      expect(r.status).toBe('pending');
      expect(r.createdAt).toBeDefined();
    }
  });

  it('listReviews 返回空数组当没有评审文件', async () => {
    const { reviewSys } = await setup();

    const reviews = await reviewSys.listReviews('test-change');

    expect(reviews).toEqual([]);
  });

  // ── PhaseGuard 接线验证 (2.5) ──

  it('PhaseGuard 不再在 Clarify exit 检查 requirementReview 状态', async () => {
    const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
    const { createDefaultState } = await import('../src/core/types.js');
    const guard = new PhaseGuardImpl();
    const state = createDefaultState('test');
    state.openspec.proposal = 'proposal.md';
    state.openspec.design = 'design.md';
    state.openspec.specs = ['specs/test/spec.md'];
    state.openspec.tasks = 'tasks.md';
    state.phases.clarify.status = 'completed';

    const result = await guard.checkExit('clarify', state);
    expect(result.passed).toBe(true);
    expect(result.failures.some((f) => f.check === 'requirement_review_passed')).toBe(false);
  });

  it('PhaseGuard 已检查 technicalReview 状态', async () => {
    const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
    const { createDefaultState } = await import('../src/core/types.js');
    const guard = new PhaseGuardImpl();
    const state = createDefaultState('test');
    state.openspec.design = 'design.md';
    state.phases.design.status = 'completed';
    state.phases.design.artifacts.handoff = 'valid';

    state.hwProcess.technicalReview = 'passed';
    const result = await guard.checkExit('design', state);
    expect(result.failures.some((f) => f.check === 'technical_review_passed')).toBe(false);

    state.hwProcess.technicalReview = 'pending';
    const result2 = await guard.checkExit('design', state);
    expect(result2.failures.some((f) => f.check === 'technical_review_passed')).toBe(true);
  });

  it('PhaseGuard 已检查 codeReview 状态', async () => {
    const { PhaseGuardImpl } = await import('../src/core/phase-guard.js');
    const { createDefaultState } = await import('../src/core/types.js');
    const guard = new PhaseGuardImpl();
    const state = createDefaultState('test');
    state.superpowers.plan = 'plan.md';
    state.buildMode = 'subagent-driven-development';
    state.tddMode = 'tdd';
    state.isolation = 'branch';
    state.phases.build.artifacts.committed = 'true';
    state.phases.build.artifacts.tests = 'passed';

    state.hwProcess.codeReview = 'passed';
    const result = await guard.checkExit('build', state);
    expect(result.failures.some((f) => f.check === 'code_review_passed')).toBe(false);

    state.hwProcess.codeReview = 'pending';
    const result2 = await guard.checkExit('build', state);
    expect(result2.failures.some((f) => f.check === 'code_review_passed')).toBe(true);
  });

  // ── runAutoCheck 真实工具调用 (Task 6) ──

  it('runAutoCheck "代码已提交" 工作区干净时 passed=true', async () => {
    const { reviewSys } = await setup();
    execFileMock.mockImplementation(
      (
        cmd: string,
        args: string[],
        opts: unknown,
        cb: (err: unknown, stdout: string, stderr: string) => void,
      ) => {
        if (cmd === 'git') {
          cb(null, '', '');
        } else {
          cb(null, '', '');
        }
      },
    );
    const result = await reviewSys.executeChecklist('test-change', 'code');
    const item = result.items.find((i) => i.name === '代码已提交')!;
    expect(item.passed).toBe(true);
    expect(item.detail).toContain('工作区干净');
  });

  it('runAutoCheck "代码已提交" 有未提交变更时 passed=false', async () => {
    const { reviewSys } = await setup();
    execFileMock.mockImplementation(
      (
        cmd: string,
        args: string[],
        opts: unknown,
        cb: (err: unknown, stdout: string, stderr: string) => void,
      ) => {
        if (cmd === 'git') {
          cb(null, ' M src/index.ts\n M src/foo.ts\n', '');
        } else {
          cb(null, '', '');
        }
      },
    );
    const result = await reviewSys.executeChecklist('test-change', 'code');
    const item = result.items.find((i) => i.name === '代码已提交')!;
    expect(item.passed).toBe(false);
    expect(item.detail).toContain('未提交变更');
  });

  it('runAutoCheck "代码已提交" 工具调用抛错时回退到状态字段', async () => {
    const { reviewSys, sm } = await setup();
    await sm.setField('test-change', 'phases.build.artifacts.committed', 'true');
    execFileMock.mockImplementation(
      (
        cmd: string,
        args: string[],
        opts: unknown,
        cb: (err: unknown, stdout: string, stderr: string) => void,
      ) => {
        if (cmd === 'git') {
          cb(new Error('git not found'), '', '');
        } else {
          cb(null, '', '');
        }
      },
    );
    const result = await reviewSys.executeChecklist('test-change', 'code');
    const item = result.items.find((i) => i.name === '代码已提交')!;
    expect(item.passed).toBe(true);
    expect(item.detail).toContain('回退到状态字段');
  });

  it('runAutoCheck "测试通过" npm test 成功时 passed=true', async () => {
    const { reviewSys } = await setup();
    execFileMock.mockImplementation(
      (
        cmd: string,
        args: string[],
        opts: unknown,
        cb: (err: unknown, stdout: string, stderr: string) => void,
      ) => {
        cb(null, '', '');
      },
    );
    const result = await reviewSys.executeChecklist('test-change', 'code');
    const item = result.items.find((i) => i.name === '测试通过')!;
    expect(item.passed).toBe(true);
    expect(item.detail).toContain('测试已通过');
  });

  it('runAutoCheck "测试通过" 测试失败时 passed=false', async () => {
    const { reviewSys } = await setup();
    const err = new Error('Command failed: npm test') as Error & { stderr: string };
    err.stderr = 'FAIL src/test.ts\n  ✗ test case failed';
    execFileMock.mockImplementation(
      (
        cmd: string,
        args: string[],
        opts: unknown,
        cb: (err: unknown, stdout: string, stderr: string) => void,
      ) => {
        if (cmd === 'npm' && args[0] === 'test') {
          cb(err, '', err.stderr);
        } else {
          cb(null, '', '');
        }
      },
    );
    const result = await reviewSys.executeChecklist('test-change', 'code');
    const item = result.items.find((i) => i.name === '测试通过')!;
    expect(item.passed).toBe(false);
    expect(item.detail).toContain('测试失败');
  });

  it('runAutoCheck "测试通过" npm 不可用时回退到状态字段', async () => {
    const { reviewSys, sm } = await setup();
    await sm.setField('test-change', 'phases.build.artifacts.tests', 'passed');
    const err = new Error('npm: command not found') as Error & { stderr: string };
    err.stderr = 'npm: command not found';
    execFileMock.mockImplementation(
      (
        cmd: string,
        args: string[],
        opts: unknown,
        cb: (err: unknown, stdout: string, stderr: string) => void,
      ) => {
        if (cmd === 'npm') {
          cb(err, '', err.stderr);
        } else {
          cb(null, '', '');
        }
      },
    );
    const result = await reviewSys.executeChecklist('test-change', 'code');
    const item = result.items.find((i) => i.name === '测试通过')!;
    expect(item.passed).toBe(true);
    expect(item.detail).toContain('回退到状态字段');
  });

  it('runAutoCheck "Clean Code 通过" 检查通过时 passed=true', async () => {
    await fs.promises.mkdir(path.join(tmpDir, 'src'), { recursive: true });
    await fs.promises.writeFile(
      path.join(tmpDir, 'src', 'index.ts'),
      'export const x = 1;\n',
    );
    const mockChecker = {
      check: vi
        .fn()
        .mockResolvedValue({ passed: true, score: 100, issues: [], categoryScores: {} }),
    };
    const { reviewSys } = await setup({ cleanCodeChecker: mockChecker });
    const result = await reviewSys.executeChecklist('test-change', 'code');
    const item = result.items.find((i) => i.name === 'Clean Code 通过')!;
    expect(item.passed).toBe(true);
    expect(item.detail).toContain('Clean Code 已通过');
    expect(mockChecker.check).toHaveBeenCalled();
  });

  it('runAutoCheck "Clean Code 通过" 检查失败时 passed=false', async () => {
    await fs.promises.mkdir(path.join(tmpDir, 'src'), { recursive: true });
    await fs.promises.writeFile(
      path.join(tmpDir, 'src', 'index.ts'),
      'export const x = 1;\n',
    );
    const mockChecker = {
      check: vi.fn().mockResolvedValue({
        passed: false,
        score: 50,
        issues: [{ rule: 'test', severity: 'major', message: 'fail' }],
        categoryScores: {},
      }),
    };
    const { reviewSys } = await setup({ cleanCodeChecker: mockChecker });
    const result = await reviewSys.executeChecklist('test-change', 'code');
    const item = result.items.find((i) => i.name === 'Clean Code 通过')!;
    expect(item.passed).toBe(false);
    expect(item.detail).toContain('Clean Code 失败');
  });

  it('runAutoCheck "安全扫描通过" npm audit 成功时 passed=true', async () => {
    const { reviewSys } = await setup();
    execFileMock.mockImplementation(
      (
        cmd: string,
        args: string[],
        opts: unknown,
        cb: (err: unknown, stdout: string, stderr: string) => void,
      ) => {
        cb(null, '', '');
      },
    );
    const result = await reviewSys.executeChecklist('test-change', 'code');
    const item = result.items.find((i) => i.name === '安全扫描通过')!;
    expect(item.passed).toBe(true);
    expect(item.detail).toContain('安全扫描已通过');
  });

  it('runAutoCheck "安全扫描通过" 发现漏洞时 passed=false', async () => {
    const { reviewSys } = await setup();
    const err = new Error('npm audit found vulnerabilities') as Error & {
      stderr: string;
    };
    err.stderr = 'npm audit report\nhigh severity vulnerability detected';
    execFileMock.mockImplementation(
      (
        cmd: string,
        args: string[],
        opts: unknown,
        cb: (err: unknown, stdout: string, stderr: string) => void,
      ) => {
        if (cmd === 'npm' && args[0] === 'audit') {
          cb(err, '', err.stderr);
        } else {
          cb(null, '', '');
        }
      },
    );
    const result = await reviewSys.executeChecklist('test-change', 'code');
    const item = result.items.find((i) => i.name === '安全扫描通过')!;
    expect(item.passed).toBe(false);
    expect(item.detail).toContain('高危漏洞');
  });
});
