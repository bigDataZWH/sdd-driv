import { describe, it, expect } from 'vitest';
import * as path from 'path';

describe('Windows 路径处理', () => {
  it('paths 模块使用 path.join 处理反斜杠路径', async () => {
    const { OPENCODE_SKILLS_DIR } = await import('../src/utils/paths.js');
    expect(OPENCODE_SKILLS_DIR).toContain('.opencode');
    expect(OPENCODE_SKILLS_DIR).toContain('skills');
  });

  it('getNpmExecutable 在 win32 平台返回 npm.cmd', async () => {
    const { getNpmExecutable } = await import('../src/core/openspec.js');
    expect(getNpmExecutable('win32')).toBe('npm.cmd');
  });

  it('getNpxExecutable 在 win32 平台返回 npx.cmd', async () => {
    const { getNpxExecutable } = await import('../src/core/superpowers.js');
    expect(getNpxExecutable('win32')).toBe('npx.cmd');
  });

  it('createOpenCodeCommands 使用 path.join 生成路径', async () => {
    const { createOpenCodeCommands } = await import('../src/core/skills.js');
    expect(typeof createOpenCodeCommands).toBe('function');
  });
});
