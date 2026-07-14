import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('detectPlatforms', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-detect-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('空目录返回空集合', async () => {
    const { detectPlatforms } = await import('../src/core/detect.js');
    const result = await detectPlatforms(tmpDir);
    expect(result.size).toBe(0);
  });

  it('检测到 .opencode 目录时返回 opencode 平台', async () => {
    const { detectPlatforms } = await import('../src/core/detect.js');
    fs.mkdirSync(path.join(tmpDir, '.opencode'), { recursive: true });
    const result = await detectPlatforms(tmpDir);
    expect(result.has('opencode')).toBe(true);
  });

  it('检测到 .claude 目录时返回 claude 平台', async () => {
    const { detectPlatforms } = await import('../src/core/detect.js');
    fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    const result = await detectPlatforms(tmpDir);
    expect(result.has('claude')).toBe(true);
  });

  it('检测到 .github/copilot-instructions.md 时返回 github-copilot 平台', async () => {
    const { detectPlatforms } = await import('../src/core/detect.js');
    fs.mkdirSync(path.join(tmpDir, '.github'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.github', 'copilot-instructions.md'), '', 'utf-8');
    const result = await detectPlatforms(tmpDir);
    expect(result.has('github-copilot')).toBe(true);
  });

  it('检测到 .cursor 目录时返回 cursor 平台', async () => {
    const { detectPlatforms } = await import('../src/core/detect.js');
    fs.mkdirSync(path.join(tmpDir, '.cursor'), { recursive: true });
    const result = await detectPlatforms(tmpDir);
    expect(result.has('cursor')).toBe(true);
  });

  it('同时检测多个平台', async () => {
    const { detectPlatforms } = await import('../src/core/detect.js');
    fs.mkdirSync(path.join(tmpDir, '.opencode'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    const result = await detectPlatforms(tmpDir);
    expect(result.has('opencode')).toBe(true);
    expect(result.has('claude')).toBe(true);
    expect(result.size).toBeGreaterThanOrEqual(2);
  });

  it('github-copilot 检测 .github/instructions 目录', async () => {
    const { detectPlatforms } = await import('../src/core/detect.js');
    fs.mkdirSync(path.join(tmpDir, '.github', 'instructions'), { recursive: true });
    const result = await detectPlatforms(tmpDir);
    expect(result.has('github-copilot')).toBe(true);
  });
});

describe('hasSkills', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-skills-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('superpowers 技能存在时返回 true', async () => {
    const { hasSkills } = await import('../src/core/detect.js');
    const { PLATFORMS } = await import('../src/core/platforms.js');
    const cursor = PLATFORMS.find((p) => p.id === 'cursor')!;
    fs.mkdirSync(path.join(tmpDir, '.cursor', 'skills', 'brainstorming'), { recursive: true });
    const result = await hasSkills(tmpDir, cursor, 'superpowers', [], 'global');
    expect(result).toBe(true);
  });

  it('superpowers 技能不存在时返回 false', async () => {
    const { hasSkills } = await import('../src/core/detect.js');
    const { PLATFORMS } = await import('../src/core/platforms.js');
    const cursor = PLATFORMS.find((p) => p.id === 'cursor')!;
    fs.mkdirSync(path.join(tmpDir, '.cursor', 'skills'), { recursive: true });
    const result = await hasSkills(tmpDir, cursor, 'superpowers', [], 'global');
    expect(result).toBe(false);
  });

  it('openspec 技能存在时返回 true', async () => {
    const { hasSkills } = await import('../src/core/detect.js');
    const { PLATFORMS } = await import('../src/core/platforms.js');
    const cursor = PLATFORMS.find((p) => p.id === 'cursor')!;
    fs.mkdirSync(path.join(tmpDir, '.cursor', 'skills', 'openspec-init'), { recursive: true });
    const result = await hasSkills(tmpDir, cursor, 'openspec', [], 'global');
    expect(result).toBe(true);
  });

  it('driv 技能存在时返回 true (非 opencode/trae 平台)', async () => {
    const { hasSkills } = await import('../src/core/detect.js');
    const { PLATFORMS } = await import('../src/core/platforms.js');
    const cursor = PLATFORMS.find((p) => p.id === 'cursor')!;
    fs.mkdirSync(path.join(tmpDir, '.cursor', 'skills', 'driv-init'), { recursive: true });
    const result = await hasSkills(tmpDir, cursor, 'driv', [], 'global');
    expect(result).toBe(true);
  });

  it('skills 目录不存在时返回 false', async () => {
    const { hasSkills } = await import('../src/core/detect.js');
    const { PLATFORMS } = await import('../src/core/platforms.js');
    const cursor = PLATFORMS.find((p) => p.id === 'cursor')!;
    const result = await hasSkills(tmpDir, cursor, 'superpowers', [], 'global');
    expect(result).toBe(false);
  });
});

describe('hasOpenCodePluginSuperpowers', () => {
  let tmpConfigDir: string;
  let oldEnv: string | undefined;

  beforeEach(() => {
    tmpConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-opencode-'));
    oldEnv = process.env.OPENCODE_CONFIG_DIR;
    process.env.OPENCODE_CONFIG_DIR = tmpConfigDir;
  });

  afterEach(() => {
    if (oldEnv === undefined) {
      delete process.env.OPENCODE_CONFIG_DIR;
    } else {
      process.env.OPENCODE_CONFIG_DIR = oldEnv;
    }
    fs.rmSync(tmpConfigDir, { recursive: true, force: true });
  });

  it('superpowers/skills 目录包含已知技能时返回 true', async () => {
    const { hasOpenCodePluginSuperpowers } = await import('../src/core/detect.js');
    fs.mkdirSync(path.join(tmpConfigDir, 'superpowers', 'skills', 'brainstorming'), {
      recursive: true,
    });
    const result = await hasOpenCodePluginSuperpowers();
    expect(result).toBe(true);
  });

  it('opencode.json 中 plugin 数组包含 superpowers 时返回 true', async () => {
    const { hasOpenCodePluginSuperpowers } = await import('../src/core/detect.js');
    fs.writeFileSync(
      path.join(tmpConfigDir, 'opencode.json'),
      JSON.stringify({ plugin: ['some/superpowers-plugin'] }),
      'utf-8',
    );
    const result = await hasOpenCodePluginSuperpowers();
    expect(result).toBe(true);
  });

  it('无 superpowers 配置时返回 false', async () => {
    const { hasOpenCodePluginSuperpowers } = await import('../src/core/detect.js');
    const result = await hasOpenCodePluginSuperpowers();
    expect(result).toBe(false);
  });

  it('opencode.json 无 plugin 字段时返回 false', async () => {
    const { hasOpenCodePluginSuperpowers } = await import('../src/core/detect.js');
    fs.writeFileSync(
      path.join(tmpConfigDir, 'opencode.json'),
      JSON.stringify({ other: 'value' }),
      'utf-8',
    );
    const result = await hasOpenCodePluginSuperpowers();
    expect(result).toBe(false);
  });

  it('opencode.json plugin 数组不含 superpowers 时返回 false', async () => {
    const { hasOpenCodePluginSuperpowers } = await import('../src/core/detect.js');
    fs.writeFileSync(
      path.join(tmpConfigDir, 'opencode.json'),
      JSON.stringify({ plugin: ['some/other-plugin'] }),
      'utf-8',
    );
    const result = await hasOpenCodePluginSuperpowers();
    expect(result).toBe(false);
  });
});
