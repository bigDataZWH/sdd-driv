function succeed(phase, direction) {
    return { phase, direction, passed: true, failures: [] };
}
function buildResult(phase, direction, failures) {
    return { phase, direction, passed: failures.length === 0, failures };
}
function fail(check, expected, actual, severity, message) {
    return { check, expected, actual, severity, message };
}
const REVIEW_PASSED = 'passed';
export class PhaseGuardImpl {
    dirtyWorktree;
    constructor(dirtyWorktree) {
        this.dirtyWorktree = dirtyWorktree;
    }
    async checkEntry(phase, state) {
        switch (phase) {
            case 'design':
                return this.checkDesignEntry(state);
            case 'build':
                return this.checkBuildEntry(state);
            case 'verify':
                return this.checkVerifyEntry(state);
            case 'archive':
                return this.checkArchiveEntry(state);
            default:
                return succeed(phase, 'entry');
        }
    }
    checkDesignEntry(state) {
        const failures = [];
        if (state.phase !== 'design') {
            failures.push(fail('phase_is_design', 'design', state.phase, 'error', '当前阶段不是 design'));
        }
        if (state.phases.clarify.status !== 'completed') {
            failures.push(fail('clarify_completed', 'completed', state.phases.clarify.status, 'error', 'Clarify 阶段未完成'));
        }
        if (!state.openspec.proposal) {
            failures.push(fail('proposal_exists', 'proposal 路径已设置', '未设置', 'error', '提案文件缺失'));
        }
        return buildResult('design', 'entry', failures);
    }
    checkBuildEntry(state) {
        const failures = [];
        if (state.phase !== 'build') {
            failures.push(fail('phase_is_build', 'build', state.phase, 'error', '当前阶段不是 build'));
        }
        if (state.phases.design.status !== 'completed') {
            failures.push(fail('design_completed', 'completed', state.phases.design.status, 'error', 'Design 阶段未完成'));
        }
        if (!state.openspec.design) {
            failures.push(fail('design_doc_exists', 'design 路径已设置', '未设置', 'error', '设计文档缺失'));
        }
        if (state.hwProcess.technicalReview !== REVIEW_PASSED) {
            failures.push(fail('technical_review_passed', 'passed', state.hwProcess.technicalReview, 'error', '技术评审未通过'));
        }
        if (state.phases.design.artifacts.handoff) {
            const hashValid = this.validateHandoffHash(state);
            if (!hashValid) {
                failures.push(fail('handoff_hash_valid', 'hash 匹配', 'hash 不匹配', 'warning', 'Handoff 已变更，建议重新生成'));
            }
        }
        const dirtyResult = this.dirtyWorktree
            ? { dirty: false, changes: [] }
            : { dirty: false, changes: [] };
        if (dirtyResult.dirty) {
            failures.push(fail('dirty_worktree', '干净工作区', '有未提交变更', 'warning', '工作区存在未提交变更'));
        }
        return buildResult('build', 'entry', failures);
    }
    checkVerifyEntry(state) {
        const failures = [];
        if (state.phase !== 'verify') {
            failures.push(fail('phase_is_verify', 'verify', state.phase, 'error', '当前阶段不是 verify'));
        }
        if (state.phases.build.status !== 'completed') {
            failures.push(fail('build_completed', 'completed', state.phases.build.status, 'error', 'Build 阶段未完成'));
        }
        if (!state.phases.build.artifacts.committed) {
            failures.push(fail('code_committed', '代码已提交', '未提交', 'error', '代码未提交'));
        }
        if (state.phases.build.artifacts.tests !== 'passed') {
            failures.push(fail('tests_passed', 'passed', state.phases.build.artifacts.tests || '未运行', 'error', '测试未通过'));
        }
        if (state.hwProcess.codeReview !== REVIEW_PASSED) {
            failures.push(fail('code_review_passed', 'passed', state.hwProcess.codeReview, 'error', '代码评审未通过'));
        }
        return buildResult('verify', 'entry', failures);
    }
    checkArchiveEntry(state) {
        const failures = [];
        if (state.phase !== 'archive') {
            failures.push(fail('phase_is_archive', 'archive', state.phase, 'error', '当前阶段不是 archive'));
        }
        if (state.phases.verify.status !== 'completed') {
            failures.push(fail('verify_completed', 'completed', state.phases.verify.status, 'error', 'Verify 阶段未完成'));
        }
        if (state.verifyResult !== 'pass') {
            failures.push(fail('verify_result_pass', 'pass', state.verifyResult, 'error', '验证未通过'));
        }
        if (!state.phases.verify.artifacts['branch-handled']) {
            failures.push(fail('branch_handled', '分支已处理', '未处理', 'error', '分支未处理'));
        }
        return buildResult('archive', 'entry', failures);
    }
    validateHandoffHash(_state) {
        return true;
    }
    async checkExit(phase, state) {
        switch (phase) {
            case 'clarify':
                return this.checkClarifyExit(state);
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
    async applyTransition(from, to, state, stateMachine) {
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
    checkClarifyExit(state) {
        const failures = [];
        if (!state.openspec.proposal) {
            failures.push(fail('proposal_exists', 'proposal 路径已设置', '未设置', 'error', '提案文件路径未设置，请先创建 proposal.md'));
        }
        if (!state.openspec.design) {
            failures.push(fail('design_doc_exists', 'design 路径已设置', '未设置', 'error', '设计文档路径未设置，请先创建 design.md'));
        }
        if (!state.openspec.specs || state.openspec.specs.length === 0) {
            failures.push(fail('specs_created', 'specs 数组已设置且不为空', state.openspec.specs ? '空数组' : '未设置', 'error', 'specs 为空数组，请先创建 specs'));
        }
        if (!state.openspec.tasks) {
            failures.push(fail('tasks_exists', 'tasks 路径已设置', '未设置', 'error', 'tasks 未设置，请先创建 tasks.md'));
        }
        if (state.phases.clarify.artifacts['design-converted'] !== 'true') {
            failures.push(fail('design_converted', 'design-converted 为 true', state.phases.clarify.artifacts['design-converted'] || '未设置', 'error', 'design-converted 未设置或不为 true，请先完成设计文档转换'));
        }
        if (state.phases.clarify.status !== 'completed') {
            failures.push(fail('proposal_complete', 'clarify 阶段状态为 completed', state.phases.clarify.status, 'error', '提案未完成，请先完成 clarify 阶段'));
        }
        return buildResult('clarify', 'exit', failures);
    }
    checkDesignExit(state) {
        const failures = [];
        if (!state.openspec.design) {
            failures.push(fail('design_doc_exists', 'design 路径已设置', '未设置', 'error', '设计文档路径未设置，请先创建 design.md'));
        }
        if (state.phases.design.artifacts['detailed-design-completed'] !== 'true') {
            failures.push(fail('detailed_design_completed', 'detailed-design-completed 为 true', state.phases.design.artifacts['detailed-design-completed'] || '未设置', 'error', '详细设计未完成，请先完成详细设计'));
        }
        if (state.phases.design.status !== 'completed') {
            failures.push(fail('design_doc_complete', 'design 阶段状态为 completed', state.phases.design.status, 'error', '设计文档未完成，请先完成 design 阶段'));
        }
        if (!state.phases.design.artifacts.handoff) {
            failures.push(fail('handoff_valid', 'handoff 已生成', '未生成', 'error', '交接包未生成，请先生成设计交接包'));
        }
        if (state.hwProcess.technicalReview !== REVIEW_PASSED) {
            failures.push(fail('technical_review_passed', 'passed', state.hwProcess.technicalReview, 'error', '技术评审未通过，请先完成技术评审'));
        }
        return buildResult('design', 'exit', failures);
    }
    checkBuildExit(state) {
        const failures = [];
        if (!state.buildMode) {
            failures.push(fail('build_mode_set', 'buildMode 已设置', '未设置', 'error', '构建模式未选择，请选择执行模式'));
        }
        if (!state.tddMode) {
            failures.push(fail('tdd_mode_set', 'tddMode 已设置', '未设置', 'error', 'TDD 模式未选择，请选择 TDD 模式'));
        }
        if (!state.isolation) {
            failures.push(fail('isolation_set', 'isolation 已设置', '未设置', 'error', '工作区隔离模式未选择，请选择隔离模式'));
        }
        if (!state.phases.build.artifacts.committed) {
            failures.push(fail('code_committed', '代码已提交', '未提交', 'error', '代码未提交，请先提交代码变更'));
        }
        if (state.phases.build.artifacts.tests !== 'passed') {
            failures.push(fail('tests_passed', '测试已通过', state.phases.build.artifacts.tests || '未运行', 'error', '测试未通过，请确保所有测试通过'));
        }
        if (state.phases.build.artifacts['clean-code'] !== 'passed') {
            failures.push(fail('clean_code_passed', 'Clean Code 检查已通过', state.phases.build.artifacts['clean-code'] || '未检查', 'warning', 'Clean Code 检查未通过或未执行'));
        }
        if (state.hwProcess.codeReview !== REVIEW_PASSED) {
            failures.push(fail('code_review_passed', 'passed', state.hwProcess.codeReview, 'error', '代码评审未通过，请先完成代码评审'));
        }
        return buildResult('build', 'exit', failures);
    }
    checkVerifyExit(state) {
        const failures = [];
        if (state.verifyResult !== 'pass') {
            failures.push(fail('verify_passed', 'pass', state.verifyResult, 'error', '验证未通过，请确保验证结果为 pass'));
        }
        if (!state.phases.verify.artifacts['branch-handled']) {
            failures.push(fail('branch_handled', '分支已处理', '未处理', 'error', '分支未处理，请先处理开发分支'));
        }
        if (!state.phases.verify.artifacts.report) {
            failures.push(fail('verification_report_exists', '验证报告已生成', '未生成', 'error', '验证报告未生成，请先生成验证报告'));
        }
        return buildResult('verify', 'exit', failures);
    }
    checkArchiveExit(state) {
        const failures = [];
        if (!state.archived) {
            failures.push(fail('change_moved_to_archive', 'true', 'false', 'error', '变更未归档，请先将变更移动到归档目录'));
        }
        if (state.phases.archive.artifacts['spec-merged'] !== 'true') {
            failures.push(fail('spec_merged', 'Spec 已合并', state.phases.archive.artifacts['spec-merged'] || '未合并', 'error', 'Spec 未合并，请先合并 Delta Spec'));
        }
        if (state.phases.archive.artifacts['knowledge-updated'] !== 'true') {
            failures.push(fail('knowledge_updated', '知识库已更新', state.phases.archive.artifacts['knowledge-updated'] || '未更新', 'warning', '知识库未更新，建议更新知识库索引'));
        }
        return buildResult('archive', 'exit', failures);
    }
}
//# sourceMappingURL=phase-guard.js.map