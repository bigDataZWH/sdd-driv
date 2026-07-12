import { parse } from 'yaml';
import * as path from 'path';
export const ReviewTypes = ['requirement', 'technical', 'code'];
export const ReviewStatuses = ['pending', 'passed', 'failed'];
export const defaultGatesConfig = {
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
export async function loadGatesConfig(fs, root) {
    const configPath = path.join(root, '.driv', 'config.yaml');
    try {
        const content = await fs.readFile(configPath);
        const parsed = parse(content);
        const gates = parsed.gates;
        if (!gates)
            return { ...defaultGatesConfig };
        const result = {};
        for (const [key, value] of Object.entries(gates)) {
            const g = value;
            result[key] = {
                phase: g.phase,
                trigger: g.trigger,
                required_approvals: g.required_approvals,
                checklist: g.checklist,
                template: g.template,
            };
        }
        return result;
    }
    catch {
        return { ...defaultGatesConfig };
    }
}
//# sourceMappingURL=review-types.js.map