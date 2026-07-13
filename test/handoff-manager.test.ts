import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const TMP_DIR = path.join(os.tmpdir(), 'driv-handoff-test-' + Date.now());

beforeEach(async () => {
  await fs.promises.mkdir(TMP_DIR, { recursive: true });
});

afterEach(async () => {
  await fs.promises.rm(TMP_DIR, { recursive: true, force: true });
});

describe('HashUtils', () => {
  it('hashString 返回确定性的 hex 字符串', async () => {
    const { HashUtils } = await import('../src/core/handoff-manager.js');
    const expected = crypto.createHash('sha256').update('hello').digest('hex');
    expect(HashUtils.hashString('hello')).toBe(expected);
    expect(HashUtils.hashString('hello')).toBe(HashUtils.hashString('hello'));
  });

  it('hashFile 返回文件内容的 hash', async () => {
    const { HashUtils } = await import('../src/core/handoff-manager.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const testFs = new FileSystem(TMP_DIR);
    const filePath = path.join(TMP_DIR, 'test.txt');
    await fs.promises.writeFile(filePath, 'hello world');
    const expected = crypto.createHash('sha256').update('hello world').digest('hex');
    const hash = await HashUtils.hashFile(testFs, filePath);
    expect(hash).toBe(expected);
  });

  it('hashObject 返回确定性的对象 hash', async () => {
    const { HashUtils } = await import('../src/core/handoff-manager.js');
    const obj = { a: 1, b: [2, 3] };
    const hash = HashUtils.hashObject(obj);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64);
    expect(HashUtils.hashObject(obj)).toBe(hash);
  });
});

describe('ContextCompression', () => {
  it('off 策略返回完整上下文不变', async () => {
    const { ContextCompression } = await import('../src/core/handoff-manager.js');
    const compressor = new ContextCompression();
    const ctx = {
      summary: '完整摘要内容',
      decisions: ['d1', 'd2'],
      constraints: ['c1'],
      tasks: ['t1', 't2', 't3'],
      reviews: ['r1'],
      intent: '修复 bug',
      acceptanceCriteria: ['ac1'],
    };
    const result = compressor.compress(ctx, 'off');
    expect(result).toEqual(ctx);
  });

  it('beta 策略将长数组截断到 10 项，摘要截断到 400 字符', async () => {
    const { ContextCompression } = await import('../src/core/handoff-manager.js');
    const compressor = new ContextCompression();
    const longArray = Array.from({ length: 20 }, (_, i) => `item ${i}`);
    const ctx = {
      summary: 'x'.repeat(500),
      decisions: [...longArray],
      constraints: [...longArray],
      tasks: [...longArray],
      reviews: [...longArray],
      intent: 'x'.repeat(300),
      acceptanceCriteria: [...longArray],
    };
    const result = compressor.compress(ctx, 'beta');
    expect(result.decisions.length).toBe(10);
    expect(result.constraints.length).toBe(10);
    expect(result.tasks.length).toBe(10);
    expect(result.reviews.length).toBe(10);
    expect(result.summary.length).toBeLessThanOrEqual(400);
    expect(result.intent.length).toBeLessThanOrEqual(200);
    expect(result.acceptanceCriteria.length).toBe(10);
  });

  it('full 策略将长数组截断到 5 项，摘要截断到 200 字符', async () => {
    const { ContextCompression } = await import('../src/core/handoff-manager.js');
    const compressor = new ContextCompression();
    const longArray = Array.from({ length: 20 }, (_, i) => `item ${i}`);
    const ctx = {
      summary: 'x'.repeat(500),
      decisions: [...longArray],
      constraints: [...longArray],
      tasks: [...longArray],
      reviews: [...longArray],
      intent: 'x'.repeat(200),
      acceptanceCriteria: [...longArray],
    };
    const result = compressor.compress(ctx, 'full');
    expect(result.decisions.length).toBe(5);
    expect(result.constraints.length).toBe(5);
    expect(result.tasks.length).toBe(5);
    expect(result.reviews.length).toBe(5);
    expect(result.summary.length).toBeLessThanOrEqual(200);
    expect(result.intent.length).toBeLessThanOrEqual(100);
    expect(result.acceptanceCriteria.length).toBe(5);
  });
});

async function setupChangeDir(root: string, changeName: string): Promise<void> {
  const changeDir = path.join(root, 'openspec', 'changes', changeName);
  await fs.promises.mkdir(path.join(changeDir, 'specs', 'feature-x'), { recursive: true });
  await fs.promises.mkdir(path.join(changeDir, 'reviews'), { recursive: true });
  await fs.promises.writeFile(
    path.join(changeDir, 'proposal.md'),
    '# 提案\n\n实现用户登录功能\n\n## 目标\n提供安全的用户认证',
  );
  await fs.promises.writeFile(
    path.join(changeDir, 'design.md'),
    '# 设计\n\n## Decisions\n使用 JWT 认证\n\n## Constraints\n响应时间 < 200ms',
  );
  await fs.promises.writeFile(
    path.join(changeDir, 'tasks.md'),
    '# 任务\n\n- [ ] 实现登录 API\n- [ ] 添加 JWT 验证',
  );
  await fs.promises.writeFile(
    path.join(changeDir, 'specs', 'feature-x', 'spec.md'),
    '# 规格\n\n登录功能规格说明',
  );
  await fs.promises.writeFile(
    path.join(changeDir, 'reviews', 'requirement-review.md'),
    '# 需求评审\n\n已通过',
  );
}

describe('HandoffManager', () => {
  const changeName = 'test-change';

  it('collectSourceFiles 收集所有存在的工件', async () => {
    await setupChangeDir(TMP_DIR, changeName);
    const { HandoffManager } = await import('../src/core/handoff-manager.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const { YamlParser } = await import('../src/utils/yaml-parser.js');

    const fs_ = new FileSystem(TMP_DIR);
    const resolver = new PathResolver(TMP_DIR);
    const parser = new YamlParser(fs_);
    const manager = new HandoffManager(fs_, resolver, parser);

    const sources = await manager.collectSourceFiles(changeName);

    expect(sources.length).toBeGreaterThanOrEqual(4);
    const paths = sources.map((s) => s.path.replace(/\\/g, '/'));
    expect(paths.some((p) => p.endsWith('proposal.md'))).toBe(true);
    expect(paths.some((p) => p.endsWith('design.md'))).toBe(true);
    expect(paths.some((p) => p.endsWith('tasks.md'))).toBe(true);
    expect(paths.some((p) => p.endsWith('spec.md'))).toBe(true);
    expect(paths.some((p) => p.endsWith('requirement-review.md'))).toBe(true);

    for (const source of sources) {
      expect(source).toHaveProperty('path');
      expect(source).toHaveProperty('hash');
      expect(source).toHaveProperty('summary');
      expect(source.hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('generate 创建结构正确的 HandoffPackage', async () => {
    await setupChangeDir(TMP_DIR, changeName);
    const { HandoffManager } = await import('../src/core/handoff-manager.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const { YamlParser } = await import('../src/utils/yaml-parser.js');

    const fs_ = new FileSystem(TMP_DIR);
    const resolver = new PathResolver(TMP_DIR);
    const parser = new YamlParser(fs_);
    const manager = new HandoffManager(fs_, resolver, parser);

    const handoff = await manager.generate(changeName, 'design', 'off');

    expect(handoff.version).toBe('1.0');
    expect(handoff.change).toBe(changeName);
    expect(handoff.phase).toBe('design');
    expect(handoff.timestamp).toBeTruthy();
    expect(handoff.sources.length).toBeGreaterThan(0);
    expect(handoff.context).toBeDefined();
    expect(handoff.context.summary).toBeTruthy();
    expect(handoff.verification.totalHash).toBeTruthy();
    expect(handoff.verification.sourceCount).toBe(handoff.sources.length);

    const handoffDir = resolver.handoffDir(changeName);
    expect(fs.existsSync(path.join(handoffDir, 'handoff.json'))).toBe(true);
    expect(fs.existsSync(path.join(handoffDir, 'handoff.md'))).toBe(true);
  });

  it('generate 填充 design.md 中的 decisions 和 constraints', async () => {
    await setupChangeDir(TMP_DIR, changeName);
    const { HandoffManager } = await import('../src/core/handoff-manager.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const { YamlParser } = await import('../src/utils/yaml-parser.js');

    const fs_ = new FileSystem(TMP_DIR);
    const resolver = new PathResolver(TMP_DIR);
    const parser = new YamlParser(fs_);
    const manager = new HandoffManager(fs_, resolver, parser);

    const handoff = await manager.generate(changeName, 'design', 'off');

    expect(handoff.context.decisions.length).toBeGreaterThan(0);
    expect(handoff.context.constraints.length).toBeGreaterThan(0);
    expect(handoff.context.tasks.length).toBeGreaterThan(0);
    expect(handoff.context.reviews.length).toBeGreaterThan(0);
  });

  it('generate 兼容 design.md 中的中文标题 决策 和 约束', async () => {
    const zhChangeName = 'test-change-zh';
    const changeDir = path.join(TMP_DIR, 'openspec', 'changes', zhChangeName);
    await fs.promises.mkdir(changeDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(changeDir, 'proposal.md'),
      '# 提案\n\n实现用户登录功能',
    );
    await fs.promises.writeFile(
      path.join(changeDir, 'design.md'),
      '# 设计\n\n## 决策\n使用 JWT 认证\n采用 Redis 缓存\n\n## 约束\n响应时间 < 200ms\n必须支持高并发',
    );
    await fs.promises.writeFile(path.join(changeDir, 'tasks.md'), '# 任务\n\n- [ ] 实现登录 API');

    const { HandoffManager } = await import('../src/core/handoff-manager.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const { YamlParser } = await import('../src/utils/yaml-parser.js');

    const fs_ = new FileSystem(TMP_DIR);
    const resolver = new PathResolver(TMP_DIR);
    const parser = new YamlParser(fs_);
    const manager = new HandoffManager(fs_, resolver, parser);

    const handoff = await manager.generate(zhChangeName, 'design', 'off');

    expect(handoff.context.decisions).toContain('使用 JWT 认证');
    expect(handoff.context.decisions).toContain('采用 Redis 缓存');
    expect(handoff.context.constraints).toContain('响应时间 < 200ms');
    expect(handoff.context.constraints).toContain('必须支持高并发');
  });

  it('generate 使用 beta 压缩策略', async () => {
    await setupChangeDir(TMP_DIR, changeName);
    const { HandoffManager } = await import('../src/core/handoff-manager.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const { YamlParser } = await import('../src/utils/yaml-parser.js');

    const fs_ = new FileSystem(TMP_DIR);
    const resolver = new PathResolver(TMP_DIR);
    const parser = new YamlParser(fs_);
    const manager = new HandoffManager(fs_, resolver, parser);

    const handoff = await manager.generate(changeName, 'design', 'beta');

    expect(handoff.context).toBeDefined();
  });

  it('validate 对有效 handoff 返回 true', async () => {
    await setupChangeDir(TMP_DIR, changeName);
    const { HandoffManager } = await import('../src/core/handoff-manager.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const { YamlParser } = await import('../src/utils/yaml-parser.js');

    const fs_ = new FileSystem(TMP_DIR);
    const resolver = new PathResolver(TMP_DIR);
    const parser = new YamlParser(fs_);
    const manager = new HandoffManager(fs_, resolver, parser);

    await manager.generate(changeName, 'design', 'off');
    const valid = await manager.validate(changeName, 'design');
    expect(valid).toBe(true);
  });

  it('validate 在源文件被篡改后返回 false', async () => {
    await setupChangeDir(TMP_DIR, changeName);
    const { HandoffManager } = await import('../src/core/handoff-manager.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const { YamlParser } = await import('../src/utils/yaml-parser.js');

    const fs_ = new FileSystem(TMP_DIR);
    const resolver = new PathResolver(TMP_DIR);
    const parser = new YamlParser(fs_);
    const manager = new HandoffManager(fs_, resolver, parser);

    await manager.generate(changeName, 'design', 'off');

    const changeDir = path.join(TMP_DIR, 'openspec', 'changes', changeName);
    await fs.promises.writeFile(path.join(changeDir, 'proposal.md'), '# 被篡改的提案');

    const valid = await manager.validate(changeName, 'design');
    expect(valid).toBe(false);
  });
});

describe('Intent 抽取和验收标准', () => {
  async function setupCustomChange(
    root: string,
    changeName: string,
    files: Record<string, string>,
  ): Promise<void> {
    const changeDir = path.join(root, 'openspec', 'changes', changeName);
    await fs.promises.mkdir(changeDir, { recursive: true });
    for (const [fileName, content] of Object.entries(files)) {
      const filePath = path.join(changeDir, fileName);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, content);
    }
  }

  async function createManager(root: string) {
    const { HandoffManager } = await import('../src/core/handoff-manager.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const { YamlParser } = await import('../src/utils/yaml-parser.js');
    const fs_ = new FileSystem(root);
    const resolver = new PathResolver(root);
    const parser = new YamlParser(fs_);
    return new HandoffManager(fs_, resolver, parser);
  }

  it('proposal.md 包含 ## Intent 章节时，handoff.context.intent 被正确填充', async () => {
    await setupCustomChange(TMP_DIR, 'intent-en', {
      'proposal.md':
        '# 提案\n\n## Intent\n修复 login timeout 问题\n\n## 其他\n其他内容',
      'design.md': '# 设计',
      'tasks.md': '# 任务',
    });
    const manager = await createManager(TMP_DIR);
    const handoff = await manager.generate('intent-en', 'design', 'off');
    expect(handoff.context.intent).toBe('修复 login timeout 问题');
  });

  it('proposal.md 包含 ## 目标 章节时，handoff.context.intent 被正确填充', async () => {
    await setupCustomChange(TMP_DIR, 'intent-zh', {
      'proposal.md':
        '# 提案\n\n实现用户登录功能\n\n## 目标\n提供安全的用户认证\n\n## 其他\n其他内容',
      'design.md': '# 设计',
      'tasks.md': '# 任务',
    });
    const manager = await createManager(TMP_DIR);
    const handoff = await manager.generate('intent-zh', 'design', 'off');
    expect(handoff.context.intent).toBe('提供安全的用户认证');
  });

  it('proposal.md 不包含 Intent 章节时，handoff.context.intent 为空字符串', async () => {
    await setupCustomChange(TMP_DIR, 'intent-none', {
      'proposal.md': '# 提案\n\n实现用户登录功能\n\n## 背景\n背景内容',
      'design.md': '# 设计',
      'tasks.md': '# 任务',
    });
    const manager = await createManager(TMP_DIR);
    const handoff = await manager.generate('intent-none', 'design', 'off');
    expect(handoff.context.intent).toBe('');
  });

  it('tasks.md 包含验收标准时，handoff.context.acceptanceCriteria 被填充', async () => {
    await setupCustomChange(TMP_DIR, 'ac-present', {
      'proposal.md': '# 提案',
      'design.md': '# 设计',
      'tasks.md':
        '# 任务\n\n- [ ] 实现登录 API\n\n## 验收标准\n\n- 登录成功返回 token\n- 登录失败返回 401',
    });
    const manager = await createManager(TMP_DIR);
    const handoff = await manager.generate('ac-present', 'design', 'off');
    expect(handoff.context.acceptanceCriteria.length).toBeGreaterThanOrEqual(2);
    expect(handoff.context.acceptanceCriteria).toContain('登录成功返回 token');
    expect(handoff.context.acceptanceCriteria).toContain('登录失败返回 401');
  });

  it('tasks.md 不包含验收标准时，handoff.context.acceptanceCriteria 为空数组', async () => {
    await setupCustomChange(TMP_DIR, 'ac-absent', {
      'proposal.md': '# 提案',
      'design.md': '# 设计',
      'tasks.md': '# 任务\n\n- [ ] 实现登录 API',
    });
    const manager = await createManager(TMP_DIR);
    const handoff = await manager.generate('ac-absent', 'design', 'off');
    expect(handoff.context.acceptanceCriteria).toEqual([]);
  });

  it('tasks.md 包含 验收标准： 行形式时，acceptanceCriteria 被填充', async () => {
    await setupCustomChange(TMP_DIR, 'ac-inline', {
      'proposal.md': '# 提案',
      'design.md': '# 设计',
      'tasks.md':
        '# 任务\n\n- [ ] 实现登录 API\n  验收标准：返回 JWT token\n- [ ] 添加 JWT 验证\n  Acceptance: 401 on invalid token',
    });
    const manager = await createManager(TMP_DIR);
    const handoff = await manager.generate('ac-inline', 'design', 'off');
    expect(handoff.context.acceptanceCriteria).toContain('返回 JWT token');
    expect(handoff.context.acceptanceCriteria).toContain('401 on invalid token');
  });
});
