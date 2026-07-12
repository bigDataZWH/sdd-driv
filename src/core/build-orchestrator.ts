import * as path from 'path';
import { FileSystem } from '../utils/file-system.js';
import { StateMachine } from './state-machine.js';
import { GitOps } from './git-ops.js';
import { PathResolver } from './path-resolver.js';
import { HandoffManager } from './handoff-manager.js';

export interface BuildModeConfig {
  buildMode: string;
  tddMode: string;
  isolation: string;
}

export class BuildOrchestrator {
  constructor(
    private fs: FileSystem,
    private stateMachine: StateMachine,
    private gitOps: GitOps,
    private pathResolver: PathResolver,
    private handoffManager: HandoffManager,
  ) {}

  async checkPreconditions(changeName: string): Promise<{ ok: boolean; reason?: string }> {
    const state = await this.stateMachine.getState(changeName);

    if (state.phases.design.status !== 'completed') {
      return { ok: false, reason: '设计阶段未完成，无法进入 Build 阶段' };
    }

    if (state.hwProcess.technicalReview !== 'passed') {
      return { ok: false, reason: '技术评审未通过，无法进入 Build 阶段' };
    }

    return { ok: true };
  }

  async createPlan(changeName: string): Promise<string> {
    const state = await this.stateMachine.getState(changeName);
    const relativePath = `openspec/changes/${changeName}/plan.md`;
    const absolutePath = path.join(this.pathResolver.root, relativePath);

    const handoff = await this.handoffManager.generate(changeName, 'design');
    const planContent = this.generatePlanContent(state, handoff.verification.totalHash);

    await this.fs.writeFile(absolutePath, planContent);
    await this.stateMachine.setField(changeName, 'superpowers.plan', relativePath);

    return relativePath;
  }

  async setupModes(changeName: string, config: BuildModeConfig): Promise<void> {
    await this.stateMachine.setField(changeName, 'buildMode', config.buildMode);
    await this.stateMachine.setField(changeName, 'tddMode', config.tddMode);
    await this.stateMachine.setField(changeName, 'isolation', config.isolation);
  }

  async initIsolation(changeName: string): Promise<void> {
    const state = await this.stateMachine.getState(changeName);
    const isolation = state.isolation;
    const branchName = `driv/${changeName}`;

    if (isolation === 'branch') {
      await this.gitOps.createBranch(branchName);
      await this.gitOps.checkoutBranch(branchName);
    } else if (isolation === 'worktree') {
      await this.gitOps.createBranch(branchName);
    }
  }

  private generatePlanContent(state: any, handoffHash: string): string {
    const today = new Date().toISOString().slice(0, 10);
    const lines: string[] = [
      '---',
      'canonical_spec: openspec',
      'role: implementation-plan',
      `driv_change: ${state.change}`,
      'generated_by: BuildOrchestrator',
      '---',
      '',
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

    lines.push(
      '',
      '## 执行配置',
      '',
      `- Build 模式: \`${state.buildMode}\``,
      `- TDD 模式: \`${state.tddMode}\``,
      `- 隔离策略: \`${state.isolation}\``,
      '',
      '## Handoff',
      '',
      `- Handoff Hash: \`${handoffHash}\``,
      '> 通过 HandoffManager 生成的上下文完整性校验。',
      '',
      '## 实施步骤（由 writing-plans 技能填充）',
      '',
      '> 此章节为存根占位。BuildOrchestrator 生成 plan.md 存根后，',
      '> Superpowers writing-plans 技能在此章节补充详细实施步骤。',
      '> 扩充内容时应保留上方 frontmatter 声明（canonical_spec: openspec）。',
    );

    return lines.join('\n');
  }
}
