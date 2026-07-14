import { FileSystem } from '../utils/file-system.js';
import { StateMachine } from './state-machine.js';
import { YamlParser } from '../utils/yaml-parser.js';
import { parseDeltaSpec } from './delta-spec-parser.js';
import * as path from 'path';

export type SpecMergeStrategy = 'append' | 'update' | 'supersede';

export interface ArchiveResult {
  archived: boolean;
  archivePath: string;
  specMerged: boolean;
  rollbackPerformed: boolean;
  errors: string[];
}

export class ArchiveService {
  private fs: FileSystem;
  private stateMachine: StateMachine;
  private parser: YamlParser;
  private root: string;

  constructor(fs: FileSystem, stateMachine: StateMachine, parser: YamlParser, root: string) {
    this.fs = fs;
    this.stateMachine = stateMachine;
    this.parser = parser;
    this.root = root;
  }

  async checkPreconditions(changeName: string): Promise<string[]> {
    const failures: string[] = [];
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

  async archive(changeName: string): Promise<ArchiveResult> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const archiveDir = path.join(this.root, 'openspec', 'archive', `${dateStr}-${changeName}`);
    const changeDir = path.join(this.root, 'openspec', 'changes', changeName);
    const errors: string[] = [];
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
      await Promise.all(
        artifacts.map(async (artifact) => {
          const src = path.join(changeDir, artifact);
          const dest = path.join(archiveDir, artifact);
          if (await this.fs.exists(src)) {
            await this.fs.copyFile(src, dest);
          }
        }),
      );

      await this.copyDirRecursive(path.join(changeDir, 'specs'), path.join(archiveDir, 'specs'));

      await this.copyDirRecursive(
        path.join(changeDir, 'reviews'),
        path.join(archiveDir, 'reviews'),
      );

      await this.copyDirRecursive(
        path.join(changeDir, 'reports'),
        path.join(archiveDir, 'reports'),
      );

      const handoffDir = path.join(changeDir, '.driv', 'handoff');
      await this.copyDirRecursive(handoffDir, path.join(archiveDir, 'handoff'));

      await this.markSuperpowersArtifacts(changeName);

      specMerged = await this.mergeDeltaSpec(changeName);

      await this.updateIndex(changeName, dateStr);

      await this.stateMachine.setField(changeName, 'archived', true);
      await this.stateMachine.setField(changeName, 'phases.archive.status', 'completed');
      await this.stateMachine.setField(
        changeName,
        'phases.archive.completedAt',
        new Date().toISOString(),
      );

      return {
        archived: true,
        archivePath: archiveDir,
        specMerged,
        rollbackPerformed: false,
        errors: [],
      };
    } catch (err) {
      errors.push((err as Error).message || String(err));
      try {
        await this.rollbackForDir(archiveDir);
        rollbackPerformed = true;
      } catch (err) {
        console.warn(`[driv] archive: rollback failed: ${(err as Error).message}`);
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

  async mergeDeltaSpec(changeName: string): Promise<boolean> {
    const specsDir = path.join(this.root, 'openspec', 'changes', changeName, 'specs');

    if (!(await this.fs.exists(specsDir))) return false;

    const capabilities = await this.fs.listDir(specsDir);
    let merged = false;

    for (const capability of capabilities) {
      const deltaSpecPath = path.join(specsDir, capability, 'spec.md');
      if (!(await this.fs.exists(deltaSpecPath))) continue;

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
      } else if (strategy === 'update' && mainExists) {
        const mainContent = await this.fs.readFile(mainSpecPath);
        const updated = this.applyUpdate(mainContent, deltaContent);
        if (updated === null) {
          const conflictPath = mainSpecPath.replace(/\.md$/, '.conflict.md');
          await this.fs.writeFile(conflictPath, deltaContent);
        } else {
          await this.fs.writeFile(mainSpecPath, updated);
          merged = true;
        }
      } else {
        if (mainExists) {
          const mainContent = await this.fs.readFile(mainSpecPath);
          const deltaSection = this.extractRequirementsSection(deltaContent);
          const appended = mainContent.trimEnd() + '\n\n' + deltaSection.trimStart();
          await this.fs.writeFile(mainSpecPath, appended);
        } else {
          await this.fs.ensureDir(mainSpecDir);
          await this.fs.writeFile(mainSpecPath, deltaContent);
        }
        merged = true;
      }
    }

    return merged;
  }

  private async markSuperpowersArtifacts(changeName: string): Promise<void> {
    const state = await this.stateMachine.getState(changeName);
    const now = new Date().toISOString();
    const changeDir = path.join(this.root, 'openspec', 'changes', changeName);
    const stamp = `\n\n---\narchived-with: ${changeName}\nstatus: final\narchived-at: ${now}\n`;

    const artifactPaths: string[] = [];
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

  async rollback(changeName: string): Promise<void> {
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
      await this.fs.rm(fullPath, { recursive: true, force: true });
    }

    // 恢复 spec backup（mergeDeltaSpec 改写主 spec 时留下的 .backup）
    await this.restoreSpecBackups(changeName);
  }

  private async restoreSpecBackups(changeName: string): Promise<void> {
    const specsDir = path.join(this.root, 'openspec', 'specs');
    if (!(await this.fs.exists(specsDir))) return;

    let entries: string[] = [];
    try {
      entries = await this.fs.listDir(specsDir);
    } catch (err) {
      console.warn(`[driv] archive: failed to list specs for restore: ${(err as Error).message}`);
      return;
    }

    for (const entry of entries) {
      const specPath = path.join(specsDir, entry, 'spec.md');
      const backupPath = specPath + '.backup';

      if (await this.fs.exists(backupPath)) {
        try {
          const backupContent = await this.fs.readFile(backupPath);
          await this.fs.writeFile(specPath, backupContent);
          await this.fs.unlink(backupPath);
        } catch (err) {
          console.warn(`[driv] archive: failed to restore spec backup: ${(err as Error).message}`);
        }
      }
    }
  }

  private async copyDirRecursive(srcDir: string, destDir: string): Promise<void> {
    if (!(await this.fs.exists(srcDir))) return;

    await this.fs.ensureDir(destDir);
    const entries = await this.fs.listDir(srcDir);

    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry);
      const destPath = path.join(destDir, entry);

      const stat = await this.fs.stat(srcPath);
      if (stat.isDirectory()) {
        await this.copyDirRecursive(srcPath, destPath);
      } else {
        await this.fs.copyFile(srcPath, destPath);
      }
    }
  }

  private async rollbackForDir(archiveDir: string): Promise<void> {
    if (await this.fs.exists(archiveDir)) {
      await this.fs.rm(archiveDir, { recursive: true, force: true });
    }
  }

  private async updateIndex(changeName: string, dateStr: string): Promise<void> {
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

  private detectStrategy(content: string): SpecMergeStrategy {
    // 优先用 DeltaSpecParser 解析
    const delta = parseDeltaSpec(content);

    if (delta.removed.length > 0) return 'supersede';
    if (delta.modified.length > 0) return 'update';
    if (delta.added.length > 0) return 'append';

    // 回退到旧的正则检测
    if (content.match(/<!--\s*driv-merge\s*:\s*supersede\s*-->/)) return 'supersede';
    if (content.match(/<!--\s*driv-merge\s*:\s*update\s*-->/)) return 'update';
    if (content.match(/<!--\s*driv-merge\s*:\s*append\s*-->/)) return 'append';

    if (content.includes('## SUPERSEDE')) return 'supersede';
    if (content.includes('## UPDATED Requirements')) return 'update';

    return 'append';
  }

  private applyUpdate(mainContent: string, deltaContent: string): string | null {
    const mainReqs = this.parseRequirements(mainContent);
    const deltaReqs = this.parseRequirements(deltaContent);

    if (deltaReqs.size === 0) return mainContent;

    let updated = mainContent;
    for (const [name, deltaReq] of deltaReqs) {
      if (mainReqs.has(name)) {
        const existingReq = mainReqs.get(name)!;
        // 使用 split/join 全局替换，避免 string.replace 只替换第一个匹配
        updated = updated.split(existingReq).join(deltaReq);
      } else {
        updated = updated.trimEnd() + '\n\n' + deltaReq;
      }
    }

    return updated;
  }

  private parseRequirements(content: string): Map<string, string> {
    const reqs = new Map<string, string>();
    const lines = content.split('\n');
    let currentName: string | null = null;
    let currentLines: string[] = [];

    for (const line of lines) {
      const match = line.match(/^### Requirement: (.+)$/);
      if (match) {
        if (currentName) {
          reqs.set(currentName, currentLines.join('\n'));
        }
        currentName = match[1].trim();
        currentLines = [line];
      } else if (currentName) {
        currentLines.push(line);
      }
    }
    if (currentName) {
      reqs.set(currentName, currentLines.join('\n'));
    }

    return reqs;
  }

  private extractRequirementsSection(content: string): string {
    const match = content.match(/## (?:ADDED |UPDATED )?Requirements?[\s\S]*/);
    return match ? match[0].trim() : content.trim();
  }
}
