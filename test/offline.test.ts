import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  resolveBundle,
  installOpenSpecOffline,
  installSuperpowersOffline,
  type BundleManifest,
} from '../src/core/offline.js';

describe('offline bundle', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-offline-'));
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  describe('resolveBundle', () => {
    it('目录不存在时返回 null', async () => {
      const result = await resolveBundle(path.join(tmpDir, 'nonexistent'));
      expect(result).toBeNull();
    });

    it('空 bundle 目录返回 null 各组件路径', async () => {
      const result = await resolveBundle(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.drivTarball).toBeNull();
      expect(result!.openspecTarball).toBeNull();
      expect(result!.codegraphTarball).toBeNull();
      expect(result!.superpowersDir).toBeNull();
    });

    it('按约定探测 tarball 文件', async () => {
      // 创建模拟 tarball 文件
      await fs.promises.writeFile(path.join(tmpDir, 'driv-0.1.0.tgz'), 'fake');
      await fs.promises.writeFile(path.join(tmpDir, 'openspec-1.0.0.tgz'), 'fake');
      await fs.promises.writeFile(path.join(tmpDir, 'codegraph-2.0.0.tgz'), 'fake');

      const result = await resolveBundle(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.drivTarball).toBe(path.join(tmpDir, 'driv-0.1.0.tgz'));
      expect(result!.openspecTarball).toBe(path.join(tmpDir, 'openspec-1.0.0.tgz'));
      expect(result!.codegraphTarball).toBe(path.join(tmpDir, 'codegraph-2.0.0.tgz'));
    });

    it('按约定探测 superpowers 目录', async () => {
      await fs.promises.mkdir(path.join(tmpDir, 'superpowers', 'skills', 'brainstorming'), {
        recursive: true,
      });
      await fs.promises.writeFile(
        path.join(tmpDir, 'superpowers', 'skills', 'brainstorming', 'SKILL.md'),
        '---\nname: brainstorming\n---\nbody',
      );

      const result = await resolveBundle(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.superpowersDir).toBe(path.join(tmpDir, 'superpowers'));
    });

    it('优先使用 bundle.json 清单中的显式路径', async () => {
      await fs.promises.writeFile(path.join(tmpDir, 'driv-0.1.0.tgz'), 'fake');
      const manifest: BundleManifest = {
        drivVersion: '0.1.0',
        createdAt: '2025-01-01T00:00:00.000Z',
        contents: {
          driv: 'driv-0.1.0.tgz',
        },
      };
      await fs.promises.writeFile(
        path.join(tmpDir, 'bundle.json'),
        JSON.stringify(manifest, null, 2),
      );

      const result = await resolveBundle(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.manifest.drivVersion).toBe('0.1.0');
      expect(result!.drivTarball).toBe(path.join(tmpDir, 'driv-0.1.0.tgz'));
    });
  });

  describe('installOpenSpecOffline', () => {
    it('写入最小化 openspec/config.yaml', async () => {
      const status = await installOpenSpecOffline(tmpDir);
      expect(status).toBe('installed');
      expect(fs.existsSync(path.join(tmpDir, 'openspec', 'config.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'openspec', 'changes'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'openspec', 'specs'))).toBe(true);

      const content = fs.readFileSync(
        path.join(tmpDir, 'openspec', 'config.yaml'),
        'utf-8',
      );
      expect(content).toContain('profile: custom');
    });

    it('已存在 config.yaml 时返回 skipped', async () => {
      await fs.promises.mkdir(path.join(tmpDir, 'openspec'), { recursive: true });
      await fs.promises.writeFile(
        path.join(tmpDir, 'openspec', 'config.yaml'),
        'existing',
      );

      const status = await installOpenSpecOffline(tmpDir);
      expect(status).toBe('skipped');
    });
  });

  describe('installSuperpowersOffline', () => {
    it('从 bundle 复制 superpowers skills 到目标平台', async () => {
      // 准备 bundle superpowers 目录
      const bundlePath = tmpDir;
      const spSourceDir = path.join(bundlePath, 'superpowers', 'skills');
      await fs.promises.mkdir(path.join(spSourceDir, 'brainstorming'), { recursive: true });
      await fs.promises.writeFile(
        path.join(spSourceDir, 'brainstorming', 'SKILL.md'),
        '---\nname: brainstorming\n---\nbody',
      );

      const bundle = await resolveBundle(bundlePath);
      expect(bundle).not.toBeNull();
      expect(bundle!.superpowersDir).not.toBeNull();

      // 安装到目标项目
      const targetDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-target-'));
      try {
        const result = await installSuperpowersOffline(
          targetDir,
          'project',
          ['opencode'],
          bundle!,
        );
        expect(result.status).toBe('installed');
        expect(result.copied).toBeGreaterThan(0);
        expect(
          fs.existsSync(
            path.join(targetDir, '.opencode', 'skills', 'brainstorming', 'SKILL.md'),
          ),
        ).toBe(true);
      } finally {
        await fs.promises.rm(targetDir, { recursive: true, force: true });
      }
    });

    it('bundle 无 superpowers 内容时返回 skipped', async () => {
      const bundle = await resolveBundle(tmpDir);
      expect(bundle).not.toBeNull();

      const result = await installSuperpowersOffline(
        tmpDir,
        'project',
        ['opencode'],
        bundle!,
      );
      expect(result.status).toBe('skipped');
      expect(result.copied).toBe(0);
    });
  });
});
