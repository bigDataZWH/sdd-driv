import * as crypto from 'crypto';
import * as path from 'path';
import { FileSystem } from '../utils/file-system.js';
import { PathResolver } from './path-resolver.js';
import { YamlParser } from '../utils/yaml-parser.js';
import { Phase } from './types.js';

export interface SourceFile {
  path: string;
  hash: string;
  summary: string;
}

export interface CompressedContext {
  summary: string;
  decisions: string[];
  constraints: string[];
  tasks: string[];
  reviews: string[];
  intent: string;
  acceptanceCriteria: string[];
}

export interface VerificationInfo {
  totalHash: string;
  sourceCount: number;
}

export interface HandoffPackage {
  version: string;
  change: string;
  phase: Phase;
  timestamp: string;
  sources: SourceFile[];
  context: CompressedContext;
  verification: VerificationInfo;
}

export class HashUtils {
  static hashString(input: string): string {
    return crypto.createHash('sha256').update(input, 'utf-8').digest('hex');
  }

  static hashObject(obj: unknown): string {
    const str = JSON.stringify(obj, Object.keys(obj as object).sort());
    return HashUtils.hashString(str);
  }

  static async hashFile(fs: FileSystem, filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return HashUtils.hashString(content);
  }
}

export class ContextCompression {
  compress(context: CompressedContext, strategy: 'off' | 'beta' | 'full'): CompressedContext {
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
          intent: context.intent.length > 200 ? context.intent.slice(0, 200) : context.intent,
          acceptanceCriteria: context.acceptanceCriteria.slice(0, 10),
        };
      case 'full':
        return {
          summary: context.summary.length > 200 ? context.summary.slice(0, 200) : context.summary,
          decisions: context.decisions.slice(0, 5),
          constraints: context.constraints.slice(0, 5),
          tasks: context.tasks.slice(0, 5),
          reviews: context.reviews.slice(0, 5),
          intent: context.intent.length > 100 ? context.intent.slice(0, 100) : context.intent,
          acceptanceCriteria: context.acceptanceCriteria.slice(0, 5),
        };
    }
  }
}

export class HandoffManager {
  constructor(
    private fs: FileSystem,
    private resolver: PathResolver,
    private parser: YamlParser,
  ) {}

  async collectSourceFiles(changeName: string): Promise<SourceFile[]> {
    const changeDir = this.resolver.changeDir(changeName);
    const sources: SourceFile[] = [];

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

  async generate(changeName: string, phase: Phase, compression?: string): Promise<HandoffPackage> {
    const sources = await this.collectSourceFiles(changeName);
    const context = await this.buildContext(changeName);
    const compressor = new ContextCompression();
    const compressedContext = compression
      ? compressor.compress(context, compression as 'off' | 'beta' | 'full')
      : context;

    const totalHash = HashUtils.hashObject({
      sources: sources.map((s) => ({ path: this.resolver.normalize(s.path), hash: s.hash })),
      context: compressedContext,
    });

    const handoff: HandoffPackage = {
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

  async validate(changeName: string, _phase: Phase): Promise<boolean> {
    const handoffDir = this.resolver.handoffDir(changeName);
    const handoffPath = path.join(handoffDir, 'handoff.json');

    if (!(await this.fs.exists(handoffPath))) {
      return false;
    }

    let handoff: HandoffPackage;
    try {
      handoff = await this.fs.readJson<HandoffPackage>(handoffPath);
    } catch {
      return false;
    }

    for (const source of handoff.sources) {
      try {
        const content = await this.fs.readFile(source.path);
        const expectedHash = HashUtils.hashString(content);
        if (expectedHash !== source.hash) {
          return false;
        }
      } catch {
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

  async getMismatchedFiles(changeName: string): Promise<string[]> {
    const handoffDir = this.resolver.handoffDir(changeName);
    const handoffPath = path.join(handoffDir, 'handoff.json');

    if (!(await this.fs.exists(handoffPath))) {
      return [];
    }

    let handoff: HandoffPackage;
    try {
      handoff = await this.fs.readJson<HandoffPackage>(handoffPath);
    } catch {
      return [];
    }

    const mismatched: string[] = [];
    for (const source of handoff.sources) {
      try {
        const content = await this.fs.readFile(source.path);
        const expectedHash = HashUtils.hashString(content);
        if (expectedHash !== source.hash) {
          mismatched.push(source.path);
        }
      } catch {
        mismatched.push(source.path);
      }
    }

    return mismatched;
  }

  async getHandoffPackage(changeName: string): Promise<HandoffPackage | null> {
    const handoffDir = this.resolver.handoffDir(changeName);
    const handoffPath = path.join(handoffDir, 'handoff.json');

    if (!(await this.fs.exists(handoffPath))) {
      return null;
    }

    try {
      return await this.fs.readJson<HandoffPackage>(handoffPath);
    } catch {
      return null;
    }
  }

  async readChangeFile(changeName: string, fileName: string): Promise<string | null> {
    const filePath = path.join(this.resolver.changeDir(changeName), fileName);
    if (!(await this.fs.exists(filePath))) {
      return null;
    }
    try {
      return await this.fs.readFile(filePath);
    } catch {
      return null;
    }
  }

  private async hashAndSummarize(filePath: string): Promise<SourceFile> {
    const content = await this.fs.readFile(filePath);
    const hash = HashUtils.hashString(content);
    const summary = content.slice(0, 200).replace(/\n/g, ' ').trim();
    return {
      path: this.resolver.normalize(filePath),
      hash,
      summary,
    };
  }

  private async buildContext(changeName: string): Promise<CompressedContext> {
    const changeDir = this.resolver.changeDir(changeName);
    let summaryText = '';
    let intent = '';

    const proposalPath = path.join(changeDir, 'proposal.md');
    if (await this.fs.exists(proposalPath)) {
      const proposalContent = await this.fs.readFile(proposalPath);
      summaryText = proposalContent.slice(0, 500);
      intent = this.extractIntent(proposalContent);
    }

    const decisions: string[] = [];
    const constraints: string[] = [];

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
        if (!trimmed) continue;
        if (currentSection === 'decisions') {
          decisions.push(trimmed);
        } else if (currentSection === 'constraints') {
          constraints.push(trimmed);
        }
      }
    }

    const tasks: string[] = [];
    const acceptanceCriteria: string[] = [];
    const tasksPath = path.join(changeDir, 'tasks.md');
    if (await this.fs.exists(tasksPath)) {
      const tasksContent = await this.fs.readFile(tasksPath);
      for (const line of tasksContent.split('\n')) {
        const taskMatch = line.match(/-\s+\[.?\]\s+(.+)/);
        if (taskMatch) {
          tasks.push(taskMatch[1].trim());
        }
      }
      const extracted = this.extractAcceptanceCriteria(tasksContent);
      for (const ac of extracted) {
        acceptanceCriteria.push(ac);
      }
    }

    const reviews: string[] = [];
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
      intent,
      acceptanceCriteria,
    };
  }

  private extractIntent(proposalContent: string): string {
    let inIntentSection = false;
    const paragraphLines: string[] = [];
    let paragraphDone = false;
    for (const line of proposalContent.split('\n')) {
      const sectionMatch = line.match(/^##\s+(.+)/);
      if (sectionMatch) {
        if (inIntentSection) {
          break;
        }
        const heading = sectionMatch[1].toLowerCase().trim();
        if (heading === 'intent' || heading === '目标' || heading === '意图') {
          inIntentSection = true;
        }
        continue;
      }
      if (inIntentSection && !paragraphDone) {
        const trimmed = line.trim();
        if (trimmed) {
          paragraphLines.push(trimmed);
        } else if (paragraphLines.length > 0) {
          paragraphDone = true;
        }
      }
    }
    return paragraphLines.join(' ');
  }

  private extractAcceptanceCriteria(tasksContent: string): string[] {
    const criteria: string[] = [];
    let currentSection = '';
    for (const line of tasksContent.split('\n')) {
      const sectionMatch = line.match(/^##\s+(.+)/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].toLowerCase().trim();
        continue;
      }
      if (
        currentSection === '验收标准' ||
        currentSection === 'acceptance criteria' ||
        currentSection === 'acceptance'
      ) {
        const trimmed = line.replace(/^[-*\s]+/, '').trim();
        if (trimmed) {
          criteria.push(trimmed);
        }
        continue;
      }
      const acMatch = line.match(/^\s*(?:验收标准|Acceptance|验证)\s*[:：]\s*(.+)/i);
      if (acMatch) {
        const value = acMatch[1].trim();
        if (value) {
          criteria.push(value);
        }
      }
    }
    return criteria;
  }

  private async writeHandoffFiles(changeName: string, handoff: HandoffPackage): Promise<void> {
    const handoffDir = this.resolver.handoffDir(changeName);
    await this.fs.ensureDir(handoffDir);

    await this.fs.writeFile(
      path.join(handoffDir, 'handoff.json'),
      JSON.stringify(handoff, null, 2),
    );

    const md = this.generateMarkdown(handoff);
    await this.fs.writeFile(path.join(handoffDir, 'handoff.md'), md);
  }

  private generateMarkdown(handoff: HandoffPackage): string {
    const lines: string[] = [
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
    if (handoff.context.intent) {
      lines.push(`### 意图 (Intent)\n\n${handoff.context.intent}\n`);
    }
    lines.push(`### 决策 (${handoff.context.decisions.length})`);
    for (const d of handoff.context.decisions) lines.push(`- ${d}`);
    lines.push('');
    lines.push(`### 约束 (${handoff.context.constraints.length})`);
    for (const c of handoff.context.constraints) lines.push(`- ${c}`);
    lines.push('');
    lines.push(`### 任务 (${handoff.context.tasks.length})`);
    for (const t of handoff.context.tasks) lines.push(`- ${t}`);
    lines.push('');
    if (handoff.context.acceptanceCriteria.length > 0) {
      lines.push(`### 验收标准 (${handoff.context.acceptanceCriteria.length})`);
      for (const ac of handoff.context.acceptanceCriteria) lines.push(`- ${ac}`);
      lines.push('');
    }
    lines.push(`### 评审 (${handoff.context.reviews.length})`);
    for (const r of handoff.context.reviews) lines.push(`- ${r}`);
    lines.push('');

    lines.push('## 验证', '');
    lines.push(`- 总 Hash: \`${handoff.verification.totalHash}\``);
    lines.push(`- 源文件数: ${handoff.verification.sourceCount}`);

    return lines.join('\n');
  }
}
