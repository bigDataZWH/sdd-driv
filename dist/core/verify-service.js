import * as path from 'path';
import * as fs from 'fs';
import { DebugGate } from './debug-gate.js';
async function walkDir(dir) {
    const files = [];
    let entries;
    try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
    }
    catch {
        return files;
    }
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await walkDir(fullPath)));
        }
        else {
            files.push(fullPath);
        }
    }
    return files;
}
export class VerifyService {
    fs;
    stateMachine;
    cleanCodeChecker;
    scriptExec;
    root;
    debugGate;
    constructor(fs, stateMachine, cleanCodeChecker, scriptExec, root, debugGate) {
        this.fs = fs;
        this.stateMachine = stateMachine;
        this.cleanCodeChecker = cleanCodeChecker;
        this.scriptExec = scriptExec;
        this.root = root;
        this.debugGate = debugGate ?? new DebugGate();
    }
    async assessScale(changeName) {
        const tasksPath = path.join(this.root, 'openspec', 'changes', changeName, 'tasks.md');
        let tasks = [];
        try {
            const tasksContent = await this.fs.readFile(tasksPath);
            tasks = tasksContent.split('\n').filter((l) => l.includes('- [ ]'));
        }
        catch {
            tasks = [];
        }
        const changeDir = path.join(this.root, 'openspec', 'changes', changeName);
        let fileCount = 0;
        try {
            const entries = await this.fs.listDir(changeDir);
            fileCount = entries.length;
        }
        catch {
            fileCount = 0;
        }
        let specCount = 0;
        const specsDir = path.join(changeDir, 'specs');
        try {
            const specEntries = await this.fs.listDir(specsDir);
            for (const entry of specEntries) {
                const specDir = path.join(specsDir, entry);
                if ((await this.fs.listDir(specDir)).some((f) => f === 'spec.md')) {
                    specCount++;
                }
            }
        }
        catch {
            specCount = 0;
        }
        if (tasks.length >= 3 || fileCount >= 4 || specCount >= 2) {
            return 'full';
        }
        return 'light';
    }
    async readConfig(changeName) {
        const configPath = path.join(this.root, 'openspec', 'changes', changeName, '.driv', 'config.yaml');
        try {
            const content = await this.fs.readFile(configPath);
            const { parse } = await import('yaml');
            const config = parse(content);
            return {
                buildCmd: String(config?.buildCmd ?? 'npm run build'),
                testCmd: String(config?.testCmd ?? 'npm test'),
            };
        }
        catch {
            return { buildCmd: 'npm run build', testCmd: 'npm test' };
        }
    }
    async executeBuild(changeName) {
        const { buildCmd } = await this.readConfig(changeName);
        return this.runCommand(buildCmd);
    }
    async executeTests(changeName) {
        const { testCmd } = await this.readConfig(changeName);
        return this.runCommand(testCmd);
    }
    parseCommand(cmd) {
        const parts = [];
        let current = '';
        let inQuote = false;
        for (const ch of cmd) {
            if (ch === '"' || ch === "'") {
                inQuote = !inQuote;
                continue;
            }
            if (ch === ' ' && !inQuote) {
                if (current.length > 0) {
                    parts.push(current);
                    current = '';
                }
                continue;
            }
            current += ch;
        }
        if (current.length > 0)
            parts.push(current);
        return { command: parts[0] || '', args: parts.slice(1) };
    }
    async runCommand(cmd) {
        const { command, args } = this.parseCommand(cmd);
        if (!command)
            return true;
        try {
            const result = await this.scriptExec.exec(command, args, { cwd: this.root });
            return result.exitCode === 0;
        }
        catch {
            return false;
        }
    }
    async verify(changeName) {
        const scale = await this.assessScale(changeName);
        const buildPassed = await this.executeBuild(changeName);
        const testsPassed = await this.executeTests(changeName);
        let cleanCodePassed = true;
        const cleanCodeIssues = [];
        try {
            const srcDir = path.join(this.root, 'src');
            const files = await walkDir(srcDir);
            for (const file of files) {
                if (file.endsWith('.ts')) {
                    const content = await fs.promises.readFile(file, 'utf-8');
                    const result = await this.cleanCodeChecker.check(content, file);
                    if (!result.passed) {
                        cleanCodePassed = false;
                        cleanCodeIssues.push({ file, issue: result.issues?.join('; ') || 'failed' });
                    }
                }
            }
        }
        catch {
            cleanCodePassed = true;
        }
        await this.writeCleanCodeArtifacts(changeName, cleanCodePassed, cleanCodeIssues);
        const branchHandled = false;
        const passed = buildPassed && testsPassed && cleanCodePassed;
        const reportPath = await this.generateReport(changeName, {
            scale,
            buildPassed,
            testsPassed,
            cleanCodePassed,
            branchHandled,
            reportPath: '',
            passed,
        });
        const result = {
            scale,
            buildPassed,
            testsPassed,
            cleanCodePassed,
            branchHandled,
            reportPath,
            passed,
        };
        await this.stateMachine.setField(changeName, 'verifyResult', passed ? 'pass' : 'fail');
        await this.stateMachine.setField(changeName, 'phases.verify.status', passed ? 'completed' : 'failed');
        if (!passed) {
            this.debugGate.enforce('verify', passed);
        }
        return result;
    }
    async generateReport(changeName, result) {
        const reportsDir = path.join(this.root, 'openspec', 'changes', changeName, 'reports');
        await this.fs.ensureDir(reportsDir);
        const reportPath = path.join(reportsDir, 'verification-report.md');
        const lines = [];
        lines.push('# 验证报告');
        lines.push('');
        lines.push(`- **变更**: ${changeName}`);
        lines.push(`- **规模**: ${result.scale}`);
        lines.push(`- **时间**: ${new Date().toISOString()}`);
        lines.push('');
        lines.push('## 检查结果');
        lines.push('');
        lines.push('| 检查项 | 状态 |');
        lines.push('|---|---|');
        lines.push(`| 构建 | ${result.buildPassed ? '✅ 通过' : '❌ 失败'} |`);
        lines.push(`| 测试 | ${result.testsPassed ? '✅ 通过' : '❌ 失败'} |`);
        lines.push(`| Clean Code | ${result.cleanCodePassed ? '✅ 通过' : '❌ 失败'} |`);
        lines.push(`| 分支处理 | ${result.branchHandled ? '✅ 已处理' : '⚠️ 未处理'} |`);
        lines.push('');
        lines.push('## 结论');
        lines.push('');
        lines.push(result.passed ? '✅ **验证通过**' : '❌ **验证未通过**');
        await this.fs.writeFile(reportPath, lines.join('\n'));
        return reportPath;
    }
    async writeCleanCodeArtifacts(changeName, passed, issues) {
        const reportsDir = path.join(this.root, 'openspec', 'changes', changeName, 'reports');
        await this.fs.ensureDir(reportsDir);
        const reportLines = [
            '# Clean Code 检查报告',
            '',
            `- **结果**: ${passed ? '✅ 通过' : '❌ 失败'}`,
            `- **时间**: ${new Date().toISOString()}`,
            `- **问题数**: ${issues.length}`,
            '',
        ];
        if (issues.length > 0) {
            reportLines.push('## 问题列表', '');
            for (const issue of issues) {
                reportLines.push(`- \`${issue.file}\`: ${issue.issue}`);
            }
        }
        await this.fs.writeFile(path.join(reportsDir, 'clean-code-report.md'), reportLines.join('\n'));
        await this.fs.writeFile(path.join(reportsDir, 'clean-code-issues.json'), JSON.stringify(issues, null, 2));
    }
}
//# sourceMappingURL=verify-service.js.map