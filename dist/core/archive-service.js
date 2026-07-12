import * as path from 'path';
import * as fs from 'fs';
export class ArchiveService {
    fs;
    stateMachine;
    parser;
    root;
    constructor(fs, stateMachine, parser, root) {
        this.fs = fs;
        this.stateMachine = stateMachine;
        this.parser = parser;
        this.root = root;
    }
    async checkPreconditions(changeName) {
        const failures = [];
        const changeDir = path.join(this.root, 'openspec', 'changes', changeName);
        const stateFilePath = path.join(changeDir, '.driv.yaml');
        if (!(await this.fs.exists(stateFilePath))) {
            failures.push('change_not_found');
            return failures;
        }
        const state = await this.stateMachine.getState(changeName);
        if (state.phases.verify?.status !== 'completed') {
            failures.push('verify_not_completed');
        }
        if (state.archived === true) {
            failures.push('already_archived');
        }
        const reportPath = path.join(changeDir, 'reports', 'verification-report.md');
        if (!(await this.fs.exists(reportPath))) {
            failures.push('verification_report_missing');
        }
        return failures;
    }
    async archive(changeName) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const archiveDir = path.join(this.root, 'openspec', 'archive', `${dateStr}-${changeName}`);
        const changeDir = path.join(this.root, 'openspec', 'changes', changeName);
        const errors = [];
        let rollbackPerformed = false;
        let specMerged = false;
        const failures = await this.checkPreconditions(changeName);
        if (failures.length > 0) {
            return {
                archived: false,
                archivePath: '',
                specMerged: false,
                rollbackPerformed: false,
                errors: failures,
            };
        }
        try {
            await this.fs.ensureDir(archiveDir);
            const artifacts = ['proposal.md', 'design.md', 'tasks.md', '.driv.yaml'];
            for (const artifact of artifacts) {
                const src = path.join(changeDir, artifact);
                const dest = path.join(archiveDir, artifact);
                if (await this.fs.exists(src)) {
                    await this.fs.copyFile(src, dest);
                }
            }
            await this.copyDirRecursive(path.join(changeDir, 'specs'), path.join(archiveDir, 'specs'));
            await this.copyDirRecursive(path.join(changeDir, 'reviews'), path.join(archiveDir, 'reviews'));
            await this.copyDirRecursive(path.join(changeDir, 'reports'), path.join(archiveDir, 'reports'));
            const handoffDir = path.join(changeDir, '.driv', 'handoff');
            await this.copyDirRecursive(handoffDir, path.join(archiveDir, 'handoff'));
            await this.markSuperpowersArtifacts(changeName);
            specMerged = await this.mergeDeltaSpec(changeName);
            await this.updateIndex(changeName, dateStr);
            await this.stateMachine.setField(changeName, 'archived', true);
            await this.stateMachine.setField(changeName, 'phases.archive.status', 'completed');
            await this.stateMachine.setField(changeName, 'phases.archive.completedAt', new Date().toISOString());
            return {
                archived: true,
                archivePath: archiveDir,
                specMerged,
                rollbackPerformed: false,
                errors: [],
            };
        }
        catch (err) {
            errors.push(err.message || String(err));
            try {
                await this.rollbackForDir(archiveDir);
                rollbackPerformed = true;
            }
            catch {
                // rollback best-effort
            }
            return {
                archived: false,
                archivePath: archiveDir,
                specMerged: false,
                rollbackPerformed,
                errors,
            };
        }
    }
    async mergeDeltaSpec(changeName) {
        const specsDir = path.join(this.root, 'openspec', 'changes', changeName, 'specs');
        if (!(await this.fs.exists(specsDir)))
            return false;
        const capabilities = await this.fs.listDir(specsDir);
        let merged = false;
        for (const capability of capabilities) {
            const deltaSpecPath = path.join(specsDir, capability, 'spec.md');
            if (!(await this.fs.exists(deltaSpecPath)))
                continue;
            const mainSpecDir = path.join(this.root, 'openspec', 'specs', capability);
            const mainSpecPath = path.join(mainSpecDir, 'spec.md');
            const deltaContent = await this.fs.readFile(deltaSpecPath);
            const strategy = this.detectStrategy(deltaContent);
            const mainExists = await this.fs.exists(mainSpecPath);
            if (mainExists) {
                await this.fs.copyFile(mainSpecPath, mainSpecPath + '.backup');
            }
            if (strategy === 'supersede') {
                await this.fs.ensureDir(mainSpecDir);
                await this.fs.writeFile(mainSpecPath, deltaContent);
                merged = true;
            }
            else if (strategy === 'update' && mainExists) {
                const mainContent = await this.fs.readFile(mainSpecPath);
                const updated = this.applyUpdate(mainContent, deltaContent);
                if (updated === null) {
                    const conflictPath = mainSpecPath.replace(/\.md$/, '.conflict.md');
                    await this.fs.writeFile(conflictPath, deltaContent);
                }
                else {
                    await this.fs.writeFile(mainSpecPath, updated);
                    merged = true;
                }
            }
            else {
                if (mainExists) {
                    const mainContent = await this.fs.readFile(mainSpecPath);
                    const deltaSection = this.extractRequirementsSection(deltaContent);
                    const appended = mainContent.trimEnd() + '\n\n' + deltaSection.trimStart();
                    await this.fs.writeFile(mainSpecPath, appended);
                }
                else {
                    await this.fs.ensureDir(mainSpecDir);
                    await this.fs.writeFile(mainSpecPath, deltaContent);
                }
                merged = true;
            }
        }
        return merged;
    }
    async markSuperpowersArtifacts(changeName) {
        const state = await this.stateMachine.getState(changeName);
        const now = new Date().toISOString();
        const changeDir = path.join(this.root, 'openspec', 'changes', changeName);
        const stamp = `\n\n---\narchived-with: ${changeName}\nstatus: final\narchived-at: ${now}\n`;
        const artifactPaths = [];
        if (state.superpowers.plan) {
            artifactPaths.push(path.join(this.root, state.superpowers.plan));
        }
        if (state.superpowers.brainstorming) {
            artifactPaths.push(path.join(this.root, state.superpowers.brainstorming));
        }
        for (const artifactPath of artifactPaths) {
            const absolutePath = path.isAbsolute(artifactPath)
                ? artifactPath
                : path.join(changeDir, path.basename(artifactPath));
            if (await this.fs.exists(absolutePath)) {
                const content = await this.fs.readFile(absolutePath);
                if (!content.includes('archived-with:')) {
                    await this.fs.writeFile(absolutePath, content.trimEnd() + stamp);
                }
            }
        }
    }
    async rollback(changeName) {
        const changeDir = path.join(this.root, 'openspec', 'changes', changeName);
        const stateFilePath = path.join(changeDir, '.driv.yaml');
        if (!(await this.fs.exists(stateFilePath))) {
            throw new Error(`Change '${changeName}' not found`);
        }
        const archiveDir = path.join(this.root, 'openspec', 'archive');
        if (!(await this.fs.exists(archiveDir))) {
            throw new Error(`No archive directory found for '${changeName}'`);
        }
        const entries = await this.fs.listDir(archiveDir);
        const matchingDirs = entries.filter((e) => e.endsWith(`-${changeName}`));
        if (matchingDirs.length === 0) {
            throw new Error(`No archive found for '${changeName}'`);
        }
        for (const dir of matchingDirs) {
            const fullPath = path.join(archiveDir, dir);
            await fs.promises.rm(fullPath, { recursive: true, force: true });
        }
    }
    async copyDirRecursive(srcDir, destDir) {
        if (!(await this.fs.exists(srcDir)))
            return;
        await this.fs.ensureDir(destDir);
        const entries = await this.fs.listDir(srcDir);
        for (const entry of entries) {
            const srcPath = path.join(srcDir, entry);
            const destPath = path.join(destDir, entry);
            const stat = await fs.promises.stat(srcPath);
            if (stat.isDirectory()) {
                await this.copyDirRecursive(srcPath, destPath);
            }
            else {
                await this.fs.copyFile(srcPath, destPath);
            }
        }
    }
    async rollbackForDir(archiveDir) {
        if (await this.fs.exists(archiveDir)) {
            await fs.promises.rm(archiveDir, { recursive: true, force: true });
        }
    }
    async updateIndex(changeName, dateStr) {
        const indexPath = path.join(this.root, 'openspec', 'archive', 'INDEX.md');
        let existing = '';
        if (await this.fs.exists(indexPath)) {
            existing = await this.fs.readFile(indexPath);
        }
        const entry = [
            `## ${dateStr}-${changeName}`,
            `- **Change**: ${changeName}`,
            `- **Date**: ${dateStr}`,
            `- **Artifacts**:`,
            `  - proposal.md`,
            `  - design.md`,
            `  - tasks.md`,
            `  - specs/`,
            `  - reviews/`,
            `  - reports/`,
            '',
        ].join('\n');
        const header = existing ? '' : '# Archive Index\n\n';
        const content = existing ? existing.trimEnd() + '\n\n' + entry : header + entry;
        await this.fs.writeFile(indexPath, content);
    }
    detectStrategy(content) {
        if (content.match(/<!--\s*driv-merge\s*:\s*supersede\s*-->/))
            return 'supersede';
        if (content.match(/<!--\s*driv-merge\s*:\s*update\s*-->/))
            return 'update';
        if (content.match(/<!--\s*driv-merge\s*:\s*append\s*-->/))
            return 'append';
        if (content.includes('## SUPERSEDE'))
            return 'supersede';
        if (content.includes('## UPDATED Requirements'))
            return 'update';
        return 'append';
    }
    applyUpdate(mainContent, deltaContent) {
        const mainReqs = this.parseRequirements(mainContent);
        const deltaReqs = this.parseRequirements(deltaContent);
        if (deltaReqs.size === 0)
            return mainContent;
        let updated = mainContent;
        for (const [name, deltaReq] of deltaReqs) {
            if (mainReqs.has(name)) {
                const existingReq = mainReqs.get(name);
                updated = updated.replace(existingReq, deltaReq);
            }
            else {
                updated = updated.trimEnd() + '\n\n' + deltaReq;
            }
        }
        return updated;
    }
    parseRequirements(content) {
        const reqs = new Map();
        const lines = content.split('\n');
        let currentName = null;
        let currentLines = [];
        for (const line of lines) {
            const match = line.match(/^### Requirement: (.+)$/);
            if (match) {
                if (currentName) {
                    reqs.set(currentName, currentLines.join('\n'));
                }
                currentName = match[1].trim();
                currentLines = [line];
            }
            else if (currentName) {
                currentLines.push(line);
            }
        }
        if (currentName) {
            reqs.set(currentName, currentLines.join('\n'));
        }
        return reqs;
    }
    extractRequirementsSection(content) {
        const match = content.match(/## (?:ADDED |UPDATED )?Requirements?[\s\S]*/);
        return match ? match[0].trim() : content.trim();
    }
}
//# sourceMappingURL=archive-service.js.map