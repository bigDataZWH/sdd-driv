import { parse } from 'yaml';
import * as path from 'path';
export const ReviewTypes = ['requirement', 'technical', 'code'];
export const ReviewStatuses = ['pending', 'passed', 'failed'];
export const CHECKLIST_DEFS = {
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
export const defaultGatesConfig = {
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