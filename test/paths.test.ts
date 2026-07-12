import { describe, it, expect } from 'vitest';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();

describe('路径常量', () => {
  it('定义 .opencode/skills 路径为项目相对路径', async () => {
    const { OPENCODE_SKILLS_DIR } = await import('../src/utils/paths.js');
    expect(OPENCODE_SKILLS_DIR).toBe(path.join(PROJECT_ROOT, '.opencode', 'skills'));
  });

  it('定义 .opencode/commands 路径为项目相对路径', async () => {
    const { OPENCODE_COMMANDS_DIR } = await import('../src/utils/paths.js');
    expect(OPENCODE_COMMANDS_DIR).toBe(path.join(PROJECT_ROOT, '.opencode', 'commands'));
  });

  it('定义 openspec 路径为项目相对路径', async () => {
    const { OPENSPEC_DIR } = await import('../src/utils/paths.js');
    expect(OPENSPEC_DIR).toBe(path.join(PROJECT_ROOT, 'openspec'));
  });

  it('定义 docs/superpowers/plans 路径为项目相对路径', async () => {
    const { SUPERPOWERS_PLANS_DIR } = await import('../src/utils/paths.js');
    expect(SUPERPOWERS_PLANS_DIR).toBe(path.join(PROJECT_ROOT, 'docs', 'superpowers', 'plans'));
  });
});
