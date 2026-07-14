import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { FileSystem, walkDir } from '../utils/file-system.js';
import { TemplateManager } from './template-manager.js';
import { StateMachine } from './state-machine.js';
import { PathResolver } from './path-resolver.js';
import { CleanCodeChecker } from './clean-code-checker.js';
import { CHECKLIST_DEFS } from './review-types.js';
import type {
  ReviewType,
  ReviewStatus,
  ReviewInfo,
  ChecklistItem,
  ChecklistResult,
} from './review-types.js';

export type {
  ReviewType,
  ReviewStatus,
  ReviewInfo,
  ChecklistItem,
  ChecklistResult,
} from './review-types.js';

const execFileAsync = promisify(execFile);

export interface ReviewSystem {
  createReview(changeName: string, type: ReviewType): Promise<string>;
  submitReview(changeName: string, type: ReviewType, status: ReviewStatus): Promise<void>;
  checkStatus(changeName: string, type: ReviewType): Promise<ReviewStatus>;
  executeChecklist(changeName: string, type: ReviewType): Promise<ChecklistResult>;
  listReviews(changeName: string): Promise<ReviewInfo[]>;
}

const STATUS_FIELD_MAP: Record<ReviewType, string> = {
  requirement: 'hwProcess.requirementReview',
  technical: 'hwProcess.technicalReview',
  code: 'hwProcess.codeReview',
};

export class ReviewSystemImpl implements ReviewSystem {
  private fs: FileSystem;
  private templateManager: TemplateManager;
  private stateMachine: StateMachine;
  private pathResolver: PathResolver;
  private cleanCodeChecker?: CleanCodeChecker;
  private root: string;

  constructor(
    fs: FileSystem,
    templateManager: TemplateManager,
    stateMachine: StateMachine,
    pathResolver: PathResolver,
    cleanCodeChecker?: CleanCodeChecker,
    root?: string,
  ) {
    this.fs = fs;
    this.templateManager = templateManager;
    this.stateMachine = stateMachine;
    this.pathResolver = pathResolver;
    this.cleanCodeChecker = cleanCodeChecker;
    this.root = root ?? pathResolver.root;
  }

  private reviewDir(changeName: string): string {
    return path.join(this.pathResolver.changeDir(changeName), 'reviews');
  }

  private reviewFilePath(changeName: string, type: ReviewType): string {
    return path.join(this.reviewDir(changeName), `${type}-review.md`);
  }

  async createReview(changeName: string, type: ReviewType): Promise<string> {
    const templateName = `${type}-review`;
    const items = CHECKLIST_DEFS[type] || [];
    const checklistMarkdown = items
      .map((item) => `- [ ] ${item.name}${item.autoCheck ? ' (自动检查)' : ' (人工检查)'}`)
      .join('\n');

    const state = await this.stateMachine.getState(changeName);
    const today = new Date().toISOString().slice(0, 10);

    const content = await this.templateManager.applyTemplate('review', templateName, {
      change_name: changeName,
      change_type: type,
      review_date: today,
      reviewer: '',
      proposal_path: state.openspec.proposal || '',
      design_path: state.openspec.design || '',
      tasks_path: state.openspec.tasks || '',
      checklist: checklistMarkdown,
      status: 'pending',
      ai_review_content: '',
      review_comments: '',
      conditions: '',
      rejection_reason: '',
      version: '1',
      conclusion: '',
    });

    const filePath = this.reviewFilePath(changeName, type);
    await this.fs.writeFile(filePath, content);
    return filePath;
  }

  async executeChecklist(changeName: string, type: ReviewType): Promise<ChecklistResult> {
    const defs = CHECKLIST_DEFS[type] || [];
    const items: ChecklistItem[] = defs.map((d) => ({
      name: d.name,
      description: d.description,
      autoCheck: d.autoCheck,
    }));

    for (const item of items) {
      if (item.autoCheck) {
        const result = await this.runAutoCheck(changeName, item.name);
        item.passed = result.passed;
        item.detail = result.detail;
      }
    }

    const allAutoPassed = items.filter((i) => i.autoCheck).every((i) => i.passed === true);

    return {
      type,
      items,
      allAutoPassed,
      timestamp: new Date().toISOString(),
    };
  }

  async submitReview(changeName: string, type: ReviewType, status: ReviewStatus): Promise<void> {
    await this.stateMachine.setField(changeName, STATUS_FIELD_MAP[type], status);

    const reviewPath = this.reviewFilePath(changeName, type);
    if (await this.fs.exists(reviewPath)) {
      const content = await this.fs.readFile(reviewPath);
      const updated = this.updateFrontmatter(content, {
        status,
        submittedAt: new Date().toISOString(),
      });
      await this.fs.writeFile(reviewPath, updated);
    }
  }

  async checkStatus(changeName: string, type: ReviewType): Promise<ReviewStatus> {
    const state = await this.stateMachine.getState(changeName);
    const key = `${type}Review` as keyof typeof state.hwProcess;
    return state.hwProcess[key] as ReviewStatus;
  }

  async listReviews(changeName: string): Promise<ReviewInfo[]> {
    const state = await this.stateMachine.getState(changeName);
    const types: ReviewType[] = ['requirement', 'technical', 'code'];
    const reviews: ReviewInfo[] = [];

    for (const type of types) {
      const reviewPath = this.reviewFilePath(changeName, type);
      if (await this.fs.exists(reviewPath)) {
        const key = `${type}Review` as keyof typeof state.hwProcess;
        const status = (state.hwProcess[key] as ReviewStatus) ?? 'pending';

        let createdAt = '';
        try {
          const stat = await this.fs.stat(reviewPath);
          createdAt = stat.birthtime.toISOString();
        } catch {
          createdAt = new Date().toISOString();
        }

        reviews.push({ type, path: reviewPath, status, createdAt });
      }
    }

    return reviews;
  }

  private updateFrontmatter(content: string, fields: Record<string, string>): string {
    const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
    const match = content.match(fmRegex);
    if (match) {
      const fm: Record<string, string> = {};
      for (const line of match[1].split('\n')) {
        const m = line.match(/^(\w+):\s*(.*)$/);
        if (m) fm[m[1]] = m[2];
      }
      Object.assign(fm, fields);
      const newFm = Object.entries(fm)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      return `---\n${newFm}\n---\n` + content.slice(match[0].length);
    }
    const newFm = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    return `---\n${newFm}\n---\n` + content;
  }

  private async runAutoCheck(
    changeName: string,
    checkName: string,
  ): Promise<{ passed: boolean; detail: string }> {
    const state = await this.stateMachine.getState(changeName);

    switch (checkName) {
      case 'proposal 存在': {
        if (state.openspec.proposal) {
          const exists = await this.fs.exists(state.openspec.proposal);
          return {
            passed: exists,
            detail: exists ? 'proposal 文件存在' : 'proposal 文件不存在',
          };
        }
        return { passed: false, detail: 'proposal 路径未设置' };
      }
      case 'tasks 存在': {
        if (state.openspec.tasks) {
          const exists = await this.fs.exists(state.openspec.tasks);
          return {
            passed: exists,
            detail: exists ? 'tasks 文件存在' : 'tasks 文件不存在',
          };
        }
        return { passed: false, detail: 'tasks 路径未设置' };
      }
      case 'design 存在': {
        if (state.openspec.design) {
          const exists = await this.fs.exists(state.openspec.design);
          return {
            passed: exists,
            detail: exists ? 'design 文件存在' : 'design 文件不存在',
          };
        }
        return { passed: false, detail: 'design 路径未设置' };
      }
      case '设计结构完整': {
        if (state.openspec.design) {
          const exists = await this.fs.exists(state.openspec.design);
          if (!exists) return { passed: false, detail: 'design 文件不存在' };
          const designContent = await this.fs.readFile(state.openspec.design);
          const hasSections = /##\s+\S+/.test(designContent);
          return {
            passed: hasSections,
            detail: hasSections ? '设计文档包含完整章节' : '设计文档缺少章节结构',
          };
        }
        return { passed: false, detail: 'design 路径未设置' };
      }
      case '代码已提交': {
        try {
          const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
            cwd: this.root,
          });
          const isClean = stdout.trim().length === 0;
          return {
            passed: isClean,
            detail: isClean
              ? '工作区干净，代码已提交'
              : `工作区有未提交变更: ${stdout.trim().split('\n').length} 个文件`,
          };
        } catch (error) {
          const committed = state.phases.build.artifacts.committed;
          return {
            passed: committed === 'true',
            detail: `工具调用失败，回退到状态字段检查: ${
              committed === 'true' ? '代码已提交' : '代码未提交'
            }`,
          };
        }
      }
      case '测试通过': {
        try {
          await execFileAsync('npm', ['test'], { cwd: this.root });
          return { passed: true, detail: '测试已通过（实际运行 npm test）' };
        } catch (error) {
          const tests = state.phases.build.artifacts.tests;
          const errMsg = (error as { stderr?: string; message?: string })?.stderr || (error as { message?: string })?.message || '';
          if (errMsg.includes('npm') && !errMsg.includes('FAIL')) {
            return {
              passed: tests === 'passed',
              detail: `工具调用失败，回退到状态字段检查: ${
                tests === 'passed' ? '测试已通过' : '测试未通过'
              }`,
            };
          }
          return { passed: false, detail: `测试失败: ${errMsg.slice(0, 200)}` };
        }
      }
      case 'Clean Code 通过': {
        try {
          const srcDir = path.join(this.root, 'src');
          const files = await walkDir(srcDir);
          let allPassed = true;
          const failedFiles: string[] = [];
          for (const file of files) {
            if (file.endsWith('.ts')) {
              const content = await this.fs.readFile(file);
              const result = await this.cleanCodeChecker!.check(content, file);
              if (!result.passed) {
                allPassed = false;
                failedFiles.push(path.basename(file));
              }
            }
          }
          return {
            passed: allPassed,
            detail: allPassed
              ? 'Clean Code 已通过（实际检查 src/）'
              : `Clean Code 失败: ${failedFiles.join(', ')}`,
          };
        } catch (error) {
          const cleanCode = state.phases.build.artifacts['clean-code'];
          return {
            passed: cleanCode === 'passed',
            detail: `工具调用失败，回退到状态字段检查: ${
              cleanCode === 'passed' ? 'Clean Code 已通过' : 'Clean Code 未通过'
            }`,
          };
        }
      }
      case '安全扫描通过': {
        try {
          await execFileAsync('npm', ['audit', '--audit-level=high'], {
            cwd: this.root,
          });
          return { passed: true, detail: '安全扫描已通过（实际运行 npm audit）' };
        } catch (error) {
          const security = state.phases.build.artifacts['security-scan'];
          const errMsg = (error as { stderr?: string; message?: string })?.stderr || (error as { message?: string })?.message || '';
          if (errMsg.includes('npm') && !errMsg.includes('vulnerability')) {
            return {
              passed: security === 'passed',
              detail: `工具调用失败，回退到状态字段检查: ${
                security === 'passed' ? '安全扫描已通过' : '安全扫描未通过'
              }`,
            };
          }
          return { passed: false, detail: `安全扫描发现高危漏洞: ${errMsg.slice(0, 200)}` };
        }
      }
      default:
        return { passed: false, detail: `未知自动检查项: ${checkName}` };
    }
  }
}
