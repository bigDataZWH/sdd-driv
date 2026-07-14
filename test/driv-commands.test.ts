import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const DRIV_COMMANDS = [
  'driv-clarify',
  'driv-design',
  'driv-build',
  'driv-verify',
  'driv-archive',
  'driv-review',
  'driv-cleancode',
  'driv',
];

describe('Driv 命令资产', () => {
  it('所有 Driv slash 命令技能文件存在', async () => {
    const { fileExists } = await import('../src/utils/file-system.js');
    const root = process.cwd();
    for (const cmd of DRIV_COMMANDS) {
      const skillPath = path.join(root, '.opencode', 'skills', cmd, 'SKILL.md');
      expect(await fileExists(skillPath)).toBe(true);
    }
  });

  it('所有 Driv 命令文件存在说明和 $ARGUMENTS 转发', async () => {
    const root = process.cwd();
    for (const cmd of DRIV_COMMANDS) {
      const cmdPath = path.join(root, '.opencode', 'commands', `${cmd}.md`);
      const content = fs.readFileSync(cmdPath, 'utf-8');
      expect(content).toContain('$ARGUMENTS');
      expect(content).toContain(cmd);
    }
  });

  it('driv-clarify 文案生成 PRD 交付件', () => {
    const root = process.cwd();
    const paths = [
      path.join(root, '.opencode', 'skills', 'driv-clarify', 'SKILL.md'),
      path.join(root, '.opencode', 'commands', 'driv-clarify.md'),
    ];

    for (const filePath of paths) {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('prd.md');
      expect(content).toContain('.openspec.yaml');
      expect(content).toContain('.driv.yaml');
    }
  });

  it('生成 Driv 命令时不覆盖 opsx-* 命令', async () => {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-test-'));
    try {
      const opsxPath = path.join(tmp, '.opencode', 'commands', 'opsx-propose.md');
      await fs.promises.mkdir(path.dirname(opsxPath), { recursive: true });
      await fs.promises.writeFile(opsxPath, 'original opsx', 'utf-8');

      const skillDir = path.join(tmp, '.opencode', 'skills', 'driv-status');
      await fs.promises.mkdir(skillDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(skillDir, 'SKILL.md'),
        '---\nname: driv-status\n---\nStatus body',
        'utf-8',
      );

      const { createOpenCodeCommands } = await import('../src/core/skills.js');
      await createOpenCodeCommands(tmp, ['driv-status'], false);

      const opsxContent = await fs.promises.readFile(opsxPath, 'utf-8');
      expect(opsxContent).toBe('original opsx');
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  });
});
