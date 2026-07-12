import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('CLI 命令注册', () => {
  it('status 命令存在并注册', async () => {
    const { registerCommands } = await import('../src/cli/index.js');
    const cmds = registerCommands();
    expect(cmds).toContain('status');
  });

  it('doctor 命令存在并注册', async () => {
    const { registerCommands } = await import('../src/cli/index.js');
    const cmds = registerCommands();
    expect(cmds).toContain('doctor');
  });

  it('update 命令存在并注册', async () => {
    const { registerCommands } = await import('../src/cli/index.js');
    const cmds = registerCommands();
    expect(cmds).toContain('update');
  });

  it('uninstall 命令存在并注册', async () => {
    const { registerCommands } = await import('../src/cli/index.js');
    const cmds = registerCommands();
    expect(cmds).toContain('uninstall');
  });

  it('init 命令存在并注册', async () => {
    const { registerCommands } = await import('../src/cli/index.js');
    const cmds = registerCommands();
    expect(cmds).toContain('init');
  });
});

describe('CLI 状态输出', () => {
  it('status 输出格式包含 change、phase、gates、reports 字段', async () => {
    const { formatStatusOutput } = await import('../src/cli/index.js');
    const output = formatStatusOutput({
      change: 'test-change',
      phase: 'clarify',
      gates: [],
      reports: [],
      nextStep: '/driv-design',
    });
    expect(output).toContain('test-change');
    expect(output).toContain('clarify');
    expect(output).toContain('/driv-design');
  });
});

describe('statusCommand', () => {
  async function setupChange() {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-status-'));
    const changeDir = path.join(tmp, 'openspec', 'changes', 'add-status');
    await fs.promises.mkdir(changeDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(changeDir, '.driv.yaml'),
      [
        'change: add-status',
        'workflow: full',
        'phase: build',
        'buildMode: subagent-driven-development',
        'verifyResult: pending',
        'archived: false',
      ].join('\n'),
      'utf-8',
    );
    await fs.promises.writeFile(
      path.join(changeDir, 'tasks.md'),
      ['- [x] 已完成任务', '- [ ] 待完成任务'].join('\n'),
      'utf-8',
    );
    return tmp;
  }

  it('读取活跃 change 并推荐下一步命令', async () => {
    const tmp = await setupChange();
    try {
      const { getActiveChanges } = await import('../src/commands/status.js');
      const changes = await getActiveChanges(tmp);

      expect(changes).toHaveLength(1);
      expect(changes[0].name).toBe('add-status');
      expect(changes[0].phase).toBe('build');
      expect(changes[0].tasksCompleted).toBe(1);
      expect(changes[0].tasksTotal).toBe(2);
      expect(changes[0].nextCommand).toBe('/driv-build');
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  });
});

describe('updateCommand', () => {
  it('生成 Driv 命令并同步模板', async () => {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-update-'));
    try {
      const skillDir = path.join(tmp, '.opencode', 'skills', 'driv');
      await fs.promises.mkdir(skillDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(skillDir, 'SKILL.md'),
        '---\nname: driv\n---\nBody',
        'utf-8',
      );

      const { updateCommand } = await import('../src/commands/update.js');
      const result = await updateCommand(tmp, { overwrite: true });

      expect(result.commands.copied).toBe(1);
      expect(result.templates.copied).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(tmp, '.opencode', 'commands', 'driv.md'))).toBe(true);
      expect(fs.existsSync(path.join(tmp, '.driv', 'templates', 'config.yaml'))).toBe(true);
      expect(
        fs.existsSync(path.join(tmp, '.driv', 'templates', 'reviews', 'requirement-review.md')),
      ).toBe(true);
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  });

  it('update --overwrite 不覆盖 custom 自定义模板', async () => {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-update-custom-'));
    try {
      const skillDir = path.join(tmp, '.opencode', 'skills', 'driv');
      await fs.promises.mkdir(skillDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(skillDir, 'SKILL.md'),
        '---\nname: driv\n---\nBody',
        'utf-8',
      );
      const customTemplatePath = path.join(
        tmp,
        '.driv',
        'templates',
        'custom',
        'proposals',
        'default.md',
      );
      await fs.promises.mkdir(path.dirname(customTemplatePath), { recursive: true });
      await fs.promises.writeFile(customTemplatePath, '# 用户自定义 custom 模板', 'utf-8');

      const { updateCommand } = await import('../src/commands/update.js');
      await updateCommand(tmp, { overwrite: true });

      expect(fs.readFileSync(customTemplatePath, 'utf-8')).toBe('# 用户自定义 custom 模板');
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  });

  it('update 支持 scope 和 language 参数', async () => {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-update-scope-'));
    try {
      const skillDir = path.join(tmp, '.opencode', 'skills', 'driv');
      await fs.promises.mkdir(skillDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(skillDir, 'SKILL.md'),
        '---\nname: driv\n---\nBody',
        'utf-8',
      );

      const { updateCommand } = await import('../src/commands/update.js');
      const result = await updateCommand(tmp, {
        overwrite: true,
        scope: 'project',
        language: 'zh',
      });

      expect(result.scope).toBe('project');
      expect(result.commands.copied).toBeGreaterThanOrEqual(1);
      expect(result.templates.copied).toBeGreaterThan(0);
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  });
});

describe('uninstallCommand', () => {
  it('卸载 Driv 技能和命令文件', async () => {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-uninstall-'));
    try {
      // Create skills
      const skillsDir = path.join(tmp, '.opencode', 'skills', 'driv');
      await fs.promises.mkdir(skillsDir, { recursive: true });
      await fs.promises.writeFile(path.join(skillsDir, 'SKILL.md'), 'body', 'utf-8');

      // Create command
      const cmdsDir = path.join(tmp, '.opencode', 'commands');
      await fs.promises.mkdir(cmdsDir, { recursive: true });
      await fs.promises.writeFile(path.join(cmdsDir, 'driv.md'), 'body', 'utf-8');

      const { uninstallCommand } = await import('../src/commands/uninstall.js');
      const result = await uninstallCommand(tmp, { force: true });

      expect(result.skillsRemoved).toBeGreaterThanOrEqual(1);
      expect(result.commandsRemoved).toBeGreaterThanOrEqual(1);
      expect(fs.existsSync(path.join(tmp, '.opencode', 'skills', 'driv', 'SKILL.md'))).toBe(false);
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  });

  it('无安装时卸载返回零', async () => {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-uninstall-empty-'));
    try {
      const { uninstallCommand } = await import('../src/commands/uninstall.js');
      const result = await uninstallCommand(tmp, { force: true });
      expect(result.skillsRemoved).toBe(0);
      expect(result.commandsRemoved).toBe(0);
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  });
});

describe('doctorCommand', () => {
  it('doctor 返回检查结果', async () => {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-doctor-'));
    try {
      const { doctorCommand } = await import('../src/commands/doctor.js');
      const results = await doctorCommand(tmp, { json: false });
      expect(results.length).toBeGreaterThan(0);
      // Should always have version check
      expect(results.some((r) => r.check === 'driv package')).toBe(true);
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  });

  it('doctor --json 输出结构正确', async () => {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-doctor-json-'));
    try {
      const { doctorCommand } = await import('../src/commands/doctor.js');
      const results = await doctorCommand(tmp, { json: true });
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r).toHaveProperty('check');
        expect(r).toHaveProperty('status');
        expect(r).toHaveProperty('message');
        expect(['pass', 'warn', 'fail']).toContain(r.status);
      }
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  });
});

describe('initCommand', () => {
  it('init 返回 scope 字段', async () => {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-init-scope-'));
    try {
      const { initCommand } = await import('../src/commands/init.js');
      const result = await initCommand(tmp, ['opencode'], { scope: 'project' });
      expect(result.scope).toBe('project');
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  });
});
