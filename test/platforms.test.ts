import { describe, it, expect } from 'vitest';

describe('OpenCode 平台定义', () => {
  it('包含 OpenCode 平台定义，id 为 opencode', async () => {
    const { PLATFORMS } = await import('../src/core/platforms.js');
    const opencode = PLATFORMS.find((p) => p.id === 'opencode');
    expect(opencode).toBeDefined();
    expect(opencode!.id).toBe('opencode');
  });

  it('项目级 skills 目录为 .opencode', async () => {
    const { PLATFORMS } = await import('../src/core/platforms.js');
    const opencode = PLATFORMS.find((p) => p.id === 'opencode');
    expect(opencode!.skillsDir).toBe('.opencode');
  });

  it('全局 skills 目录为 .config/opencode', async () => {
    const { PLATFORMS } = await import('../src/core/platforms.js');
    const opencode = PLATFORMS.find((p) => p.id === 'opencode');
    expect(opencode!.globalSkillsDir).toBeDefined();
    expect(opencode!.globalSkillsDir).toBe('.config/opencode');
  });

  it('映射 OpenSpec toolId 为 opencode', async () => {
    const { PLATFORMS } = await import('../src/core/platforms.js');
    const opencode = PLATFORMS.find((p) => p.id === 'opencode');
    expect(opencode!.openspecToolId).toBe('opencode');
  });
});
