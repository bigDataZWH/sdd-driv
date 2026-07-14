import * as path from 'path';
import { FileSystem, walkDir } from '../utils/file-system.js';
import { StateMachine } from './state-machine.js';
import { CleanCodeChecker } from './clean-code-checker.js';
import { ScriptExec } from '../utils/script-exec.js';
import { DebugGate, DebugGateResult } from './debug-gate.js';

const COVERAGE_PASS_THRESHOLD = 80;
const COVERAGE_WARN_THRESHOLD = 70;
const SCALE_FULL_TASKS = 3;
const SCALE_FULL_FILES = 4;
const SCALE_LIGHT_FILES = 3;

export type VerifyScale = 'light' | 'full';

export interface VerifyResult {
  scale: VerifyScale;
  buildPassed: boolean;
  testsPassed: boolean;
  cleanCodePassed: boolean;
  branchHandled: boolean;
  reportPath: string;
  passed: boolean;
  debugGateEnforced?: boolean;
  investigateGuidance?: string;
  coveragePassed?: boolean;
  coverageSkipped?: boolean;
  coverageSummary?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  lintPassed?: boolean;
  typeCheckPassed?: boolean;
}

export class VerifyService {
  private fs: FileSystem;
  private stateMachine: StateMachine;
  private cleanCodeChecker: CleanCodeChecker;
  private scriptExec: ScriptExec;
  private root: string;
  private debugGate: DebugGate;
  private configCache: { data: any; mtime: number } | null = null;

  constructor(
    fs: FileSystem,
    stateMachine: StateMachine,
    cleanCodeChecker: CleanCodeChecker,
    scriptExec: ScriptExec,
    root: string,
    debugGate?: DebugGate,
  ) {
    this.fs = fs;
    this.stateMachine = stateMachine;
    this.cleanCodeChecker = cleanCodeChecker;
    this.scriptExec = scriptExec;
    this.root = root;
    this.debugGate = debugGate ?? new DebugGate();
  }

  async assessScale(changeName: string): Promise<VerifyScale> {
    const tasksPath = path.join(this.root, 'openspec', 'changes', changeName, 'tasks.md');
    let tasks: string[] = [];
    try {
      const tasksContent = await this.fs.readFile(tasksPath);
      tasks = tasksContent.split('\n').filter((l) => l.includes('- [ ]'));
    } catch (err) {
      console.warn(`[driv] verify: failed to read tasks: ${(err as Error).message}`);
      tasks = [];
    }

    const changeDir = path.join(this.root, 'openspec', 'changes', changeName);
    let fileCount = 0;
    try {
      const entries = await this.fs.listDir(changeDir);
      fileCount = entries.length;
    } catch (err) {
      console.warn(`[driv] verify: failed to list change dir: ${(err as Error).message}`);
      fileCount = 0;
    }

    let specCount = 0;
    const specsDir = path.join(changeDir, 'specs');
    try {
      const specEntries = await this.fs.listDir(specsDir);
      for (const entry of specEntries) {
        const specDir = path.join(specsDir, entry);
        if ((await this.fs.listDir(specDir)).some((f) => f === 'spec.md')) {
          specCount++;
        }
      }
    } catch (err) {
      console.warn(`[driv] verify: failed to count specs: ${(err as Error).message}`);
      specCount = 0;
    }

    if (tasks.length >= SCALE_FULL_TASKS || fileCount >= SCALE_FULL_FILES || specCount >= 2) {
      return 'full';
    }
    return 'light';
  }

  private async readConfig(changeName: string): Promise<{ buildCmd: string; testCmd: string }> {
    const configPath = path.join(
      this.root,
      'openspec',
      'changes',
      changeName,
      '.driv',
      'config.yaml',
    );
    try {
      const stat = await this.fs.stat(configPath);
      const mtime = stat.mtimeMs;
      if (this.configCache && this.configCache.mtime === mtime) {
        return this.configCache.data;
      }
      const content = await this.fs.readFile(configPath);
      const { parse } = await import('yaml');
      const config = parse(content) as Record<string, unknown>;
      const data = {
        buildCmd: String(config?.buildCmd ?? 'npm run build'),
        testCmd: String(config?.testCmd ?? 'npm test'),
      };
      this.configCache = { data, mtime };
      return data;
    } catch (err) {
      console.warn(`[driv] verify: failed to read config: ${(err as Error).message}`);
      return { buildCmd: 'npm run build', testCmd: 'npm test' };
    }
  }

  async executeBuild(changeName: string): Promise<boolean> {
    const { buildCmd } = await this.readConfig(changeName);
    return this.runCommand(buildCmd);
  }

  async executeTests(changeName: string): Promise<boolean> {
    const { testCmd } = await this.readConfig(changeName);
    return this.runCommand(testCmd);
  }

  private async readCoverage(): Promise<{
    passed: boolean;
    summary?: VerifyResult['coverageSummary'];
  }> {
    try {
      const coveragePath = path.join(this.root, 'coverage', 'coverage-summary.json');
      const content = await this.fs.readFile(coveragePath);
      const data = JSON.parse(content);
      // coverage-summary.json 格式：{ total: { lines: { pct: 80 }, functions: { pct: 82 }, branches: { pct: 70 }, statements: { pct: 80 } } }
      const total = data.total;
      if (!total) return { passed: true };
      const summary = {
        lines: total.lines?.pct ?? 0,
        functions: total.functions?.pct ?? 0,
        branches: total.branches?.pct ?? 0,
        statements: total.statements?.pct ?? 0,
      };
      const passed =
        summary.lines >= COVERAGE_PASS_THRESHOLD &&
        summary.functions >= COVERAGE_PASS_THRESHOLD &&
        summary.branches >= COVERAGE_WARN_THRESHOLD &&
        summary.statements >= COVERAGE_PASS_THRESHOLD;
      return { passed, summary };
    } catch (err) {
      console.warn(`[driv] verify: failed to read coverage: ${(err as Error).message}`);
      return { passed: false };
    }
  }

  async executeLint(): Promise<boolean> {
    const packageJsonPath = path.join(this.root, 'package.json');
    if (!(await this.fs.exists(packageJsonPath))) {
      return true; // 无 package.json，非 TS/Node 项目，跳过
    }
    try {
      const pkg = await this.fs.readJson<{ scripts?: { lint?: string } }>(packageJsonPath);
      if (!pkg.scripts?.lint) {
        return true; // 无 lint script，向后兼容
      }
      return this.runCommand('npm run lint');
    } catch (err) {
      console.warn(`[driv] verify: failed to read lint script: ${(err as Error).message}`);
      return false;
    }
  }

  async executeTypeCheck(): Promise<boolean> {
    const tsconfigPath = path.join(this.root, 'tsconfig.json');
    if (!(await this.fs.exists(tsconfigPath))) {
      return true; // 无 tsconfig.json，非 TS 项目，跳过
    }
    return this.runCommand('npx tsc --noEmit');
  }

  private parseCommand(cmd: string): { command: string; args: string[] } {
    const parts: string[] = [];
    let current = '';
    let inQuote = false;
    for (const ch of cmd) {
      if (ch === '"' || ch === "'") {
        inQuote = !inQuote;
        continue;
      }
      if (ch === ' ' && !inQuote) {
        if (current.length > 0) {
          parts.push(current);
          current = '';
        }
        continue;
      }
      current += ch;
    }
    if (current.length > 0) parts.push(current);
    return { command: parts[0] || '', args: parts.slice(1) };
  }

  private async runCommand(cmd: string): Promise<boolean> {
    const { command, args } = this.parseCommand(cmd);
    if (!command) return true;
    try {
      const result = await this.scriptExec.exec(command, args, { cwd: this.root });
      return result.exitCode === 0;
    } catch (err) {
      console.warn(`[driv] verify: failed to run command: ${(err as Error).message}`);
      return false;
    }
  }

  async verify(changeName: string): Promise<VerifyResult> {
    const scale = await this.assessScale(changeName);
    const buildPassed = await this.executeBuild(changeName);
    const testsPassed = await this.executeTests(changeName);

    let cleanCodePassed = true;
    const cleanCodeIssues: { file: string; issue: string }[] = [];
    try {
      const srcDir = path.join(this.root, 'src');
      const files = await walkDir(srcDir);
      for (const file of files) {
        if (file.endsWith('.ts')) {
          const content = await this.fs.readFile(file);
          const result = await this.cleanCodeChecker.check(content, file);
          if (!result.passed) {
            cleanCodePassed = false;
            cleanCodeIssues.push({ file, issue: result.issues?.join('; ') || 'failed' });
          }
        }
      }
    } catch (err) {
      console.warn(`[driv] verify: failed to check clean code: ${(err as Error).message}`);
      cleanCodePassed = false;
    }

    // 覆盖率收集（light 模式跳过 coverage 检查）
    const coverageSkipped = scale === 'light';
    const coverage = coverageSkipped ? { passed: true } : await this.readCoverage();

    // lint + typecheck（新增）
    const lintPassed = await this.executeLint();
    const typeCheckPassed = await this.executeTypeCheck();

    await this.writeCleanCodeArtifacts(changeName, cleanCodePassed, cleanCodeIssues);

    const branchHandled = false;
    const passed =
      buildPassed &&
      testsPassed &&
      cleanCodePassed &&
      coverage.passed &&
      lintPassed &&
      typeCheckPassed;

    const result: VerifyResult = {
      scale,
      buildPassed,
      testsPassed,
      cleanCodePassed,
      branchHandled,
      reportPath: '',
      passed,
      coveragePassed: coverage.passed,
      coverageSkipped,
      coverageSummary: coverage.summary,
      lintPassed,
      typeCheckPassed,
    };

    let debugGateResult: DebugGateResult | undefined;
    if (!passed) {
      debugGateResult = this.debugGate.enforce('verify', passed);
      // 将 debugGate 信息写入验证结果
      result.debugGateEnforced = debugGateResult.enforced;
      result.investigateGuidance = debugGateResult.investigateGuidance;
    }

    const reportPath = await this.generateReport(changeName, result);
    result.reportPath = reportPath;

    await this.stateMachine.setField(changeName, 'verifyResult', passed ? 'pass' : 'fail');
    await this.stateMachine.setField(
      changeName,
      'phases.verify.status',
      passed ? 'completed' : 'failed',
    );

    return result;
  }

  async generateReport(changeName: string, result: VerifyResult): Promise<string> {
    const reportsDir = path.join(this.root, 'openspec', 'changes', changeName, 'reports');
    await this.fs.ensureDir(reportsDir);
    const reportPath = path.join(reportsDir, 'verification-report.md');

    const lines: string[] = [];
    lines.push('# 验证报告');
    lines.push('');
    lines.push(`- **变更**: ${changeName}`);
    lines.push(`- **规模**: ${result.scale}`);
    lines.push(`- **时间**: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('## 检查结果');
    lines.push('');
    lines.push('| 检查项 | 状态 |');
    lines.push('|---|---|');
    lines.push(`| 构建 | ${result.buildPassed ? '✅ 通过' : '❌ 失败'} |`);
    lines.push(`| 测试 | ${result.testsPassed ? '✅ 通过' : '❌ 失败'} |`);
    lines.push(`| Clean Code | ${result.cleanCodePassed ? '✅ 通过' : '❌ 失败'} |`);
    const coverageStatus = result.coverageSkipped
      ? '⏭️ 跳过'
      : result.coveragePassed
        ? '✅ 通过'
        : '❌ 未达标';
    lines.push(
      `| 测试覆盖率 | ${coverageStatus} ${
        result.coverageSummary ? `(${result.coverageSummary.lines}% lines)` : ''
      } |`,
    );
    lines.push(`| Lint 检查 | ${result.lintPassed ? '✅ 通过' : '❌ 失败'} |`);
    lines.push(`| 类型检查 | ${result.typeCheckPassed ? '✅ 通过' : '❌ 失败'} |`);
    lines.push(`| 分支处理 | ${result.branchHandled ? '✅ 已处理' : '⚠️ 未处理'} |`);
    lines.push('');
    lines.push('## 结论');
    lines.push('');
    lines.push(result.passed ? '✅ **验证通过**' : '❌ **验证未通过**');

    if (result.debugGateEnforced && result.investigateGuidance) {
      lines.push('');
      lines.push('## DebugGate 侧路径（investigate 指引）');
      lines.push('');
      lines.push(`- **enforced**: true`);
      lines.push(`- **指引**: ${result.investigateGuidance}`);
    }

    await this.fs.writeFile(reportPath, lines.join('\n'));
    return reportPath;
  }

  private async writeCleanCodeArtifacts(
    changeName: string,
    passed: boolean,
    issues: { file: string; issue: string }[],
  ): Promise<void> {
    const reportsDir = path.join(this.root, 'openspec', 'changes', changeName, 'reports');
    await this.fs.ensureDir(reportsDir);

    const reportLines: string[] = [
      '# Clean Code 检查报告',
      '',
      `- **结果**: ${passed ? '✅ 通过' : '❌ 失败'}`,
      `- **时间**: ${new Date().toISOString()}`,
      `- **问题数**: ${issues.length}`,
      '',
    ];
    if (issues.length > 0) {
      reportLines.push('## 问题列表', '');
      for (const issue of issues) {
        reportLines.push(`- \`${issue.file}\`: ${issue.issue}`);
      }
    }
    await this.fs.writeFile(path.join(reportsDir, 'clean-code-report.md'), reportLines.join('\n'));
    await this.fs.writeFile(
      path.join(reportsDir, 'clean-code-issues.json'),
      JSON.stringify(issues, null, 2),
    );
  }
}
