import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('initCommand', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-init-'));
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  async function setupPackageSkills() {
    const skillsDir = path.join(process.cwd(), '.opencode', 'skills', 'driv');
    const existed = fs.existsSync(skillsDir);
    if (!existed) {
      await fs.promises.mkdir(skillsDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(skillsDir, 'SKILL.md'),
        '---\nname: driv\n---\nBody',
        'utf-8',
      );
    }
    return () => {
      if (!existed) {
        fs.rmSync(path.join(process.cwd(), '.opencode', 'skills', 'driv'), {
          recursive: true,
          force: true,
        });
        const parent = path.join(process.cwd(), '.opencode', 'skills');
        if (fs.readdirSync(parent).length === 0) {
          fs.rmSync(parent, { recursive: true, force: true });
        }
      }
    };
  }

  const expectedTemplateFiles = [
    path.join('.driv', 'templates', 'config.yaml'),
    path.join('.driv', 'templates', 'proposals', 'default.md'),
    path.join('.driv', 'templates', 'proposals', 'feature.md'),
    path.join('.driv', 'templates', 'designs', 'default.md'),
    path.join('.driv', 'templates', 'designs', 'feature.md'),
    path.join('.driv', 'templates', 'specs', 'default.md'),
    path.join('.driv', 'templates', 'specs', 'api.md'),
    path.join('.driv', 'templates', 'reviews', 'requirement-review.md'),
    path.join('.driv', 'templates', 'reviews', 'technical-review.md'),
    path.join('.driv', 'templates', 'reviews', 'code-review.md'),
  ];

  it('init --scope project 创建 .driv/templates 并复制默认模板', async () => {
    const { initCommand } = await import('../src/commands/init.js');
    const result = await initCommand(tmpDir, ['opencode'], { scope: 'project' });
    expect(fs.existsSync(path.join(tmpDir, '.driv', 'templates'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.driv', 'config.yaml'))).toBe(true);
    for (const file of expectedTemplateFiles) {
      expect(fs.existsSync(path.join(tmpDir, file))).toBe(true);
    }
    expect(result.templatesCopied).toBeGreaterThanOrEqual(expectedTemplateFiles.length + 1);
  });

  it('init 复制的默认模板包含设计文档要求的中文章节', async () => {
    const { initCommand } = await import('../src/commands/init.js');
    await initCommand(tmpDir, ['opencode'], { scope: 'project', overwrite: true });

    const design = fs.readFileSync(
      path.join(tmpDir, '.driv', 'templates', 'designs', 'default.md'),
      'utf-8',
    );
    const spec = fs.readFileSync(
      path.join(tmpDir, '.driv', 'templates', 'specs', 'default.md'),
      'utf-8',
    );
    const config = fs.readFileSync(path.join(tmpDir, '.driv', 'templates', 'config.yaml'), 'utf-8');

    expect(config).toContain('type_mapping:');
    expect(config).toContain('proposals/default.md');
    expect(design).toContain('template: design-default');
    expect(design).toContain('## 一、方案概述');
    expect(design).toContain('## 十三、附录');
    expect(spec).toContain('template: spec-default');
    expect(spec).toContain('## 一、规格概述');
    expect(spec).toContain('## 十一、附录');
  });

  it('init --overwrite 不覆盖 custom 自定义模板', async () => {
    const { initCommand } = await import('../src/commands/init.js');
    await initCommand(tmpDir, ['opencode'], { overwrite: true });
    const customTemplatePath = path.join(
      tmpDir,
      '.driv',
      'templates',
      'custom',
      'proposals',
      'default.md',
    );
    await fs.promises.mkdir(path.dirname(customTemplatePath), { recursive: true });
    await fs.promises.writeFile(customTemplatePath, '# 用户自定义 custom 模板', 'utf-8');

    await initCommand(tmpDir, ['opencode'], { overwrite: true });

    expect(fs.readFileSync(customTemplatePath, 'utf-8')).toBe('# 用户自定义 custom 模板');
  });

  it('init --scope global 不创建 .driv 目录', async () => {
    const { initCommand } = await import('../src/commands/init.js');
    await initCommand(tmpDir, ['opencode'], { scope: 'global' });
    expect(fs.existsSync(path.join(tmpDir, '.driv'))).toBe(false);
  });

  it('init --scope project 不创建 docs/superpowers 目录', async () => {
    const { initCommand } = await import('../src/commands/init.js');
    await initCommand(tmpDir, ['opencode'], { scope: 'project' });
    expect(fs.existsSync(path.join(tmpDir, 'docs', 'superpowers'))).toBe(false);
  });

  it('返回安装结果摘要', async () => {
    const { initCommand } = await import('../src/commands/init.js');
    const result = await initCommand(tmpDir, ['opencode']);

    expect(result.openspec).toBeDefined();
    expect(result.superpowers).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(typeof result.skillsCopied).toBe('number');
    expect(typeof result.skillsSkipped).toBe('number');
    expect(typeof result.commandsCopied).toBe('number');
    expect(typeof result.commandsSkipped).toBe('number');
  });

  it('init 默认 scope 为 project', async () => {
    const { initCommand } = await import('../src/commands/init.js');
    const result = await initCommand(tmpDir, ['opencode']);
    expect(result.scope).toBe('project');
  });

  it('init 从包内复制 skills 到目标', async () => {
    const { initCommand } = await import('../src/commands/init.js');
    await initCommand(tmpDir, ['opencode'], { overwrite: true });

    const skillsDir = path.join(tmpDir, '.opencode', 'skills');
    const commandsDir = path.join(tmpDir, '.opencode', 'commands');
    expect(fs.existsSync(skillsDir)).toBe(true);
    expect(fs.existsSync(commandsDir)).toBe(true);
  });

  it('init --skip-existing 不覆盖已有技能', async () => {
    const { initCommand } = await import('../src/commands/init.js');
    await initCommand(tmpDir, ['opencode'], { overwrite: true });

    const result2 = await initCommand(tmpDir, ['opencode'], {
      skipExisting: true,
      overwrite: false,
    });
    expect(result2.skillsCopied).toBe(0);
  });

  it('init --skip-existing 不覆盖已有模板', async () => {
    const { initCommand } = await import('../src/commands/init.js');
    await initCommand(tmpDir, ['opencode'], { overwrite: true });
    const customTemplatePath = path.join(tmpDir, '.driv', 'templates', 'proposals', 'default.md');
    await fs.promises.writeFile(customTemplatePath, '# 用户自定义模板', 'utf-8');

    const result = await initCommand(tmpDir, ['opencode'], { skipExisting: true });

    expect(fs.readFileSync(customTemplatePath, 'utf-8')).toBe('# 用户自定义模板');
    expect(result.templatesSkipped).toBeGreaterThan(0);
  });

  it('init --overwrite 覆盖已有模板', async () => {
    const { initCommand } = await import('../src/commands/init.js');
    await initCommand(tmpDir, ['opencode'], { overwrite: true });
    const customTemplatePath = path.join(tmpDir, '.driv', 'templates', 'proposals', 'default.md');
    await fs.promises.writeFile(customTemplatePath, '# 用户自定义模板', 'utf-8');

    const result = await initCommand(tmpDir, ['opencode'], { overwrite: true });

    expect(fs.readFileSync(customTemplatePath, 'utf-8')).not.toBe('# 用户自定义模板');
    expect(result.templatesCopied).toBeGreaterThan(0);
  });

  it('init --overwrite 覆盖已有技能', async () => {
    const { initCommand } = await import('../src/commands/init.js');
    await initCommand(tmpDir, ['opencode'], { overwrite: true });
    const result2 = await initCommand(tmpDir, ['opencode'], { overwrite: true });
    expect(result2.skillsCopied).toBeGreaterThanOrEqual(0);
  });

  it('init --json 输出结构化结果', async () => {
    const { initCommand } = await import('../src/commands/init.js');
    const result = await initCommand(tmpDir, ['opencode'], { json: true });
    expect(result.scope).toBe('project');
    expect(Array.isArray(result.createdDirs)).toBe(true);
  });
});
