import * as path from 'path';
export class BuildOrchestrator {
    fs;
    stateMachine;
    gitOps;
    pathResolver;
    handoffManager;
    constructor(fs, stateMachine, gitOps, pathResolver, handoffManager) {
        this.fs = fs;
        this.stateMachine = stateMachine;
        this.gitOps = gitOps;
        this.pathResolver = pathResolver;
        this.handoffManager = handoffManager;
    }
    async checkPreconditions(changeName) {
        const state = await this.stateMachine.getState(changeName);
        if (state.phases.design.status !== 'completed') {
            return { ok: false, reason: '设计阶段未完成，无法进入 Build 阶段' };
        }
        if (state.hwProcess.technicalReview !== 'passed') {
            return { ok: false, reason: '技术评审未通过，无法进入 Build 阶段' };
        }
        return { ok: true };
    }
    async createPlan(changeName) {
        const state = await this.stateMachine.getState(changeName);
        const relativePath = `openspec/changes/${changeName}/plan.md`;
        const absolutePath = path.join(this.pathResolver.root, relativePath);
        const handoff = await this.handoffManager.generate(changeName, 'design');
        const planContent = this.generatePlanContent(state, handoff.verification.totalHash);
        await this.fs.writeFile(absolutePath, planContent);
        await this.stateMachine.setField(changeName, 'superpowers.plan', relativePath);
        return relativePath;
    }
    async setupModes(changeName, config) {
        await this.stateMachine.setField(changeName, 'buildMode', config.buildMode);
        await this.stateMachine.setField(changeName, 'tddMode', config.tddMode);
        await this.stateMachine.setField(changeName, 'isolation', config.isolation);
    }
    async initIsolation(changeName) {
        const state = await this.stateMachine.getState(changeName);
        const isolation = state.isolation;
        const branchName = `driv/${changeName}`;
        if (isolation === 'branch') {
            await this.gitOps.createBranch(branchName);
            await this.gitOps.checkoutBranch(branchName);
        }
        else if (isolation === 'worktree') {
            await this.gitOps.createBranch(branchName);
        }
    }
    generatePlanContent(state, handoffHash) {
        const today = new Date().toISOString().slice(0, 10);
        const lines = [
            `# Plan: ${state.change}`,
            '',
            `- 创建日期: ${today}`,
            `- 变更: ${state.change}`,
            '',
            '## OpenSpec 引用',
            '',
        ];
        if (state.openspec.proposal) {
            lines.push(`- Proposal: \`${state.openspec.proposal}\``);
        }
        if (state.openspec.design) {
            lines.push(`- Design: \`${state.openspec.design}\``);
        }
        if (state.openspec.tasks) {
            lines.push(`- Tasks: \`${state.openspec.tasks}\``);
        }
        if (state.openspec.specs && state.openspec.specs.length > 0) {
            lines.push(`- Specs: \`${state.openspec.specs.join(', ')}\``);
        }
        lines.push('', '## 执行配置', '', `- Build 模式: \`${state.buildMode}\``, `- TDD 模式: \`${state.tddMode}\``, `- 隔离策略: \`${state.isolation}\``, '', '## Handoff', '', `- Handoff Hash: \`${handoffHash}\``, '> 通过 HandoffManager 生成的上下文完整性校验。');
        return lines.join('\n');
    }
}
//# sourceMappingURL=build-orchestrator.js.map