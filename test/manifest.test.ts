import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Manifest', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-manifest-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loadManifest 返回默认值当 manifest 不存在', async () => {
    const { loadManifest, getDefaultManifest } = await import('../src/core/manifest.js');
    const manifest = await loadManifest(tmpDir);
    expect(manifest.version).toBe('1');
    expect(manifest.skills.length).toBeGreaterThan(0);
  });

  it('loadManifest 从 assets/ 目录读取已有 manifest', async () => {
    const { loadManifest } = await import('../src/core/manifest.js');
    const assetsDir = path.join(tmpDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    const testManifest = {
      version: '1',
      packageVersion: '0.1.0',
      assetsVersion: '1',
      skills: ['driv'],
      skillsZh: ['driv'],
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(assetsDir, 'manifest.json'), JSON.stringify(testManifest), 'utf-8');

    const manifest = await loadManifest(tmpDir);
    expect(manifest.skills).toEqual(['driv']);
  });

  it('writeManifest 写入 assets/manifest.json', async () => {
    const { writeManifest, getDefaultManifest } = await import('../src/core/manifest.js');
    const manifest = getDefaultManifest();
    await writeManifest(tmpDir, manifest);

    const content = fs.readFileSync(path.join(tmpDir, 'assets', 'manifest.json'), 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.version).toBe('1');
  });

  it('getManifestSkills 返回中英文技能列表', async () => {
    const { getManifestSkills, getDefaultManifest } = await import('../src/core/manifest.js');
    const manifest = getDefaultManifest();
    const skills = getManifestSkills(manifest, false);
    expect(skills).toContain('driv');
    const skillsZh = getManifestSkills(manifest, true);
    expect(skillsZh.length).toBeGreaterThan(0);
  });

  it('默认 manifest 包含 rules、hooks、languages', async () => {
    const { getDefaultManifest } = await import('../src/core/manifest.js');
    const manifest = getDefaultManifest();
    expect(manifest.rules).toBeDefined();
    expect(Array.isArray(manifest.rules)).toBe(true);
    expect(manifest.hooks).toBeDefined();
    expect(typeof manifest.hooks).toBe('object');
    expect(manifest.languages).toBeDefined();
    expect(manifest.languages.length).toBeGreaterThanOrEqual(1);
    expect(manifest.languages[0]).toHaveProperty('id');
    expect(manifest.languages[0]).toHaveProperty('skillsDir');
  });
});
