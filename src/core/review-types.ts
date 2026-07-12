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
  check: string;
  passed: boolean;
  detail: string;
  autoCheck: boolean;
}

export interface ChecklistResult {
  type: ReviewType;
  items: ChecklistItem[];
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

export const defaultGatesConfig: GatesConfig = {
  requirement_review: {
    phase: 'clarify',
    trigger: 'before_design',
    required_approvals: 1,
    checklist: ['需求描述清晰完整', '验收标准明确', '范围边界清晰', '风险识别充分'],
    template: 'reviews/requirement-review.md',
  },
  technical_review: {
    phase: 'design',
    trigger: 'before_build',
    required_approvals: 1,
    checklist: [
      '技术方案可行性',
      '架构设计合理性',
      '接口设计完整性',
      '性能考虑充分',
      '安全考虑充分',
    ],
    template: 'reviews/technical-review.md',
  },
  code_review: {
    phase: 'build',
    trigger: 'before_verify',
    required_approvals: 1,
    checklist: ['代码符合规范', '单元测试覆盖', '无安全漏洞', '注释文档完整'],
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
