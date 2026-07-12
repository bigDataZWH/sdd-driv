import { describe, it, expect } from 'vitest';

describe('getNpmExecutable', () => {
  it('Windows 下返回 npm.cmd', async () => {
    const { getNpmExecutable } = await import('../src/core/openspec.js');
    expect(getNpmExecutable('win32')).toBe('npm.cmd');
  });

  it('非 Windows 下返回 npm', async () => {
    const { getNpmExecutable } = await import('../src/core/openspec.js');
    expect(getNpmExecutable('linux')).toBe('npm');
    expect(getNpmExecutable('darwin')).toBe('npm');
  });
});

describe('isCommandAvailable', () => {
  it('存在的命令返回 true', async () => {
    const { isCommandAvailable } = await import('../src/core/openspec.js');
    const result = isCommandAvailable(process.platform === 'win32' ? 'where' : 'echo');
    expect(result).toBe(true);
  });

  it('不存在的命令返回 false', async () => {
    const { isCommandAvailable } = await import('../src/core/openspec.js');
    expect(isCommandAvailable('this-command-does-not-exist-12345')).toBe(false);
  });
});

describe('buildOpenSpecInitInvocation', () => {
  it('生成 OpenSpec init 命令参数，包含 --profile', async () => {
    const { buildOpenSpecInitInvocation } = await import('../src/core/openspec.js');
    const result = buildOpenSpecInitInvocation('/project', ['opencode'], 'project', true);
    expect(result.command).toBe('openspec');
    expect(result.args).toContain('init');
    expect(result.args).toContain('/project');
    expect(result.args).toContain('--tools');
    expect(result.args).toContain('opencode');
    expect(result.args).toContain('--profile');
    expect(result.args).toContain('custom');
  });

  it('includeProfile=false 时不包含 --profile', async () => {
    const { buildOpenSpecInitInvocation } = await import('../src/core/openspec.js');
    const result = buildOpenSpecInitInvocation('/project', ['opencode'], 'project', false);
    expect(result.args).not.toContain('--profile');
  });

  it('useNpx=true 时使用 npx 调用 openspec', async () => {
    const { buildOpenSpecInitInvocation } = await import('../src/core/openspec.js');
    const result = buildOpenSpecInitInvocation('/project', ['opencode'], 'project', true, true);
    expect(result.command).toBe(process.platform === 'win32' ? 'npx.cmd' : 'npx');
    expect(result.args).toContain('-y');
    expect(result.args).toContain('@fission-ai/openspec');
    expect(result.args).toContain('init');
    expect(result.args).toContain('/project');
  });

  it('useNpx=true 且 includeProfile=false 时不包含 --profile', async () => {
    const { buildOpenSpecInitInvocation } = await import('../src/core/openspec.js');
    const result = buildOpenSpecInitInvocation('/project', ['opencode'], 'project', false, true);
    expect(result.args).not.toContain('--profile');
  });
});

describe('installOpenSpec', () => {
  it('CLI 不可用时返回 failed', async () => {
    const { installOpenSpec } = await import('../src/core/openspec.js');
    const result = await installOpenSpec('/tmp/nonexistent-project', ['opencode'], 'project');
    expect(['failed', 'installed']).toContain(result);
  });
});
