import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

describe('stripFrontmatter', () => {
  it('剥离 YAML frontmatter 返回正文', async () => {
    const { stripFrontmatter } = await import('../src/core/skills.js');
    const content = `---
name: test
description: Test skill
---
This is the body.
Second line.`;
    expect(stripFrontmatter(content)).toBe('This is the body.\nSecond line.');
  });

  it('无 frontmatter 时返回原内容', async () => {
    const { stripFrontmatter } = await import('../src/core/skills.js');
    const content = 'Just body content\nNo frontmatter here.';
    expect(stripFrontmatter(content)).toBe(content);
  });

  it('仅 frontmatter 时返回空字符串', async () => {
    const { stripFrontmatter } = await import('../src/core/skills.js');
    const content = '---\nname: test\n---';
    expect(stripFrontmatter(content)).toBe('');
  });
});

describe('createOpenCodeCommands', () => {
  async function setupTmp() {
    return await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-test-cmd-'));
  }

  it('从 .opencode/skills/<name>/SKILL.md 生成命令到 .opencode/commands/<name>.md', async () => {
    const tmp = await setupTmp();
    try {
      const skillsDir = path.join(tmp, '.opencode', 'skills', 'opsx-test');
      await fs.promises.mkdir(skillsDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(skillsDir, 'SKILL.md'),
        '---\nname: test\n---\nBody content\nSecond line',
        'utf-8',
      );

      const { createOpenCodeCommands } = await import('../src/core/skills.js');
      const result = await createOpenCodeCommands(tmp, ['opsx-test'], false);

      expect(result.copied).toBe(1);

      const cmdPath = path.join(tmp, '.opencode', 'commands', 'opsx-test.md');
      const cmdContent = await fs.promises.readFile(cmdPath, 'utf-8');
      expect(cmdContent).toContain('$ARGUMENTS');
      expect(cmdContent).toContain('Body content\nSecond line');
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  });

  it('overwrite=false 时跳过已存在的命令文件', async () => {
    const tmp = await setupTmp();
    try {
      const skillsDir = path.join(tmp, '.opencode', 'skills', 'opsx-skip');
      await fs.promises.mkdir(skillsDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(skillsDir, 'SKILL.md'),
        '---\nname: skip\n---\nBody',
        'utf-8',
      );

      const cmdDir = path.join(tmp, '.opencode', 'commands');
      await fs.promises.mkdir(cmdDir, { recursive: true });
      await fs.promises.writeFile(path.join(cmdDir, 'opsx-skip.md'), 'existing', 'utf-8');

      const { createOpenCodeCommands } = await import('../src/core/skills.js');
      const result = await createOpenCodeCommands(tmp, ['opsx-skip'], false);

      expect(result.copied).toBe(0);
      expect(result.skipped).toBe(1);
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  });

  it('overwrite=true 时覆盖已存在的命令文件', async () => {
    const tmp = await setupTmp();
    try {
      const skillsDir = path.join(tmp, '.opencode', 'skills', 'opsx-over');
      await fs.promises.mkdir(skillsDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(skillsDir, 'SKILL.md'),
        '---\nname: over\n---\nNew content',
        'utf-8',
      );

      const cmdDir = path.join(tmp, '.opencode', 'commands');
      await fs.promises.mkdir(cmdDir, { recursive: true });
      await fs.promises.writeFile(path.join(cmdDir, 'opsx-over.md'), 'old', 'utf-8');

      const { createOpenCodeCommands } = await import('../src/core/skills.js');
      const result = await createOpenCodeCommands(tmp, ['opsx-over'], true);

      expect(result.copied).toBe(1);
      expect(result.skipped).toBe(0);
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  });
});
