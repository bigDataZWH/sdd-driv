import * as path from 'path';
import * as fs from 'fs';
const CHECKLIST_DEFS = {
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
const STATUS_FIELD_MAP = {
    requirement: 'hwProcess.requirementReview',
    technical: 'hwProcess.technicalReview',
    code: 'hwProcess.codeReview',
};
export class ReviewSystemImpl {
    fs;
    templateManager;
    stateMachine;
    pathResolver;
    constructor(fs, templateManager, stateMachine, pathResolver) {
        this.fs = fs;
        this.templateManager = templateManager;
        this.stateMachine = stateMachine;
        this.pathResolver = pathResolver;
    }
    reviewDir(changeName) {
        return path.join(this.pathResolver.changeDir(changeName), 'reviews');
    }
    reviewFilePath(changeName, type) {
        return path.join(this.reviewDir(changeName), `${type}-review.md`);
    }
    async createReview(changeName, type) {
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
    async executeChecklist(changeName, type) {
        const defs = CHECKLIST_DEFS[type] || [];
        const items = defs.map((d) => ({
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
    async submitReview(changeName, type) {
        const filePath = this.reviewFilePath(changeName, type);
        const content = await this.fs.readFile(filePath);
        const statusMatch = content.match(/-\s*\*\*状态\*\*\s*:\s*(passed|failed|pending)/);
        const status = (statusMatch?.[1] || 'pending');
        await this.stateMachine.setField(changeName, STATUS_FIELD_MAP[type], status);
    }
    async checkStatus(changeName, type) {
        const state = await this.stateMachine.getState(changeName);
        const key = `${type}Review`;
        return state.hwProcess[key];
    }
    async listReviews(changeName) {
        const dir = this.reviewDir(changeName);
        let files;
        try {
            files = await this.fs.listDir(dir);
        }
        catch {
            return [];
        }
        const reviews = [];
        for (const file of files) {
            if (!file.endsWith('-review.md'))
                continue;
            const type = file.replace('-review.md', '');
            if (!['requirement', 'technical', 'code'].includes(type))
                continue;
            const fullPath = path.join(dir, file);
            let status = 'pending';
            try {
                const content = await this.fs.readFile(fullPath);
                const statusMatch = content.match(/-\s*\*\*状态\*\*\s*:\s*(passed|failed|pending)/);
                status = (statusMatch?.[1] || 'pending');
            }
            catch {
                // use default pending
            }
            let createdAt = '';
            try {
                const stat = await fs.promises.stat(fullPath);
                createdAt = stat.birthtime.toISOString();
            }
            catch {
                createdAt = new Date().toISOString();
            }
            reviews.push({ type, path: fullPath, status, createdAt });
        }
        return reviews;
    }
    async runAutoCheck(changeName, checkName) {
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
                    if (!exists)
                        return { passed: false, detail: 'design 文件不存在' };
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
                const committed = state.phases.build.artifacts.committed;
                return {
                    passed: committed === 'true',
                    detail: committed === 'true' ? '代码已提交' : '代码未提交',
                };
            }
            case '测试通过': {
                const tests = state.phases.build.artifacts.tests;
                return {
                    passed: tests === 'passed',
                    detail: tests === 'passed' ? '测试已通过' : `测试状态: ${tests || '未运行'}`,
                };
            }
            case 'Clean Code 通过': {
                const cleanCode = state.phases.build.artifacts['clean-code'];
                return {
                    passed: cleanCode === 'passed',
                    detail: cleanCode === 'passed'
                        ? 'Clean Code 已通过'
                        : `Clean Code 状态: ${cleanCode || '未检查'}`,
                };
            }
            case '安全扫描通过': {
                const security = state.phases.build.artifacts['security-scan'];
                return {
                    passed: security === 'passed',
                    detail: security === 'passed' ? '安全扫描已通过' : `安全扫描状态: ${security || '未执行'}`,
                };
            }
            default:
                return { passed: false, detail: `未知自动检查项: ${checkName}` };
        }
    }
}
//# sourceMappingURL=review-system.js.map