import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
});
