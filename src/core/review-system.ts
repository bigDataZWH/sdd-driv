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

        let createdAt: string;
        try {
          const stat = await this.fs.stat(reviewPath);
          const content = await this.fs.readFile(reviewPath);
          const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (fmMatch) {
            const createdMatch = fmMatch[1].match(/^created_at:\s*(.+)$/m);
            if (createdMatch) {
              createdAt = createdMatch[1].trim();
            } else {
              createdAt = stat.mtime.toISOString();
            }
          } else {
            createdAt = stat.mtime.toISOString();
          }
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

  private async checkFileExists(
    state: Awaited<ReturnType<StateMachine['getState']>>,
    field: keyof typeof state.openspec,
    label: string,
  ): Promise<{ passed: boolean; detail: string }> {
    const filePath = state.openspec[field] as string | undefined;
    if (filePath) {
      const exists = await this.fs.exists(filePath);
      return {
        passed: exists,
        detail: exists ? `${label} 文件存在` : `${label} 文件不存在`,
      };
    }
    return { passed: false, detail: `${label} 路径未设置` };
  }

  private async fallbackCheck(
    state: Awaited<ReturnType<StateMachine['getState']>>,
    artifactKey: string,
    label: string,
  ): Promise<{ passed: boolean; detail: string }> {
    const value = state.phases.build.artifacts[artifactKey];
    return {
      passed: value === 'true' || value === 'passed',
      detail: `工具调用失败，回退到状态字段检查: ${
        value === 'true' || value === 'passed' ? `${label}已通过` : `${label}未通过`
      }`,
    };
  }

  private getErrorMsg(error: unknown): string {
    const err = error as { stderr?: string; message?: string };
    return err.stderr || err.message || '';
  }

  private async runAutoCheck(
    changeName: string,
    checkName: string,
  ): Promise<{ passed: boolean; detail: string }> {
    const state = await this.stateMachine.getState(changeName);

    switch (checkName) {
      case 'proposal 存在':
        return this.checkFileExists(state, 'proposal', 'proposal');
      case 'tasks 存在':
        return this.checkFileExists(state, 'tasks', 'tasks');
      case 'design 存在':
        return this.checkFileExists(state, 'design', 'design');
      case '设计结构完整': {
        const designPath = state.openspec.design;
        if (!designPath) return { passed: false, detail: 'design 路径未设置' };
        const exists = await this.fs.exists(designPath);
        if (!exists) return { passed: false, detail: 'design 文件不存在' };
        const content = await this.fs.readFile(designPath);
        const hasSections = /##\s+\S+/.test(content);
        return {
          passed: hasSections,
          detail: hasSections ? '设计文档包含完整章节' : '设计文档缺少章节结构',
        };
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
        } catch {
          return this.fallbackCheck(state, 'committed', '代码');
        }
      }
      case '测试通过': {
        try {
          await execFileAsync('npm', ['test'], { cwd: this.root });
          return { passed: true, detail: '测试已通过（实际运行 npm test）' };
        } catch (error) {
          const errMsg = this.getErrorMsg(error);
          if (errMsg.includes('npm') && !errMsg.includes('FAIL')) {
            return this.fallbackCheck(state, 'tests', '测试');
          }
          return { passed: false, detail: `测试失败: ${errMsg.slice(0, 200)}` };
        }
      }
      case 'Clean Code 通过': {
        try {
          const srcDir = path.join(this.root, 'src');
          const files = await walkDir(srcDir);
          const tsFiles = files.filter((f) => f.endsWith('.ts'));
          const failedFiles: string[] = [];
          for (const file of tsFiles) {
            const content = await this.fs.readFile(file);
            const result = await this.cleanCodeChecker!.check(content, file);
            if (!result.passed) {
              failedFiles.push(path.basename(file));
            }
          }
          return {
            passed: failedFiles.length === 0,
            detail: failedFiles.length === 0
              ? 'Clean Code 已通过（实际检查 src/）'
              : `Clean Code 失败: ${failedFiles.join(', ')}`,
          };
        } catch {
          return this.fallbackCheck(state, 'clean-code', 'Clean Code');
        }
      }
      case '安全扫描通过': {
        try {
          await execFileAsync('npm', ['audit', '--audit-level=high'], {
            cwd: this.root,
          });
          return { passed: true, detail: '安全扫描已通过（实际运行 npm audit）' };
        } catch (error) {
          const errMsg = this.getErrorMsg(error);
          if (errMsg.includes('npm') && !errMsg.includes('vulnerability')) {
            return this.fallbackCheck(state, 'security-scan', '安全扫描');
          }
          return { passed: false, detail: `安全扫描发现高危漏洞: ${errMsg.slice(0, 200)}` };
        }
      }
      default:
        return { passed: false, detail: `未知自动检查项: ${checkName}` };
    }
  }
}
