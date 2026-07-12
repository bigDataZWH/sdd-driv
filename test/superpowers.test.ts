import { describe, it, expect } from 'vitest';

describe('getNpxExecutable', () => {
  it('Windows 下返回 npx.cmd', async () => {
    const { getNpxExecutable } = await import('../src/core/superpowers.js');
    expect(getNpxExecutable('win32')).toBe('npx.cmd');
  });

  it('非 Windows 下返回 npx', async () => {
    const { getNpxExecutable } = await import('../src/core/superpowers.js');
    expect(getNpxExecutable('linux')).toBe('npx');
    expect(getNpxExecutable('darwin')).toBe('npx');
  });
});

describe('buildSuperpowersInstallCommand', () => {
  it('构造 npx skills add 命令，包含 opencode agent', async () => {
    const { buildSuperpowersInstallCommand } = await import('../src/core/superpowers.js');
    const result = buildSuperpowersInstallCommand('/project', 'project', ['opencode']);
    expect(result.command).toBe(process.platform === 'win32' ? 'npx.cmd' : 'npx');
    expect(result.args).toContain('skills');
    expect(result.args).toContain('add');
    expect(result.args).toContain('obra/superpowers');
    expect(result.args).toContain('-y');
    expect(result.args).toContain('--agent');
    expect(result.args).toContain('opencode');
  });

  it('scope=global 时添加 -g 参数', async () => {
    const { buildSuperpowersInstallCommand } = await import('../src/core/superpowers.js');
    const result = buildSuperpowersInstallCommand('/project', 'global', ['opencode']);
    expect(result.args).toContain('-g');
  });
});

describe('installSuperpowersForPlatforms', () => {
  it('传入空平台列表时返回 skipped', async () => {
    const { installSuperpowersForPlatforms } = await import('../src/core/superpowers.js');
    const result = await installSuperpowersForPlatforms('/tmp/sp-test', 'project', []);
    expect(result).toBe('skipped');
  });
});
