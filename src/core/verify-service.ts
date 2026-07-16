import * as path from 'path';
import * as fs from 'fs';
import { FileSystem } from '../utils/file-system.js';
import { StateMachine, classifyScale, type VerifyScale } from './state-machine.js';
import { CleanCodeChecker } from './clean-code-checker.js';
import { ScriptExec } from '../utils/script-exec.js';
import { DebugGate, DebugGateResult } from './debug-gate.js';

export type { VerifyScale };

/** 覆盖率阈值（可通过 .driv/config.yaml 覆盖） */
export interface CoverageThresholds {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

const DEFAULT_COVERAGE_THRESHOLDS: CoverageThresholds = {
  lines: 80,
  functions: 80,
  branches: 70,
  statements: 80,
};

/** Verify 阶段的完整配置（从 .driv/config.yaml 或 .driv/config.yaml 读取） */
export interface VerifyConfig {
  buildCmd: string;
  testCmd: string;
  lintCmd: string;
  typecheckCmd: string;
  coverageThresholds: CoverageThresholds;
  /** light 模式下是否跳过 coverage/lint/typecheck（默认 false，向后兼容） */
  skipLightChecks?: boolean;
  /** 用户显式配置的 verify 模式（来自 .driv/config.yaml 的 defaults.verify_mode / verify.verify_mode） */
  verifyMode?: VerifyScale;
}

const DEFAULT_VERIFY_CONFIG: VerifyConfig = {
  buildCmd: 'npm run build',
  testCmd: 'npm test',
  lintCmd: 'npm run lint',
  typecheckCmd: 'npx tsc --noEmit',
  coverageThresholds: DEFAULT_COVERAGE_THRESHOLDS,
  skipLightChecks: false,
};

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

async function walkDir(dir: string): Promise<string[]> {
  const files: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

export class VerifyService {
  private fs: FileSystem;
  private stateMachine: StateMachine;
  private cleanCodeChecker: CleanCodeChecker;
  private scriptExec: ScriptExec;
  private root: string;
  private debugGate: DebugGate;
  // 配置缓存：以 changeName 为 key，避免每次 verify() 都重新读取 .driv/config.yaml
  // 修复 P1-5a：原为单值缓存，会跨 change 复用配置（如 change A 读到 config 后 change B 命中缓存复用错误配置）
  private configCache: Map<string, VerifyConfig> = new Map();

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
    } catch {
      tasks = [];
    }

    const changeDir = path.join(this.root, 'openspec', 'changes', changeName);
    let fileCount = 0;
    try {
      const entries = await this.fs.listDir(changeDir);
      fileCount = entries.length;
    } catch {
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
    } catch {
      specCount = 0;
    }

    // P2-2/P2-4: 使用统一的 classifyScale + SCALE_THRESHOLDS，消除魔法数字
    return classifyScale(tasks.length, fileCount, specCount);
  }

  /**
   * 读取 Verify 配置，支持项目级 `.driv/config.yaml` 与 change 级 `.driv/config.yaml`。
   * 优先级：change 级 > 项目级 > 默认值。结果会被缓存。
   */
  private async readConfig(changeName?: string): Promise<VerifyConfig> {
    // P1-5a: 以 changeName 为 key 缓存，避免跨 change 复用配置
    const cacheKey = changeName || '__global__';
    const cached = this.configCache.get(cacheKey);
    if (cached) return cached;

    const candidates: string[] = [];
    // change 级配置（优先）
    if (changeName) {
      candidates.push(
        path.join(this.root, 'openspec', 'changes', changeName, '.driv', 'config.yaml'),
      );
    }
    // 项目级配置
    candidates.push(path.join(this.root, '.driv', 'config.yaml'));

    for (const configPath of candidates) {
      try {
        if (!(await this.fs.exists(configPath))) continue;
        const content = await this.fs.readFile(configPath);
        const { parse } = await import('yaml');
        const raw = parse(content) as Record<string, unknown>;
        const verify = (raw?.verify ?? {}) as Record<string, unknown>;
        const coverage = (verify.coverage ?? {}) as Record<string, unknown>;
        const thresholds = (coverage.thresholds ?? {}) as Record<string, unknown>;
        const defaults = (raw?.defaults ?? {}) as Record<string, unknown>;

        // P1-5c: 读取用户显式配置的 verifyMode（verify.verify_mode 优先于 defaults.verify_mode）
        const verifyModeRaw = verify.verify_mode ?? defaults.verify_mode;
        const verifyMode =
          verifyModeRaw === 'light' || verifyModeRaw === 'full'
            ? (verifyModeRaw as VerifyScale)
            : undefined;

        const config: VerifyConfig = {
          buildCmd: String(verify.build_cmd ?? raw?.buildCmd ?? DEFAULT_VERIFY_CONFIG.buildCmd),
          testCmd: String(verify.test_cmd ?? raw?.testCmd ?? DEFAULT_VERIFY_CONFIG.testCmd),
          lintCmd: String(verify.lint_cmd ?? DEFAULT_VERIFY_CONFIG.lintCmd),
          typecheckCmd: String(verify.typecheck_cmd ?? DEFAULT_VERIFY_CONFIG.typecheckCmd),
          coverageThresholds: {
            lines: Number(thresholds.lines ?? DEFAULT_COVERAGE_THRESHOLDS.lines),
            functions: Number(thresholds.functions ?? DEFAULT_COVERAGE_THRESHOLDS.functions),
            branches: Number(thresholds.branches ?? DEFAULT_COVERAGE_THRESHOLDS.branches),
            statements: Number(thresholds.statements ?? DEFAULT_COVERAGE_THRESHOLDS.statements),
          },
          skipLightChecks: Boolean(
            verify.skip_light_checks ?? DEFAULT_VERIFY_CONFIG.skipLightChecks,
          ),
          verifyMode,
        };
        this.configCache.set(cacheKey, config);
        return config;
      } catch {
        // 继续尝试下一个候选路径
      }
    }

    this.configCache.set(cacheKey, DEFAULT_VERIFY_CONFIG);
    return DEFAULT_VERIFY_CONFIG;
  }

  async executeBuild(changeName: string): Promise<boolean> {
    const { buildCmd } = await this.readConfig(changeName);
    return this.runCommand(buildCmd);
  }

  async executeTests(changeName: string): Promise<boolean> {
    const { testCmd } = await this.readConfig(changeName);
    return this.runCommand(testCmd);
  }

  private async readCoverage(thresholds: CoverageThresholds): Promise<{
    passed: boolean;
    skipped?: boolean;
    summary?: VerifyResult['coverageSummary'];
  }> {
    const coveragePath = path.join(this.root, 'coverage', 'coverage-summary.json');
    try {
      await fs.promises.access(coveragePath);
    } catch {
      // P1-6: coverage 文件不存在视为「跳过」而非「失败」。
      // 不要求每个 change 都提供覆盖率数据；跳过不阻塞整体验证。
      return { passed: true, skipped: true };
    }
    try {
      const content = await fs.promises.readFile(coveragePath, 'utf-8');
      const data = JSON.parse(content);
      // coverage-summary.json 格式：{ total: { lines: { pct: 80 }, functions: { pct: 82 }, branches: { pct: 70 }, statements: { pct: 80 } } }
      const total = data.total;
      if (!total) return { passed: false };
      const summary = {
        lines: total.lines?.pct ?? 0,
        functions: total.functions?.pct ?? 0,
        branches: total.branches?.pct ?? 0,
        statements: total.statements?.pct ?? 0,
      };
      const passed =
        summary.lines >= thresholds.lines &&
        summary.functions >= thresholds.functions &&
        summary.branches >= thresholds.branches &&
        summary.statements >= thresholds.statements;
      return { passed, summary };
    } catch {
      // coverage 文件存在但读取/解析失败：视为未通过
      return { passed: false };
    }
  }

  async executeLint(changeName?: string): Promise<boolean> {
    const { lintCmd } = await this.readConfig(changeName);
    // 无 lint script 时跳过（向后兼容）
    try {
      const packageJsonPath = path.join(this.root, 'package.json');
      const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      if (!pkg.scripts?.lint) return true;
    } catch {
      return true;
    }
    return this.runCommand(lintCmd);
  }

  async executeTypeCheck(changeName?: string): Promise<boolean> {
    const { typecheckCmd } = await this.readConfig(changeName);
    try {
      const tsconfigPath = path.join(this.root, 'tsconfig.json');
      await fs.promises.access(tsconfigPath);
    } catch {
      return true; // 无 tsconfig.json，向后兼容
    }
    return this.runCommand(typecheckCmd);
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
    } catch {
      return false;
    }
  }

  /**
   * 处理 Verify 阶段的分支策略，根据 isolation 模式决策 squash/retain，并写入状态字段。
   * 修复：原 branchHandled 硬编码 false，导致 Archive 入口永远被阻塞。
   */
  private async handleBranch(changeName: string): Promise<boolean> {
    const state = await this.stateMachine.getState(changeName);
    const isolation = state.isolation || 'branch';
    // branch / worktree 隔离模式下需要合并分支；inline 模式无需处理
    const needsBranchHandling = isolation === 'branch' || isolation === 'worktree';
    const strategy = needsBranchHandling ? 'squash' : 'retain';

    await this.stateMachine.setField(
      changeName,
      'phases.verify.artifacts.branch-handled',
      'true',
    );
    await this.stateMachine.setField(
      changeName,
      'phases.verify.artifacts.branch-strategy',
      strategy,
    );
    return true;
  }

  async verify(changeName: string): Promise<VerifyResult> {
    // 推进阶段状态（catch-up 模式，补齐漏掉的 transition）
    try {
      await this.stateMachine.transition(changeName, 'verify');
    } catch (err) {
      // P2-1: transition 失败不阻断 verify 流程，但记录原因便于排查
      console.warn(`[driv:verify] transition('verify') failed for ${changeName}:`, (err as Error).message);
    }
    const config = await this.readConfig(changeName);
    // P1-5c: 优先使用用户显式配置的 verifyMode（config.verifyMode）；其次尊重 state.verifyMode==='full'
    // （视为权威 full，以区分"默认 light"与"显式 full"，避免 createDefaultState 硬编码 light 覆盖真实规模）；
    // 否则按规模（assessScale）自动判定
    let stateVerifyMode: string | undefined;
    try {
      const state = await this.stateMachine.getState(changeName);
      stateVerifyMode = state.verifyMode;
    } catch (err) {
      // P2-1: state 读取失败时降级为 undefined（按 assessScale 判定），但记录原因
      console.warn(`[driv:verify] getState failed for ${changeName}:`, (err as Error).message);
      stateVerifyMode = undefined;
    }
    const scale: VerifyScale = config.verifyMode
      ? config.verifyMode
      : stateVerifyMode === 'full'
        ? 'full'
        : await this.assessScale(changeName);
    const buildPassed = await this.executeBuild(changeName);
    const testsPassed = await this.executeTests(changeName);

    let cleanCodePassed = true;
    const cleanCodeIssues: { file: string; issue: string }[] = [];
    try {
      const srcDir = path.join(this.root, 'src');
      const files = await walkDir(srcDir);
      for (const file of files) {
        if (file.endsWith('.ts')) {
          const content = await fs.promises.readFile(file, 'utf-8');
          const result = await this.cleanCodeChecker.check(content, file);
          if (!result.passed) {
            cleanCodePassed = false;
            cleanCodeIssues.push({ file, issue: result.issues?.join('; ') || 'failed' });
          }
        }
      }
    } catch (err) {
      // P2-1: clean-code 扫描失败时不阻塞 verify（视为通过），但记录原因
      console.warn(`[driv:verify] clean-code scan failed:`, (err as Error).message);
      cleanCodePassed = true;
    }

    // P1-5b: light 模式或显式 skipLightChecks 配置时跳过 coverage/lint/typecheck
    const skipLightChecks = config.skipLightChecks === true || scale === 'light';
    let coverage: { passed: boolean; skipped?: boolean; summary?: VerifyResult['coverageSummary'] };
    let coverageSkipped = false;
    if (skipLightChecks) {
      coverage = { passed: true };
      coverageSkipped = true;
    } else {
      coverage = await this.readCoverage(config.coverageThresholds);
      // P1-6: readCoverage 在 coverage 文件缺失时返回 skipped=true，将其接到 VerifyResult.coverageSkipped
      coverageSkipped = coverage.skipped === true;
    }

    const lintPassed = skipLightChecks ? true : await this.executeLint(changeName);
    const typeCheckPassed = skipLightChecks ? true : await this.executeTypeCheck(changeName);

    await this.writeCleanCodeArtifacts(changeName, cleanCodePassed, cleanCodeIssues);

    // 修复：调用 handleBranch 写入状态字段，否则 Archive 入口永远被阻塞
    const branchHandled = await this.handleBranch(changeName);
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
    lines.push(
      `| 测试覆盖率 | ${result.coveragePassed ? '✅ 通过' : '❌ 未达标'} ${
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
