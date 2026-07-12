import * as crypto from 'crypto';
import * as path from 'path';
export class HashUtils {
    static hashString(input) {
        return crypto.createHash('sha256').update(input, 'utf-8').digest('hex');
    }
    static hashObject(obj) {
        const str = JSON.stringify(obj, Object.keys(obj).sort());
        return HashUtils.hashString(str);
    }
    static async hashFile(fs, filePath) {
        const content = await fs.readFile(filePath);
        return HashUtils.hashString(content);
    }
}
export class ContextCompression {
    compress(context, strategy) {
        switch (strategy) {
            case 'off':
                return { ...context };
            case 'beta':
                return {
                    summary: context.summary.length > 400 ? context.summary.slice(0, 400) : context.summary,
                    decisions: context.decisions.slice(0, 10),
                    constraints: context.constraints.slice(0, 10),
                    tasks: context.tasks.slice(0, 10),
                    reviews: context.reviews.slice(0, 10),
                };
            case 'full':
                return {
                    summary: context.summary.length > 200 ? context.summary.slice(0, 200) : context.summary,
                    decisions: context.decisions.slice(0, 5),
                    constraints: context.constraints.slice(0, 5),
                    tasks: context.tasks.slice(0, 5),
                    reviews: context.reviews.slice(0, 5),
                };
        }
    }
}
export class HandoffManager {
    fs;
    resolver;
    parser;
    constructor(fs, resolver, parser) {
        this.fs = fs;
        this.resolver = resolver;
        this.parser = parser;
    }
    async collectSourceFiles(changeName) {
        const changeDir = this.resolver.changeDir(changeName);
        const sources = [];
        const coreFiles = ['proposal.md', 'design.md', 'tasks.md'];
        for (const file of coreFiles) {
            const filePath = path.join(changeDir, file);
            if (await this.fs.exists(filePath)) {
                sources.push(await this.hashAndSummarize(filePath));
            }
        }
        const specsDir = path.join(changeDir, 'specs');
        if (await this.fs.exists(specsDir)) {
            const specEntries = await this.fs.listDir(specsDir);
            for (const entry of specEntries) {
                const specFile = path.join(specsDir, entry, 'spec.md');
                if (await this.fs.exists(specFile)) {
                    sources.push(await this.hashAndSummarize(specFile));
                }
            }
        }
        const reviewsDir = path.join(changeDir, 'reviews');
        if (await this.fs.exists(reviewsDir)) {
            const reviewFiles = await this.fs.listDir(reviewsDir);
            for (const file of reviewFiles) {
                if (file.endsWith('.md')) {
                    const reviewPath = path.join(reviewsDir, file);
                    sources.push(await this.hashAndSummarize(reviewPath));
                }
            }
        }
        return sources;
    }
    async generate(changeName, phase, compression) {
        const sources = await this.collectSourceFiles(changeName);
        const context = await this.buildContext(changeName);
        const compressor = new ContextCompression();
        const compressedContext = compression
            ? compressor.compress(context, compression)
            : context;
        const totalHash = HashUtils.hashObject({
            sources: sources.map((s) => ({ path: this.resolver.normalize(s.path), hash: s.hash })),
            context: compressedContext,
        });
        const handoff = {
            version: '1.0',
            change: changeName,
            phase,
            timestamp: new Date().toISOString(),
            sources,
            context: compressedContext,
            verification: {
                totalHash,
                sourceCount: sources.length,
            },
        };
        await this.writeHandoffFiles(changeName, handoff);
        return handoff;
    }
    async validate(changeName, _phase) {
        const handoffDir = this.resolver.handoffDir(changeName);
        const handoffPath = path.join(handoffDir, 'handoff.json');
        if (!(await this.fs.exists(handoffPath))) {
            return false;
        }
        let handoff;
        try {
            handoff = await this.fs.readJson(handoffPath);
        }
        catch {
            return false;
        }
        for (const source of handoff.sources) {
            try {
                const content = await this.fs.readFile(source.path);
                const expectedHash = HashUtils.hashString(content);
                if (expectedHash !== source.hash) {
                    return false;
                }
            }
            catch {
                return false;
            }
        }
        const expectedTotalHash = HashUtils.hashObject({
            sources: handoff.sources.map((s) => ({
                path: this.resolver.normalize(s.path),
                hash: s.hash,
            })),
            context: handoff.context,
        });
        return expectedTotalHash === handoff.verification.totalHash;
    }
    async hashAndSummarize(filePath) {
        const content = await this.fs.readFile(filePath);
        const hash = HashUtils.hashString(content);
        const summary = content.slice(0, 200).replace(/\n/g, ' ').trim();
        return {
            path: this.resolver.normalize(filePath),
            hash,
            summary,
        };
    }
    async buildContext(changeName) {
        const changeDir = this.resolver.changeDir(changeName);
        let summaryText = '';
        const proposalPath = path.join(changeDir, 'proposal.md');
        if (await this.fs.exists(proposalPath)) {
            summaryText = (await this.fs.readFile(proposalPath)).slice(0, 500);
        }
        const decisions = [];
        const constraints = [];
        const designPath = path.join(changeDir, 'design.md');
        if (await this.fs.exists(designPath)) {
            const designContent = await this.fs.readFile(designPath);
            let currentSection = '';
            for (const line of designContent.split('\n')) {
                const sectionMatch = line.match(/^##\s+(.+)/);
                if (sectionMatch) {
                    currentSection = sectionMatch[1].toLowerCase();
                    continue;
                }
                const trimmed = line.replace(/^[-*\s]+/, '').trim();
                if (!trimmed)
                    continue;
                if (currentSection === 'decisions') {
                    decisions.push(trimmed);
                }
                else if (currentSection === 'constraints') {
                    constraints.push(trimmed);
                }
            }
        }
        const tasks = [];
        const tasksPath = path.join(changeDir, 'tasks.md');
        if (await this.fs.exists(tasksPath)) {
            const tasksContent = await this.fs.readFile(tasksPath);
            for (const line of tasksContent.split('\n')) {
                const taskMatch = line.match(/-\s+\[.?\]\s+(.+)/);
                if (taskMatch) {
                    tasks.push(taskMatch[1].trim());
                }
            }
        }
        const reviews = [];
        const reviewsDir = path.join(changeDir, 'reviews');
        if (await this.fs.exists(reviewsDir)) {
            const reviewFiles = await this.fs.listDir(reviewsDir);
            for (const file of reviewFiles) {
                if (file.endsWith('.md')) {
                    const reviewPath = path.join(reviewsDir, file);
                    const content = await this.fs.readFile(reviewPath);
                    const firstLine = content.split('\n')[0]?.replace(/^#\s*/, '').trim() || file;
                    reviews.push(`${firstLine}: ${content.slice(0, 100).replace(/\n/g, ' ').trim()}`);
                }
            }
        }
        return {
            summary: summaryText.replace(/\n/g, ' ').trim(),
            decisions,
            constraints,
            tasks,
            reviews,
        };
    }
    async writeHandoffFiles(changeName, handoff) {
        const handoffDir = this.resolver.handoffDir(changeName);
        await this.fs.ensureDir(handoffDir);
        await this.fs.writeFile(path.join(handoffDir, 'handoff.json'), JSON.stringify(handoff, null, 2));
        const md = this.generateMarkdown(handoff);
        await this.fs.writeFile(path.join(handoffDir, 'handoff.md'), md);
    }
    generateMarkdown(handoff) {
        const lines = [
            `# Handoff: ${handoff.change}`,
            '',
            `- 版本: ${handoff.version}`,
            `- 阶段: ${handoff.phase}`,
            `- 时间戳: ${handoff.timestamp}`,
            '',
            `## 源文件 (${handoff.sources.length})`,
            '',
        ];
        for (const source of handoff.sources) {
            lines.push(`- ${source.path}`);
            lines.push(`  - Hash: \`${source.hash}\``);
            lines.push(`  - 摘要: ${source.summary}`);
            lines.push('');
        }
        lines.push('## 上下文', '');
        lines.push(`### 摘要\n\n${handoff.context.summary}\n`);
        lines.push(`### 决策 (${handoff.context.decisions.length})`);
        for (const d of handoff.context.decisions)
            lines.push(`- ${d}`);
        lines.push('');
        lines.push(`### 约束 (${handoff.context.constraints.length})`);
        for (const c of handoff.context.constraints)
            lines.push(`- ${c}`);
        lines.push('');
        lines.push(`### 任务 (${handoff.context.tasks.length})`);
        for (const t of handoff.context.tasks)
            lines.push(`- ${t}`);
        lines.push('');
        lines.push(`### 评审 (${handoff.context.reviews.length})`);
        for (const r of handoff.context.reviews)
            lines.push(`- ${r}`);
        lines.push('');
        lines.push('## 验证', '');
        lines.push(`- 总 Hash: \`${handoff.verification.totalHash}\``);
        lines.push(`- 源文件数: ${handoff.verification.sourceCount}`);
        return lines.join('\n');
    }
}
//# sourceMappingURL=handoff-manager.js.map