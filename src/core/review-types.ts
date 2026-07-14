import { parse } from 'yaml';
import * as path from 'path';
import { FileSystem } from '../utils/file-system.js';

export const ReviewTypes = ['requirement', 'technical', 'code'] as const;
export type ReviewType = (typeof ReviewTypes)[number];

export const ReviewStatuses = ['pending', 'passed', 'failed'] as const;
export type ReviewStatus = (typeof ReviewStatuses)[number];

export interface ReviewInfo {
  type: ReviewType;
  status: ReviewStatus;
  path: string;
  createdAt: string;
  submittedAt?: string;
}

export type FindingSeverity = 'error' | 'warning' | 'info';

export interface ReviewFinding {
  check: string;
  severity: FindingSeverity;
  passed: boolean;
  detail: string;
  autoCheck: boolean;
}

export interface ChecklistItem {
  name: string;
  description: string;
  autoCheck: boolean;
  passed?: boolean;
  detail?: string;
}

export interface ChecklistResult {
  type: ReviewType;
  items: ChecklistItem[];
  allAutoPassed: boolean;
  timestamp: string;
}

export interface GateConfig {
  phase: string;
  trigger: string;
  required_approvals: number;
  checklist: string[];
  template: string;
}

export type GatesConfig = Record<string, GateConfig>;

export interface ChecklistDef {
  name: string;
  description: string;
  autoCheck: boolean;
}

export const CHECKLIST_DEFS: Record<ReviewType, ChecklistDef[]> = {
  requirement: [
    { name: '需求描述清晰完整', description: '需求描述清晰完整', autoCheck: false },
    { name: '验收标准明确', description: '验收标准明确', autoCheck: false },
    { name: '范围边界清晰', description: '范围边界清晰', autoCheck: false },
    { name: '风险识别充分', description: '风险识别充分', autoCheck: false },
    { name: 'proposal 存在', description: 'proposal 文件已创建', autoCheck: true },
    { name: 'tasks 存在', description: 'tasks 文件已创建', autoCheck: true },
  ],
  technical: [
    { name: '技术方案可行性', description: '技术方案可行性', autoCheck: false },
    { name: '架构设计合理性', description: '架构设计合理性', autoCheck: false },
    { name: '接口设计完整性', description: '接口设计完整性', autoCheck: false },
    { name: '性能考虑充分', description: '性能考虑充分', autoCheck: false },
    { name: '安全考虑充分', description: '安全考虑充分', autoCheck: false },
    { name: 'design 存在', description: '设计文档已创建', autoCheck: true },
    { name: '设计结构完整', description: '设计文档包含完整章节', autoCheck: true },
  ],
  code: [
    { name: '代码符合规范', description: '代码符合规范', autoCheck: false },
    { name: '单元测试覆盖', description: '单元测试覆盖', autoCheck: false },
    { name: '无安全漏洞', description: '无安全漏洞', autoCheck: false },
    { name: '注释文档完整', description: '注释文档完整', autoCheck: false },
    { name: '代码已提交', description: '代码已提交', autoCheck: true },
    { name: '测试通过', description: '单元测试通过', autoCheck: true },
    { name: 'Clean Code 通过', description: 'Clean Code 检查通过', autoCheck: true },
    { name: '安全扫描通过', description: '安全扫描通过', autoCheck: true },
  ],
};

export const defaultGatesConfig: GatesConfig = {
  requirement_review: {
    phase: 'clarify',
    trigger: 'before_design',
    required_approvals: 1,
    checklist: CHECKLIST_DEFS.requirement.filter((c) => !c.autoCheck).map((c) => c.name),
    template: 'reviews/requirement-review.md',
  },
  technical_review: {
    phase: 'design',
    trigger: 'before_build',
    required_approvals: 1,
    checklist: CHECKLIST_DEFS.technical.filter((c) => !c.autoCheck).map((c) => c.name),
    template: 'reviews/technical-review.md',
  },
  code_review: {
    phase: 'build',
    trigger: 'before_verify',
    required_approvals: 1,
    checklist: CHECKLIST_DEFS.code.filter((c) => !c.autoCheck).map((c) => c.name),
    template: 'reviews/code-review.md',
  },
};

export async function loadGatesConfig(fs: FileSystem, root: string): Promise<GatesConfig> {
  const configPath = path.join(root, '.driv', 'config.yaml');
  try {
    const content = await fs.readFile(configPath);
    const parsed = parse(content) as Record<string, unknown>;
    const gates = parsed.gates as Record<string, unknown> | undefined;
    if (!gates) return { ...defaultGatesConfig };

    const result: GatesConfig = {};
    for (const [key, value] of Object.entries(gates)) {
      const g = value as Record<string, unknown>;
      result[key] = {
        phase: g.phase as string,
        trigger: g.trigger as string,
        required_approvals: g.required_approvals as number,
        checklist: g.checklist as string[],
        template: g.template as string,
      };
    }
    return result;
  } catch {
    return { ...defaultGatesConfig };
  }
}
