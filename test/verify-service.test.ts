import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('VerifyService', () => {
  let tmpDir: string;
  let FileSystem: any;
  let StateMachine: any;
  let YamlParser: any;
  let PathResolver: any;
  let CleanCodeChecker: any;
  let ScriptExec: any;
  let VerifyService: any;

  let fsImpl: any;
  let stateMachine: any;
  let cleanCodeChecker: any;
  let scriptExec: any;
  let verifyService: any;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-verify-test-'));

    const fsModule = await import('../src/utils/file-system.js');
    const smModule = await import('../src/core/state-machine.js');
    const parserModule = await import('../src/utils/yaml-parser.js');
    const resolverModule = await import('../src/core/path-resolver.js');
    const cccModule = await import('../src/core/clean-code-checker.js');
    const seModule = await import('../src/utils/script-exec.js');
    const vsModule = await import('../src/core/verify-service.js');

    FileSystem = fsModule.FileSystem;
    StateMachine = smModule.StateMachine;
    YamlParser = parserModule.YamlParser;
    PathResolver = resolverModule.PathResolver;
    CleanCodeChecker = cccModule.CleanCodeChecker;
    ScriptExec = seModule.ScriptExec;
    VerifyService = vsModule.VerifyService;

    fsImpl = new FileSystem(tmpDir);
    const parser = new YamlParser(fsImpl);
    const resolver = new PathResolver(tmpDir);
    stateMachine = new StateMachine(fsImpl, parser, resolver);
    cleanCodeChecker = new CleanCodeChecker();
    scriptExec = new ScriptExec();
    verifyService = new VerifyService(fsImpl, stateMachine, cleanCodeChecker, scriptExec, tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('3.1 assessScale', () => {
    it('返回 light 当任务少于 3 个且文件少于 4 个', async () => {
      const changeName = 'test-light';
      const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n', 'utf-8');

      const scale = await verifyService.assessScale(changeName);
      expect(scale).toBe('light');
    });

    it('返回 full 当任务达到 3 个', async () => {
      const changeName = 'test-full-tasks';
      const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(
        path.join(changeDir, 'tasks.md'),
        ['- [ ] Task 1', '- [ ] Task 2', '- [ ] Task 3'].join('\n') + '\n',
        'utf-8',
      );

      const scale = await verifyService.assessScale(changeName);
      expect(scale).toBe('full');
    });

    it('返回 full 当文件达到 4 个（含 tasks.md）', async () => {
      const changeName = 'test-full-files';
      const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n', 'utf-8');
      fs.writeFileSync(path.join(changeDir, 'file1.ts'), '', 'utf-8');
      fs.writeFileSync(path.join(changeDir, 'file2.ts'), '', 'utf-8');
      fs.writeFileSync(path.join(changeDir, 'file3.ts'), '', 'utf-8');

      const scale = await verifyService.assessScale(changeName);
      expect(scale).toBe('full');
    });

    it('返回 full 当 spec 达到 2 个', async () => {
      const changeName = 'test-full-specs';
      const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
      fs.mkdirSync(path.join(changeDir, 'specs', 'auth'), { recursive: true });
      fs.mkdirSync(path.join(changeDir, 'specs', 'api'), { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n', 'utf-8');
      fs.writeFileSync(path.join(changeDir, 'specs', 'auth', 'spec.md'), '# Auth', 'utf-8');
      fs.writeFileSync(path.join(changeDir, 'specs', 'api', 'spec.md'), '# API', 'utf-8');

      const scale = await verifyService.assessScale(changeName);
      expect(scale).toBe('full');
    });
  });

  describe('3.2 executeBuild/executeTests', () => {
    async function setupChangeWithConfig(
      changeName: string,
      buildCmd: string,
      testCmd: string,
    ): Promise<string> {
      const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
      fs.mkdirSync(changeDir, { recursive: true });
      const configDir = path.join(changeDir, '.driv');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.yaml'),
        `buildCmd: ${buildCmd}\ntestCmd: ${testCmd}\n`,
        'utf-8',
      );
      return changeDir;
    }

    it('构建成功返回 true', async () => {
      await setupChangeWithConfig('build-ok', 'node -e process.exit(0)', 'node -e process.exit(0)');
      const result = await verifyService.executeBuild('build-ok');
      expect(result).toBe(true);
    });

    it('构建失败返回 false', async () => {
      await setupChangeWithConfig(
        'build-fail',
        'node -e process.exit(1)',
        'node -e process.exit(0)',
      );
      const result = await verifyService.executeBuild('build-fail');
      expect(result).toBe(false);
    });

    it('测试成功返回 true', async () => {
      await setupChangeWithConfig('test-ok', 'node -e process.exit(0)', 'node -e process.exit(0)');
      const result = await verifyService.executeTests('test-ok');
      expect(result).toBe(true);
    });

    it('测试失败返回 false', async () => {
      await setupChangeWithConfig(
        'test-fail',
        'node -e process.exit(0)',
        'node -e process.exit(1)',
      );
      const result = await verifyService.executeTests('test-fail');
      expect(result).toBe(false);
    });

    it('无配置时使用默认命令', async () => {
      const changeName = 'no-config';
      const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n', 'utf-8');

      const result = await verifyService.executeBuild(changeName);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('3.5 generateReport', () => {
    it('生成包含所有章节的 markdown 报告', async () => {
      const changeName = 'test-report';
      const result = {
        scale: 'light' as const,
        buildPassed: true,
        testsPassed: true,
        cleanCodePassed: true,
        branchHandled: true,
        reportPath: '',
        passed: true,
      };
      const reportPath = await verifyService.generateReport(changeName, result);
      const content = fs.readFileSync(reportPath, 'utf-8');

      expect(content).toContain('验证报告');
      expect(content).toContain('变更');
      expect(content).toContain('规模');
      expect(content).toContain('检查结果');
      expect(content).toContain('结论');
    });

    it('报告路径包含 reports/verification-report.md', async () => {
      const changeName = 'test-report-path';
      const result = {
        scale: 'full' as const,
        buildPassed: false,
        testsPassed: false,
        cleanCodePassed: false,
        branchHandled: false,
        reportPath: '',
        passed: false,
      };
      const reportPath = await verifyService.generateReport(changeName, result);
      expect(reportPath).toContain('reports');
      expect(reportPath).toContain('verification-report.md');
    });

    it('VerifyResult 的 reportPath 与 generateReport 返回值一致', async () => {
      const changeName = 'test-verify-path';
      const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n', 'utf-8');
      const configDir = path.join(changeDir, '.driv');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.yaml'),
        'buildCmd: node -e process.exit(0)\ntestCmd: node -e process.exit(0)\n',
        'utf-8',
      );
      await stateMachine.initChange(changeName);

      const result = await verifyService.verify(changeName);
      expect(result.reportPath).toContain('reports');
      expect(result.reportPath).toContain('verification-report.md');
    });
  });

  describe('3.3-3.6 verify 完整流程', () => {
    async function setupFullVerifyChange(
      changeName: string,
      buildPass: boolean,
      testPass: boolean,
    ): Promise<string> {
      const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n', 'utf-8');
      const configDir = path.join(changeDir, '.driv');
      fs.mkdirSync(configDir, { recursive: true });
      const buildCode = buildPass ? '0' : '1';
      const testCode = testPass ? '0' : '1';
      fs.writeFileSync(
        path.join(configDir, 'config.yaml'),
        `buildCmd: node -e process.exit(${buildCode})\ntestCmd: node -e process.exit(${testCode})\n`,
        'utf-8',
      );
      await stateMachine.initChange(changeName);
      return changeDir;
    }

    it('全部通过时返回正确 VerifyResult', async () => {
      await setupFullVerifyChange('verify-all-pass', true, true);

      const result = await verifyService.verify('verify-all-pass');

      expect(result.scale).toBe('light');
      expect(result.buildPassed).toBe(true);
      expect(result.testsPassed).toBe(true);
      expect(result.cleanCodePassed).toBe(true);
      expect(result.reportPath).toContain('verification-report.md');
      expect(result.passed).toBe(true);
    });

    it('构建失败时 passed 为 false', async () => {
      await setupFullVerifyChange('verify-build-fail', false, true);

      const result = await verifyService.verify('verify-build-fail');

      expect(result.buildPassed).toBe(false);
      expect(result.passed).toBe(false);
    });

    it('测试失败时 passed 为 false', async () => {
      await setupFullVerifyChange('verify-test-fail', true, false);

      const result = await verifyService.verify('verify-test-fail');

      expect(result.testsPassed).toBe(false);
      expect(result.passed).toBe(false);
    });

    it('更新 .driv.yaml 状态（verifyResult 和 phases.verify）', async () => {
      await setupFullVerifyChange('verify-state', true, true);

      await verifyService.verify('verify-state');

      const state = await stateMachine.getState('verify-state');
      expect(state.verifyResult).toBe('pass');
      expect(state.phases.verify.status).toBe('completed');
    });

    it('验证失败时更新状态为 failed', async () => {
      await setupFullVerifyChange('verify-state-fail', true, false);

      await verifyService.verify('verify-state-fail');

      const state = await stateMachine.getState('verify-state-fail');
      expect(state.verifyResult).toBe('fail');
      expect(state.phases.verify.status).toBe('failed');
    });

    it('生成报告文件', async () => {
      await setupFullVerifyChange('verify-report-file', true, true);

      const result = await verifyService.verify('verify-report-file');
      expect(fs.existsSync(result.reportPath)).toBe(true);
    });

    it('生成 Clean Code 报告和 issue 文件', async () => {
      await setupFullVerifyChange('verify-clean-code', true, true);

      await verifyService.verify('verify-clean-code');

      const reportsDir = path.join(tmpDir, 'openspec', 'changes', 'verify-clean-code', 'reports');
      expect(fs.existsSync(path.join(reportsDir, 'clean-code-report.md'))).toBe(true);
      expect(fs.existsSync(path.join(reportsDir, 'clean-code-issues.json'))).toBe(true);
    });

    it('验证失败时 result.debugGateEnforced === true', async () => {
      await setupFullVerifyChange('verify-debuggate-fail', true, false);

      const result = await verifyService.verify('verify-debuggate-fail');

      expect(result.passed).toBe(false);
      expect(result.debugGateEnforced).toBe(true);
    });

    it('验证失败时 result.investigateGuidance 非空', async () => {
      await setupFullVerifyChange('verify-debuggate-guidance', false, true);

      const result = await verifyService.verify('verify-debuggate-guidance');

      expect(result.passed).toBe(false);
      expect(result.investigateGuidance).toBeTruthy();
      expect(typeof result.investigateGuidance).toBe('string');
      expect(result.investigateGuidance!.length).toBeGreaterThan(0);
    });

    it('验证通过时 result.debugGateEnforced 为 false 或 undefined', async () => {
      await setupFullVerifyChange('verify-debuggate-pass', true, true);

      const result = await verifyService.verify('verify-debuggate-pass');

      expect(result.passed).toBe(true);
      expect(result.debugGateEnforced === false || result.debugGateEnforced === undefined).toBe(true);
    });

    it('验证失败时报告中包含 investigate 指引', async () => {
      await setupFullVerifyChange('verify-debuggate-report', true, false);

      const result = await verifyService.verify('verify-debuggate-report');

      expect(result.reportPath).toBeTruthy();
      const content = fs.readFileSync(result.reportPath, 'utf-8');
      expect(content).toContain('DebugGate');
      expect(content).toContain('investigate');
    });
  });

  describe('parseCommand', () => {
    it('解析带引号的参数为整体', async () => {
      const result = verifyService.parseCommand('node -e "process.exit(0)"');
      expect(result.command).toBe('node');
      expect(result.args).toEqual(['-e', 'process.exit(0)']);
    });

    it('解析无引号的简单命令', async () => {
      const result = verifyService.parseCommand('npm run build');
      expect(result.command).toBe('npm');
      expect(result.args).toEqual(['run', 'build']);
    });

    it('处理空命令', async () => {
      const result = verifyService.parseCommand('');
      expect(result.command).toBe('');
      expect(result.args).toEqual([]);
    });
  });

  describe('Task 3+4: 覆盖率 + lint + typecheck 集成', () => {
    async function setupPassingChange(changeName: string): Promise<string> {
      const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n', 'utf-8');
      const configDir = path.join(changeDir, '.driv');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.yaml'),
        'buildCmd: node -e process.exit(0)\ntestCmd: node -e process.exit(0)\n',
        'utf-8',
      );
      await stateMachine.initChange(changeName);
      return changeDir;
    }

    function writeCoverage(data: object): void {
      const coverageDir = path.join(tmpDir, 'coverage');
      fs.mkdirSync(coverageDir, { recursive: true });
      fs.writeFileSync(
        path.join(coverageDir, 'coverage-summary.json'),
        JSON.stringify(data),
        'utf-8',
      );
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('覆盖率（Task 3）', () => {
      it('coverage 文件存在且达标 → coveragePassed=true, coverageSummary 填充', async () => {
        await setupPassingChange('cov-pass');
        writeCoverage({
          total: {
            lines: { pct: 90 },
            functions: { pct: 90 },
            branches: { pct: 80 },
            statements: { pct: 90 },
          },
        });

        const result = await verifyService.verify('cov-pass');

        expect(result.coveragePassed).toBe(true);
        expect(result.coverageSummary).toBeDefined();
        expect(result.coverageSummary?.lines).toBe(90);
        expect(result.coverageSummary?.functions).toBe(90);
        expect(result.coverageSummary?.branches).toBe(80);
        expect(result.coverageSummary?.statements).toBe(90);
      });

      it('coverage 文件存在但不达标（lines 70%）→ coveragePassed=false, passed=false', async () => {
        await setupPassingChange('cov-fail');
        writeCoverage({
          total: {
            lines: { pct: 70 },
            functions: { pct: 90 },
            branches: { pct: 80 },
            statements: { pct: 90 },
          },
        });

        const result = await verifyService.verify('cov-fail');

        expect(result.coveragePassed).toBe(false);
        expect(result.passed).toBe(false);
      });

      it('coverage 文件不存在 → coveragePassed=true（向后兼容）, coverageSummary undefined', async () => {
        await setupPassingChange('cov-missing');

        const result = await verifyService.verify('cov-missing');

        expect(result.coveragePassed).toBe(true);
        expect(result.coverageSummary).toBeUndefined();
      });
    });

    describe('lint（Task 4）', () => {
      it('有 lint script 且通过 → lintPassed=true', async () => {
        fs.writeFileSync(
          path.join(tmpDir, 'package.json'),
          JSON.stringify({ scripts: { lint: 'eslint src/' } }),
          'utf-8',
        );
        vi.spyOn(verifyService as any, 'runCommand').mockResolvedValue(true);

        const result = await verifyService.executeLint();

        expect(result).toBe(true);
      });

      it('有 lint script 且失败 → lintPassed=false, passed=false', async () => {
        await setupPassingChange('lint-fail');
        fs.writeFileSync(
          path.join(tmpDir, 'package.json'),
          JSON.stringify({ scripts: { lint: 'eslint src/' } }),
          'utf-8',
        );
        vi.spyOn(verifyService as any, 'runCommand').mockImplementation((cmd: string) => {
          if (cmd === 'npm run lint') return Promise.resolve(false);
          return Promise.resolve(true);
        });

        const result = await verifyService.verify('lint-fail');

        expect(result.lintPassed).toBe(false);
        expect(result.passed).toBe(false);
      });

      it('无 lint script → lintPassed=true（向后兼容）', async () => {
        // tmpDir 中无 package.json
        const result = await verifyService.executeLint();
        expect(result).toBe(true);
      });
    });

    describe('typecheck（Task 4）', () => {
      it('有 tsconfig.json 且 typecheck 通过 → typeCheckPassed=true', async () => {
        fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}', 'utf-8');
        vi.spyOn(verifyService as any, 'runCommand').mockResolvedValue(true);

        const result = await verifyService.executeTypeCheck();

        expect(result).toBe(true);
      });

      it('有 tsconfig.json 且 typecheck 失败 → typeCheckPassed=false, passed=false', async () => {
        await setupPassingChange('tc-fail');
        fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}', 'utf-8');
        vi.spyOn(verifyService as any, 'runCommand').mockImplementation((cmd: string) => {
          if (cmd === 'npx tsc --noEmit') return Promise.resolve(false);
          return Promise.resolve(true);
        });

        const result = await verifyService.verify('tc-fail');

        expect(result.typeCheckPassed).toBe(false);
        expect(result.passed).toBe(false);
      });

      it('无 tsconfig.json → typeCheckPassed=true（向后兼容）', async () => {
        // tmpDir 中无 tsconfig.json
        const result = await verifyService.executeTypeCheck();
        expect(result).toBe(true);
      });
    });

    describe('报告生成', () => {
      it('验证报告包含"测试覆盖率"、"Lint 检查"、"类型检查"三行', async () => {
        await setupPassingChange('report-rows');

        const result = await verifyService.verify('report-rows');

        const content = fs.readFileSync(result.reportPath, 'utf-8');
        expect(content).toContain('测试覆盖率');
        expect(content).toContain('Lint 检查');
        expect(content).toContain('类型检查');
      });
    });
  });
});
