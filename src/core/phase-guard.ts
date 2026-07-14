import { Phase, ChangeState } from './types.js';
import { DirtyWorktreeChecker } from './dirty-worktree.js';
import { HandoffManager } from './handoff-manager.js';
import { FileSystem } from '../utils/file-system.js';
import { SchemaRegistry } from './schema-registry.js';
import { validateEARS } from './ears-validator.js';
import type { TemplateManager } from './template-manager.js';
import * as path from 'path';

export type ReviewType = 'requirement' | 'technical' | 'code';

export interface GuardFailure {
  check: string;
  expected: string;
  actual: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface GuardResult {
  phase: Phase;
  direction: 'entry' | 'exit';
  passed: boolean;
  failures: GuardFailure[];
}

export interface PhaseGuard {
  checkEntry(phase: Phase, state: ChangeState): Promise<GuardResult>;
  checkExit(phase: Phase, state: ChangeState): Promise<GuardResult>;
  applyTransition(
    from: Phase,
    to: Phase,
    state: ChangeState,
    stateMachine: any,
  ): Promise<GuardResult>;
}

function succeed(phase: Phase, direction: 'entry' | 'exit'): GuardResult {
  return { phase, direction, passed: true, failures: [] };
}

function buildResult(
  phase: Phase,
  direction: 'entry' | 'exit',
  failures: GuardFailure[],
): GuardResult {
  // passed 仅由 error 级 failure 决定，warning 级（advisory）不阻断
  const hasError = failures.some((f) => f.severity === 'error');
  return { phase, direction, passed: !hasError, failures };
}

function fail(
  check: string,
  expected: string,
  actual: string,
  severity: 'error' | 'warning',
  message: string,
): GuardFailure {
  return { check, expected, actual, severity, message };
}

const REVIEW_PASSED = 'passed';

export class PhaseGuardImpl implements PhaseGuard {
  constructor(
    private dirtyWorktree?: DirtyWorktreeChecker,
    private handoffManager?: HandoffManager,
    private fs?: FileSystem,
    private schemaRegistry?: SchemaRegistry,
    private templateManager?: TemplateManager,
  ) {}

  private resolvePath(p: string): string {
    if (!this.fs) return p;
    return path.isAbsolute(p) ? p : path.join(this.fs.root, p);
  }

  async checkEntry(phase: Phase, state: ChangeState): Promise<GuardResult> {
    switch (phase) {
      case 'design':
        return this.checkDesignEntry(state);
      case 'build':
        return await this.checkBuildEntry(state);
      case 'verify':
        return this.checkVerifyEntry(state);
      case 'archive':
        return this.checkArchiveEntry(state);
      default:
        return succeed(phase, 'entry');
    }
  }

  private checkDesignEntry(state: ChangeState): GuardResult {
    const failures: GuardFailure[] = [];
    if (state.phase !== 'design') {
      failures.push(fail('phase_is_design', 'design', state.phase, 'error', '当前阶段不是 design'));
    }
    if (state.phases.clarify.status !== 'completed') {
      failures.push(
        fail(
          'clarify_completed',
          'completed',
          state.phases.clarify.status,
          'error',
          'Clarify 阶段未完成',
        ),
      );
    }
    if (!state.openspec.proposal) {
      failures.push(
        fail('proposal_exists', 'proposal 路径已设置', '未设置', 'error', '提案文件缺失'),
      );
    }
    return buildResult('design', 'entry', failures);
  }

  private async checkBuildEntry(state: ChangeState): Promise<GuardResult> {
    const failures: GuardFailure[] = [];
    if (state.phase !== 'build') {
      failures.push(fail('phase_is_build', 'build', state.phase, 'error', '当前阶段不是 build'));
    }
    if (state.phases.design.status !== 'completed') {
      failures.push(
        fail(
          'design_completed',
          'completed',
          state.phases.design.status,
          'error',
          'Design 阶段未完成',
        ),
      );
    }
    if (!state.openspec.design) {
      failures.push(
        fail('design_doc_exists', 'design 路径已设置', '未设置', 'error', '设计文档缺失'),
      );
    }
    if (state.hwProcess.technicalReview !== REVIEW_PASSED) {
      failures.push(
        fail(
          'technical_review_passed',
          'passed',
          state.hwProcess.technicalReview,
          'error',
          '技术评审未通过',
        ),
      );
    }
    if (state.phases.design.artifacts.handoff) {
      const mismatchedFiles = await this.validateHandoffHash(state);
      if (mismatchedFiles.length > 0) {
        failures.push(
          fail(
            'handoff_hash_valid',
            'hash 匹配',
            'hash 不匹配',
            'error',
            `Handoff 文件哈希不匹配: ${mismatchedFiles.join(', ')}`,
          ),
        );
      }
      const intentFailure = await this.checkIntentAlignment(state);
      if (intentFailure) {
        failures.push(intentFailure);
      }
    }
    const dirtyResult = this.dirtyWorktree
      ? await this.dirtyWorktree.check(state.change)
      : { dirty: false, changes: [] };
    if (dirtyResult.dirty) {
      failures.push(
        fail('dirty_worktree', '干净工作区', '有未提交变更', 'warning', '工作区存在未提交变更'),
      );
    }
    return buildResult('build', 'entry', failures);
  }

  private checkVerifyEntry(state: ChangeState): GuardResult {
    const failures: GuardFailure[] = [];
    if (state.phase !== 'verify') {
      failures.push(fail('phase_is_verify', 'verify', state.phase, 'error', '当前阶段不是 verify'));
    }
    if (state.phases.build.status !== 'completed') {
      failures.push(
        fail(
          'build_completed',
          'completed',
          state.phases.build.status,
          'error',
          'Build 阶段未完成',
        ),
      );
    }
    if (!state.phases.build.artifacts.committed) {
      failures.push(fail('code_committed', '代码已提交', '未提交', 'error', '代码未提交'));
    }
    if (state.phases.build.artifacts.tests !== 'passed') {
      failures.push(
        fail(
          'tests_passed',
          'passed',
          state.phases.build.artifacts.tests || '未运行',
          'error',
          '测试未通过',
        ),
      );
    }
    if (state.hwProcess.codeReview !== REVIEW_PASSED) {
      failures.push(
        fail('code_review_passed', 'passed', state.hwProcess.codeReview, 'error', '代码评审未通过'),
      );
    }
    return buildResult('verify', 'entry', failures);
  }

  private checkArchiveEntry(state: ChangeState): GuardResult {
    const failures: GuardFailure[] = [];
    if (state.phase !== 'archive') {
      failures.push(
        fail('phase_is_archive', 'archive', state.phase, 'error', '当前阶段不是 archive'),
      );
    }
    if (state.phases.verify.status !== 'completed') {
      failures.push(
        fail(
          'verify_completed',
          'completed',
          state.phases.verify.status,
          'error',
          'Verify 阶段未完成',
        ),
      );
    }
    if (state.verifyResult !== 'pass') {
      failures.push(fail('verify_result_pass', 'pass', state.verifyResult, 'error', '验证未通过'));
    }
    if (!state.phases.verify.artifacts['branch-handled']) {
      failures.push(fail('branch_handled', '分支已处理', '未处理', 'error', '分支未处理'));
    }
    return buildResult('archive', 'entry', failures);
  }

  private async validateHandoffHash(state: ChangeState): Promise<string[]> {
    if (!this.handoffManager) {
      return [];
    }
    return this.handoffManager.getMismatchedFiles(state.change);
  }

  private async checkIntentAlignment(state: ChangeState): Promise<GuardFailure | null> {
    if (!this.handoffManager) {
      return null;
    }
    const handoff = await this.handoffManager.getHandoffPackage(state.change);
    if (!handoff || !handoff.context.intent) {
      return null;
    }
    const intent = handoff.context.intent;
    const designContent = await this.handoffManager.readChangeFile(state.change, 'design.md');
    if (!designContent) {
      return null;
    }
    if (this.intentAligned(designContent, intent)) {
      return null;
    }
    return fail(
      'intent_alignment',
      'design 对齐 intent',
      'design 可能偏离意图',
      'warning',
      `设计文档可能偏离原始意图：${intent}`,
    );
  }

  private intentAligned(designContent: string, intent: string): boolean {
    const keywords = this.extractKeywords(intent);
    if (keywords.length === 0) {
      return true;
    }
    return keywords.some((kw) => designContent.includes(kw));
  }

  private extractKeywords(intent: string): string[] {
    const words = intent
      .split(/[\s,，。.;；:：!！?？()（）\[\]]+/)
      .filter((w) => w.length >= 2);
    return words.slice(0, 5);
  }

  async checkExit(phase: Phase, state: ChangeState): Promise<GuardResult> {
    switch (phase) {
      case 'clarify':
        return await this.checkClarifyExit(state);
      case 'design':
        return this.checkDesignExit(state);
      case 'build':
        return this.checkBuildExit(state);
      case 'verify':
        return this.checkVerifyExit(state);
      case 'archive':
        return this.checkArchiveExit(state);
    }
  }

  async applyTransition(
    from: Phase,
    to: Phase,
    state: ChangeState,
    stateMachine: any,
  ): Promise<GuardResult> {
    const guardResult = await this.checkExit(from, state);
    if (!guardResult.passed) {
      return guardResult;
    }
    if (stateMachine && typeof stateMachine.transition === 'function') {
      await stateMachine.transition(state.change, to);
      if (state.autoTransition) {
        await stateMachine.setField(state.change, 'phase', to);
      }
    }
    return guardResult;
  }

  private async checkClarifyExit(state: ChangeState): Promise<GuardResult> {
    const failures: GuardFailure[] = [];

    if (!state.openspec.proposal) {
      failures.push(
        fail(
          'proposal_exists',
          'proposal 路径已设置',
          '未设置',
          'error',
          '提案文件路径未设置，请先创建 proposal.md',
        ),
      );
    }

    if (!state.openspec.design) {
      failures.push(
        fail(
          'design_doc_exists',
          'design 路径已设置',
          '未设置',
          'error',
          '设计文档路径未设置，请先创建 design.md',
        ),
      );
    }

    if (!state.openspec.specs || state.openspec.specs.length === 0) {
      failures.push(
        fail(
          'specs_created',
          'specs 数组已设置且不为空',
          state.openspec.specs ? '空数组' : '未设置',
          'error',
          'specs 为空数组，请先创建 specs',
        ),
      );
    }

    if (!state.openspec.tasks) {
      failures.push(
        fail(
          'tasks_exists',
          'tasks 路径已设置',
          '未设置',
          'error',
          'tasks 未设置，请先创建 tasks.md',
        ),
      );
    }

    if (state.phases.clarify.status !== 'completed') {
      failures.push(
        fail(
          'proposal_complete',
          'clarify 阶段状态为 completed',
          state.phases.clarify.status,
          'error',
          '提案未完成，请先完成 clarify 阶段',
        ),
      );
    }

    // advisory: SchemaRegistry 校验 proposal（best-effort，不阻断）
    if (this.fs && this.schemaRegistry && state.openspec.proposal) {
      try {
        const content = await this.fs.readFile(this.resolvePath(state.openspec.proposal));
        const parsed = this.schemaRegistry.parseArtifact(content);
        const result = this.schemaRegistry.validate('proposal', parsed);
        if (!result.valid) {
          failures.push(
            fail(
              'proposal-schema-valid',
              'proposal 符合 schema',
              'schema 校验失败',
              'warning',
              `proposal schema 校验失败: ${result.errors?.join('; ') ?? ''}`,
            ),
          );
        }
      } catch {
        // best-effort，文件读取失败不阻断
      }
    }

    // advisory: EARS 句式校验 specs（best-effort，不阻断）
    if (this.fs && state.openspec.specs && state.openspec.specs.length > 0) {
      for (const specsPath of state.openspec.specs) {
        try {
          const resolvedSpecsPath = this.resolvePath(specsPath);
          if (await this.fs.exists(resolvedSpecsPath)) {
            const specContent = await this.fs.readFile(resolvedSpecsPath);
            const earsResult = validateEARS(specContent);
            if (!earsResult.valid) {
              failures.push(
                fail(
                  'ears-syntax',
                  'spec 符合 EARS 句式',
                  '存在不符合 EARS 的语句',
                  'warning',
                  `EARS 句式建议 (${specsPath}): ${earsResult.issues.join('; ')}`,
                ),
              );
            }
          }
        } catch {
          // best-effort
        }
      }
    }

    // advisory: proposal 章节结构校验（best-effort，不阻断）
    if (state.openspec.proposal && this.templateManager && this.fs) {
      try {
        const proposalPath = this.resolvePath(state.openspec.proposal);
        if (await this.fs.exists(proposalPath)) {
          const content = await this.fs.readFile(proposalPath);
          const requiredSections = await this.templateManager.getRequiredSections(
            'proposal',
            'default',
          );
          for (const section of requiredSections) {
            if (!content.includes(`## ${section}`)) {
              failures.push(
                fail(
                  `proposal_section_${section}`,
                  `proposal 包含章节: ${section}`,
                  '缺失',
                  'warning',
                  `proposal 缺少必填章节: ${section}，请参考 .driv/templates/proposals/default.md 模板结构`,
                ),
              );
            }
          }
        }
      } catch {
        // best-effort，校验失败静默跳过
      }
    }

    return buildResult('clarify', 'exit', failures);
  }

  private checkDesignExit(state: ChangeState): GuardResult {
    const failures: GuardFailure[] = [];

    if (!state.openspec.design) {
      failures.push(
        fail(
          'design_doc_exists',
          'design 路径已设置',
          '未设置',
          'error',
          '设计文档路径未设置，请先创建 design.md',
        ),
      );
    }

    if (state.phases.design.artifacts['detailed-design-completed'] !== 'true') {
      failures.push(
        fail(
          'detailed_design_completed',
          'detailed-design-completed 为 true',
          state.phases.design.artifacts['detailed-design-completed'] || '未设置',
          'error',
          '详细设计未完成，请先完成详细设计',
        ),
      );
    }

    if (state.phases.design.status !== 'completed') {
      failures.push(
        fail(
          'design_doc_complete',
          'design 阶段状态为 completed',
          state.phases.design.status,
          'error',
          '设计文档未完成，请先完成 design 阶段',
        ),
      );
    }

    if (!state.phases.design.artifacts.handoff) {
      failures.push(
        fail(
          'handoff_valid',
          'handoff 已生成',
          '未生成',
          'error',
          '交接包未生成，请先生成设计交接包',
        ),
      );
    }

    if (state.hwProcess.technicalReview !== REVIEW_PASSED) {
      failures.push(
        fail(
          'technical_review_passed',
          'passed',
          state.hwProcess.technicalReview,
          'error',
          '技术评审未通过，请先完成技术评审',
        ),
      );
    }

    if (!state.superpowers.brainstorming) {
      failures.push(
        fail(
          'brainstorming_generated',
          'brainstorming 路径已设置',
          '未设置',
          'warning',
          'Design 阶段未记录 brainstorming 产物路径，建议调用 setBrainstormingPath',
        ),
      );
    }

    return buildResult('design', 'exit', failures);
  }

  private checkBuildExit(state: ChangeState): GuardResult {
    const failures: GuardFailure[] = [];

    if (!state.buildMode) {
      failures.push(
        fail(
          'build_mode_set',
          'buildMode 已设置',
          '未设置',
          'error',
          '构建模式未选择，请选择执行模式',
        ),
      );
    }

    // tddMode 检查：分级校验
    if (!state.tddMode) {
      failures.push(
        fail(
          'tdd_mode_set',
          'tddMode 已设置',
          '未设置',
          'error',
          'TDD 模式未选择，请选择 TDD 模式',
        ),
      );
    } else if (state.tddMode === 'tdd') {
      // 严格 TDD 模式：测试必须通过（测试未通过时由后续 tests 检查拦截）
      // 这里不重复检查 tests === 'passed'，因为后续已有专门检查
      // 但需确认 tddMode 为 'tdd' 时的特殊要求（如测试文件存在）
      // 实际上，'tdd' 模式的强制校验由 tests === 'passed' 检查覆盖
    } else if (state.tddMode === 'tdd-lite') {
      // 宽松 TDD 模式：仅要求测试通过（由后续 tests 检查覆盖）
    } else if (state.tddMode === 'no-tdd') {
      // 跳过 TDD 强制校验，追加 warning
      failures.push(
        fail(
          'tdd_mode_warning',
          '使用 TDD 模式',
          '未使用 TDD',
          'warning',
          '未使用 TDD 模式，建议启用 TDD 以提升代码质量',
        ),
      );
    }

    if (!state.isolation) {
      failures.push(
        fail(
          'isolation_set',
          'isolation 已设置',
          '未设置',
          'error',
          '工作区隔离模式未选择，请选择隔离模式',
        ),
      );
    }

    if (!state.phases.build.artifacts.committed) {
      failures.push(
        fail('code_committed', '代码已提交', '未提交', 'error', '代码未提交，请先提交代码变更'),
      );
    }

    if (state.phases.build.artifacts.tests !== 'passed') {
      failures.push(
        fail(
          'tests_passed',
          '测试已通过',
          state.phases.build.artifacts.tests || '未运行',
          'error',
          '测试未通过，请确保所有测试通过',
        ),
      );
    }

    if (state.phases.build.artifacts['clean-code'] !== 'passed') {
      failures.push(
        fail(
          'clean_code_passed',
          'Clean Code 检查已通过',
          state.phases.build.artifacts['clean-code'] || '未检查',
          'warning',
          'Clean Code 检查未通过或未执行',
        ),
      );
    }

    if (state.hwProcess.codeReview !== REVIEW_PASSED) {
      failures.push(
        fail(
          'code_review_passed',
          'passed',
          state.hwProcess.codeReview,
          'error',
          '代码评审未通过，请先完成代码评审',
        ),
      );
    }

    if (!state.superpowers.plan) {
      failures.push(
        fail(
          'superpowers_plan_set',
          'superpowers.plan 已设置',
          '未设置',
          'warning',
          'Build 阶段未记录实施计划路径，建议调用 createPlan 生成 plan.md',
        ),
      );
    }

    return buildResult('build', 'exit', failures);
  }

  private checkVerifyExit(state: ChangeState): GuardResult {
    const failures: GuardFailure[] = [];

    if (state.verifyResult !== 'pass') {
      failures.push(
        fail(
          'verify_passed',
          'pass',
          state.verifyResult,
          'error',
          '验证未通过，请确保验证结果为 pass',
        ),
      );
    }

    if (!state.phases.verify.artifacts['branch-handled']) {
      failures.push(
        fail('branch_handled', '分支已处理', '未处理', 'error', '分支未处理，请先处理开发分支'),
      );
    }

    if (!state.phases.verify.artifacts.report) {
      failures.push(
        fail(
          'verification_report_exists',
          '验证报告已生成',
          '未生成',
          'error',
          '验证报告未生成，请先生成验证报告',
        ),
      );
    }

    return buildResult('verify', 'exit', failures);
  }

  private checkArchiveExit(state: ChangeState): GuardResult {
    const failures: GuardFailure[] = [];

    if (!state.archived) {
      failures.push(
        fail(
          'change_moved_to_archive',
          'true',
          'false',
          'error',
          '变更未归档，请先将变更移动到归档目录',
        ),
      );
    }

    if (state.phases.archive.artifacts['spec-merged'] !== 'true') {
      failures.push(
        fail(
          'spec_merged',
          'Spec 已合并',
          state.phases.archive.artifacts['spec-merged'] || '未合并',
          'error',
          'Spec 未合并，请先合并 Delta Spec',
        ),
      );
    }

    if (state.phases.archive.artifacts['knowledge-updated'] !== 'true') {
      failures.push(
        fail(
          'knowledge_updated',
          '知识库已更新',
          state.phases.archive.artifacts['knowledge-updated'] || '未更新',
          'warning',
          '知识库未更新，建议更新知识库索引',
        ),
      );
    }

    return buildResult('archive', 'exit', failures);
  }
}
