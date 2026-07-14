import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TMP_DIR = path.join(os.tmpdir(), 'driv-tmpl-test-' + Date.now());

const TMPL_DIR = path.join(TMP_DIR, '.driv', 'templates');

beforeEach(async () => {
  await fs.promises.mkdir(path.join(TMPL_DIR, 'proposals'), { recursive: true });
  await fs.promises.mkdir(path.join(TMPL_DIR, 'designs'), { recursive: true });
  await fs.promises.mkdir(path.join(TMPL_DIR, 'specs'), { recursive: true });
  await fs.promises.mkdir(path.join(TMPL_DIR, 'reviews'), { recursive: true });
  await fs.promises.mkdir(path.join(TMPL_DIR, 'custom', 'proposals'), { recursive: true });

  await fs.promises.writeFile(
    path.join(TMPL_DIR, 'proposals', 'default.md'),
    '# 默认提案\n\n## 概述\n\n{{description}}\n\n## 背景\n\n{{background:无}}',
  );
  await fs.promises.writeFile(
    path.join(TMPL_DIR, 'proposals', 'feature.md'),
    '# 功能提案\n\n## 功能描述\n\n{{description}}\n\n## 优先级\n\n{{priority:P2}}',
  );
  await fs.promises.writeFile(
    path.join(TMPL_DIR, 'proposals', 'bugfix.md'),
    '# Bug 修复\n\n## 问题描述\n\n{{description}}',
  );
  await fs.promises.writeFile(
    path.join(TMPL_DIR, 'proposals', 'custom-feature.md'),
    '# 自定义功能提案\n\n## 说明\n\n自定义内容\n\n## 影响范围\n\n{{scope}}',
  );
  await fs.promises.writeFile(
    path.join(TMPL_DIR, 'designs', 'default.md'),
    '# 设计文档\n\n## 架构\n\n{{architecture:待定}}',
  );
  await fs.promises.writeFile(
    path.join(TMPL_DIR, 'reviews', 'requirement-review.md'),
    '# 需求评审\n\n## 检查项\n\n{{checklist}}',
  );
  await fs.promises.writeFile(
    path.join(TMPL_DIR, 'reviews', 'technical-review.md'),
    '# 技术评审\n\n## 架构检查\n\n{{architecture}}',
  );

  await fs.promises.writeFile(
    path.join(TMPL_DIR, 'custom', 'proposals', 'feature.md'),
    '# 项目自定义功能提案\n\n## 项目说明\n\n{{description}}\n\n## 项目特有\n\n{{project_context}}',
  );

  await fs.promises.writeFile(
    path.join(TMPL_DIR, 'config.yaml'),
    [
      'version: "1"',
      'proposals:',
      '  default: proposals/default.md',
      '  type_mapping:',
      '    feature: proposals/feature.md',
      '    bugfix: proposals/bugfix.md',
      '    refactor: proposals/refactor.md',
      '  types:',
      '    feature: feature',
      '    bugfix: bugfix',
      '    refactor: refactor',
      'designs:',
      '  default: designs/default.md',
      '  type_mapping:',
      '    feature: designs/feature.md',
      '    architecture: designs/architecture.md',
      '  types:',
      '    feature: feature',
      '    architecture: architecture',
      'specs:',
      '  default: specs/default.md',
      '  type_mapping:',
      '    capability: specs/capability.md',
      '    api: specs/api.md',
      '  types:',
      '    capability: capability',
      '    api: api',
      'reviews:',
      '  requirement: reviews/requirement-review.md',
      '  technical: reviews/technical-review.md',
      '  code: reviews/code-review.md',
      'inheritance:',
      '  rules:',
      '    - child: feature',
      '      parent: default',
      '      strategy: extend',
      '      sections: {}',
      'placeholders:',
      '  system:',
      '    - name',
      '    - date',
      '    - version',
      '  user: []',
      'project_override:',
      '  search_paths:',
      '    - .driv/templates/custom',
    ].join('\n'),
  );
});

afterEach(async () => {
  await fs.promises.rm(TMP_DIR, { recursive: true, force: true });
});

function createFs(): InstanceType<(typeof import('../src/utils/file-system.js'))['FileSystem']> {
  const { FileSystem } = __junk__;
  return undefined as any;
}

describe('TemplateManager', () => {
  let FileSystemClass: (typeof import('../src/utils/file-system.js'))['FileSystem'];
  let TemplateManagerClass: (typeof import('../src/core/template-manager.js'))['TemplateManager'];
  let TemplateType: (typeof import('../src/core/template-manager.js'))['TemplateType'];

  beforeEach(async () => {
    const fsMod = await import('../src/utils/file-system.js');
    FileSystemClass = fsMod.FileSystem;
    const tmMod = await import('../src/core/template-manager.js');
    TemplateManagerClass = tmMod.TemplateManager;
    TemplateType = tmMod.TemplateType as any;
  });

  // ── 4.1 loadTemplate & listTemplates ──
  describe('loadTemplate', () => {
    it('加载已存在的模板', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const content = await tm.loadTemplate('proposal', 'default');
      expect(content).toContain('# 默认提案');
      expect(content).toContain('{{description}}');
    });

    it('模板不存在时抛出错误', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      await expect(tm.loadTemplate('proposal', 'nonexistent')).rejects.toThrow();
    });

    it('支持所有文件类型：design、spec、review', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const design = await tm.loadTemplate('design', 'default');
      expect(design).toContain('# 设计文档');
      const review = await tm.loadTemplate('review', 'requirement-review');
      expect(review).toContain('# 需求评审');
    });
  });

  describe('listTemplates', () => {
    it('不传 type 时列出所有模板', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const all = await tm.listTemplates();
      const names = all.map((t) => t.name);
      expect(names).toContain('default');
      expect(names).toContain('feature');
      expect(names).toContain('requirement-review');
    });

    it('按 type 过滤模板', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const proposals = await tm.listTemplates('proposal');
      for (const t of proposals) {
        expect(t.type).toBe('proposal');
      }
      const names = proposals.map((t) => t.name);
      expect(names).toContain('default');
      expect(names).toContain('feature');
      expect(names).not.toContain('requirement-review');
    });

    it('不存在的 type 返回空数组', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const specs = await tm.listTemplates('spec');
      expect(specs).toEqual([]);
    });

    it('返回的 TemplateInfo 包含 name、type、path', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const [info] = await tm.listTemplates('design');
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('type');
      expect(info).toHaveProperty('path');
      expect(info.name).toBe('default');
      expect(info.type).toBe('design');
    });

    it('P3-1: 不传 type 时返回所有 4 类模板', async () => {
      // 补一个 spec 模板以覆盖全部 4 类
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'specs', 'capability.md'),
        '# 能力规格\n\n{{x}}',
      );
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      const all = await tm.listTemplates();
      const types = new Set(all.map((t) => t.type));
      expect(types.has('proposal')).toBe(true);
      expect(types.has('design')).toBe(true);
      expect(types.has('spec')).toBe(true);
      expect(types.has('review')).toBe(true);
    });
  });

  // ── 4.2 selectTemplate ──
  describe('selectTemplate', () => {
    it('type_mapping 支持完整相对路径且不会拼出 .md.md', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const content = await tm.selectTemplate('proposal', 'bugfix');
      expect(content).toContain('# Bug 修复');
    });

    it('完整相对路径映射也支持自定义模板优先', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const content = await tm.selectTemplate('proposal', 'feature');
      expect(content).toContain('# 项目自定义功能提案');
    });

    it('自定义默认模板优先于默认模板', async () => {
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'custom', 'proposals', 'default.md'),
        '# 项目自定义默认提案\n\n## 项目说明\n\n{{description}}',
      );
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      const content = await tm.selectTemplate('proposal', 'unknown_type');
      expect(content).toContain('# 项目自定义默认提案');
    });

    it('缺少 type_mapping 时兼容旧 types 短名配置', async () => {
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'config.yaml'),
        [
          'version: "1"',
          'proposals:',
          '  default: default',
          '  types:',
          '    bugfix: bugfix',
          'designs:',
          '  default: default',
          '  types:',
          '    feature: feature',
          'specs:',
          '  default: default',
          '  types:',
          '    api: api',
          'reviews:',
          '  requirement: requirement-review',
          'inheritance:',
          '  rules: []',
          'placeholders:',
          '  system: []',
          '  user: []',
          'project_override:',
          '  search_paths:',
          '    - .driv/templates/custom',
        ].join('\n'),
      );
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      const content = await tm.selectTemplate('proposal', 'bugfix');
      expect(content).toContain('# Bug 修复');
    });

    it('按 changeType 找到类型映射模板', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const content = await tm.selectTemplate('proposal', 'bugfix');
      expect(content).toContain('# Bug 修复');
    });

    it('未知 changeType 回退到 default', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const content = await tm.selectTemplate('proposal', 'unknown_type');
      expect(content).toContain('# 默认提案');
    });

    it('不传 changeType 使用 default', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const content = await tm.selectTemplate('proposal');
      expect(content).toContain('# 默认提案');
    });

    it('自定义模板优先于类型映射', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const content = await tm.selectTemplate('proposal', 'feature');
      expect(content).toContain('# 项目自定义功能提案');
    });

    it('review 类型使用 changeType 直接映射', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const content = await tm.selectTemplate('review', 'requirement');
      expect(content).toContain('# 需求评审');
    });

    it('review 未知 changeType 回退到 requirement-review', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const content = await tm.selectTemplate('review', 'nobody');
      expect(content).toContain('# 需求评审');
    });

    it('P2-8: review 不传 changeType 时回退到 requirement-review', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const content = await tm.selectTemplate('review');
      expect(content).toContain('# 需求评审');
    });

    it('P0-4: search_paths 配置 .driv/templates/proposals/custom/ 时查找 proposals/custom/<name>.md', async () => {
      // 使用 isolated 目录避免与默认 .driv/templates/custom 合并干扰
      const isolated = path.join(os.tmpdir(), 'driv-tmpl-sp1-' + Date.now());
      try {
        await fs.promises.mkdir(path.join(isolated, '.driv', 'templates', 'proposals'), {
          recursive: true,
        });
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'default.md'),
          '# 默认\n\n{{x}}',
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'feature.md'),
          '# 原功能\n\n{{x}}',
        );
        // 创建 proposals/custom/feature.md（多段路径形式）
        await fs.promises.mkdir(
          path.join(isolated, '.driv', 'templates', 'proposals', 'custom'),
          { recursive: true },
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'custom', 'feature.md'),
          '# Preset 提案\n\n## 自定义\n\npreset-content',
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'config.yaml'),
          [
            'version: "1"',
            'proposals:',
            '  default: default',
            '  type_mapping:',
            '    feature: feature',
            '  types:',
            '    feature: feature',
            'designs:',
            '  default: default',
            '  types: {}',
            'specs:',
            '  default: default',
            '  types: {}',
            'reviews: {}',
            'inheritance:',
            '  rules: []',
            'placeholders:',
            '  system: []',
            '  user: []',
            'project_override:',
            '  search_paths:',
            '    - .driv/templates/proposals/custom/',
          ].join('\n'),
        );
        const { FileSystem } = await import('../src/utils/file-system.js');
        const { TemplateManager } = await import('../src/core/template-manager.js');
        const f = new FileSystem(isolated);
        const tm = new TemplateManager(f, isolated);
        const content = await tm.selectTemplate('proposal', 'feature');
        expect(content).toContain('# Preset 提案');
        expect(content).toContain('preset-content');
      } finally {
        await fs.promises.rm(isolated, { recursive: true, force: true });
      }
    });

    it('P0-4: search_paths 配置 custom/{category} 时查找 custom/proposals/<name>.md', async () => {
      // 使用 isolated 目录避免已有 custom 路径干扰
      const isolated = path.join(os.tmpdir(), 'driv-tmpl-sp2-' + Date.now());
      try {
        await fs.promises.mkdir(path.join(isolated, '.driv', 'templates', 'proposals'), {
          recursive: true,
        });
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'default.md'),
          '# 默认\n\n{{x}}',
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'feature.md'),
          '# 原功能\n\n{{x}}',
        );
        // 创建 my-override/proposals/feature.md（{category} 替换后路径）
        // 用 my-override 而非 custom，避免与旧硬编码 'custom' 路径冲突，从而能区分新旧逻辑
        await fs.promises.mkdir(
          path.join(isolated, '.driv', 'templates', 'my-override', 'proposals'),
          { recursive: true },
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'my-override', 'proposals', 'feature.md'),
          '# 占位符替换自定义\n\noverride-content',
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'config.yaml'),
          [
            'version: "1"',
            'proposals:',
            '  default: default',
            '  type_mapping:',
            '    feature: feature',
            '  types:',
            '    feature: feature',
            'designs:',
            '  default: default',
            '  types: {}',
            'specs:',
            '  default: default',
            '  types: {}',
            'reviews: {}',
            'inheritance:',
            '  rules: []',
            'placeholders:',
            '  system: []',
            '  user: []',
            'project_override:',
            '  search_paths:',
            '    - my-override/{category}',
          ].join('\n'),
        );
        const { FileSystem } = await import('../src/utils/file-system.js');
        const { TemplateManager } = await import('../src/core/template-manager.js');
        const f = new FileSystem(isolated);
        const tm = new TemplateManager(f, isolated);
        const content = await tm.selectTemplate('proposal', 'feature');
        expect(content).toContain('# 占位符替换自定义');
        expect(content).toContain('override-content');
      } finally {
        await fs.promises.rm(isolated, { recursive: true, force: true });
      }
    });

    it('P1-1: presets.active 配置时优先使用 preset 层模板', async () => {
      // 使用 isolated 目录避免与默认 custom 路径合并干扰
      const isolated = path.join(os.tmpdir(), 'driv-tmpl-preset-' + Date.now());
      try {
        await fs.promises.mkdir(path.join(isolated, '.driv', 'templates', 'proposals'), {
          recursive: true,
        });
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'default.md'),
          '# 默认\n\n{{x}}',
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'feature.md'),
          '# 原功能\n\n{{x}}',
        );
        // 创建 presets/my-preset/proposals/feature.md
        await fs.promises.mkdir(
          path.join(isolated, '.driv', 'templates', 'presets', 'my-preset', 'proposals'),
          { recursive: true },
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'presets', 'my-preset', 'proposals', 'feature.md'),
          '# Preset 功能\n\npreset-content',
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'config.yaml'),
          [
            'version: "1"',
            'proposals:',
            '  default: default',
            '  type_mapping:',
            '    feature: feature',
            '  types:',
            '    feature: feature',
            'designs:',
            '  default: default',
            '  types: {}',
            'specs:',
            '  default: default',
            '  types: {}',
            'reviews: {}',
            'inheritance:',
            '  rules: []',
            'placeholders:',
            '  system: []',
            '  user: []',
            'project_override:',
            '  search_paths:',
            '    - .driv/templates/custom',
            'presets:',
            '  active: my-preset',
          ].join('\n'),
        );
        const { FileSystem } = await import('../src/utils/file-system.js');
        const { TemplateManager } = await import('../src/core/template-manager.js');
        const f = new FileSystem(isolated);
        const tm = new TemplateManager(f, isolated);
        const content = await tm.selectTemplate('proposal', 'feature');
        expect(content).toContain('# Preset 功能');
        expect(content).toContain('preset-content');
      } finally {
        await fs.promises.rm(isolated, { recursive: true, force: true });
      }
    });

    it('P1-1: custom Override 层优先于 Preset 层', async () => {
      const isolated = path.join(os.tmpdir(), 'driv-tmpl-override-' + Date.now());
      try {
        await fs.promises.mkdir(path.join(isolated, '.driv', 'templates', 'proposals'), {
          recursive: true,
        });
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'feature.md'),
          '# 原功能\n\n{{x}}',
        );
        // 创建 presets/my-preset/proposals/feature.md
        await fs.promises.mkdir(
          path.join(isolated, '.driv', 'templates', 'presets', 'my-preset', 'proposals'),
          { recursive: true },
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'presets', 'my-preset', 'proposals', 'feature.md'),
          '# Preset 功能\n\npreset-content',
        );
        // 创建 custom/proposals/feature.md（Override 层）
        await fs.promises.mkdir(
          path.join(isolated, '.driv', 'templates', 'custom', 'proposals'),
          { recursive: true },
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'custom', 'proposals', 'feature.md'),
          '# Override 功能\n\noverride-content',
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'config.yaml'),
          [
            'version: "1"',
            'proposals:',
            '  default: default',
            '  type_mapping:',
            '    feature: feature',
            '  types:',
            '    feature: feature',
            'designs:',
            '  default: default',
            '  types: {}',
            'specs:',
            '  default: default',
            '  types: {}',
            'reviews: {}',
            'inheritance:',
            '  rules: []',
            'placeholders:',
            '  system: []',
            '  user: []',
            'project_override:',
            '  search_paths:',
            '    - .driv/templates/custom',
            'presets:',
            '  active: my-preset',
          ].join('\n'),
        );
        const { FileSystem } = await import('../src/utils/file-system.js');
        const { TemplateManager } = await import('../src/core/template-manager.js');
        const f = new FileSystem(isolated);
        const tm = new TemplateManager(f, isolated);
        const content = await tm.selectTemplate('proposal', 'feature');
        // Override 层应优先于 Preset 层
        expect(content).toContain('# Override 功能');
        expect(content).not.toContain('# Preset 功能');
      } finally {
        await fs.promises.rm(isolated, { recursive: true, force: true });
      }
    });
  });

  // ── 4.3 applyTemplate ──
  describe('applyTemplate', () => {
    it('替换简单占位符', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const result = await tm.applyTemplate('proposal', 'default', { description: '实现登录功能' });
      expect(result).toContain('实现登录功能');
      expect(result).not.toMatch(/\{\{description\}\}/);
    });

    it('未提供值但有默认值时使用默认值', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const result = await tm.applyTemplate('proposal', 'default', {});
      expect(result).toContain('无');
      expect(result).not.toMatch(/\{\{background:无\}\}/);
    });

    it('未提供值且无默认值时保留原占位符', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const result = await tm.applyTemplate('proposal', 'feature', { priority: 'P1' });
      expect(result).toContain('{{description}}');
    });

    it('P0-2: 完整路径 child 配置 (proposals/feature.md) 也能触发继承', async () => {
      // 用完整路径形式重写 config.yaml
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'config.yaml'),
        [
          'version: "1"',
          'proposals:',
          '  default: proposals/default.md',
          '  type_mapping:',
          '    feature: proposals/feature.md',
          '  types:',
          '    feature: feature',
          'designs:',
          '  default: designs/default.md',
          '  types: {}',
          'specs:',
          '  default: specs/default.md',
          '  types: {}',
          'reviews: {}',
          'inheritance:',
          '  rules:',
          '    - child: proposals/feature.md',
          '      parent: proposals/default.md',
          '      strategy: extend',
          '      sections: {}',
          'placeholders:',
          '  system: []',
          '  user: []',
          'project_override:',
          '  search_paths:',
          '    - .driv/templates/custom',
        ].join('\n'),
      );
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      const result = await tm.applyTemplate('proposal', 'feature', { description: 'x' });
      // extend 策略：父模板 default 内容 + 子模板 feature 内容
      expect(result).toContain('# 默认提案');
      expect(result).toContain('# 功能提案');
    });

    it('P1-1: frontmatter extends 字段触发隐式继承（无 config.inheritance.rules 时）', async () => {
      // 在 isolated 目录中测试，避免 TMP_DIR 已有 inheritance.rules 干扰
      const isolated = path.join(os.tmpdir(), 'driv-tmpl-extends-' + Date.now());
      try {
        await fs.promises.mkdir(path.join(isolated, '.driv', 'templates', 'proposals'), {
          recursive: true,
        });
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'default.md'),
          '# 默认\n\n## 概述\n\n{{x}}',
        );
        // feature.md 带 frontmatter extends: default
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'feature.md'),
          '---\nextends: default\n---\n\n# 功能\n\n## 功能描述\n\n{{x}}',
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'config.yaml'),
          [
            'version: "1"',
            'proposals:',
            '  default: default',
            '  type_mapping:',
            '    feature: feature',
            '  types:',
            '    feature: feature',
            'designs:',
            '  default: default',
            '  types: {}',
            'specs:',
            '  default: default',
            '  types: {}',
            'reviews: {}',
            'inheritance:',
            '  rules: []',
            'placeholders:',
            '  system: []',
            '  user: []',
            'project_override:',
            '  search_paths:',
            '    - .driv/templates/custom',
          ].join('\n'),
        );
        const { FileSystem } = await import('../src/utils/file-system.js');
        const { TemplateManager } = await import('../src/core/template-manager.js');
        const f = new FileSystem(isolated);
        const tm = new TemplateManager(f, isolated);
        const result = await tm.applyTemplate('proposal', 'feature', { x: 'value' });
        // extend 策略：父 + 子，应同时包含 # 默认 和 # 功能
        expect(result).toContain('# 默认');
        expect(result).toContain('# 功能');
      } finally {
        await fs.promises.rm(isolated, { recursive: true, force: true });
      }
    });

    it('P1-4: 3 层继承链 default <- feature <- feature-v2 全部合并', async () => {
      // 在 isolated 目录中测试，构造 3 层继承
      const isolated = path.join(os.tmpdir(), 'driv-tmpl-chain3-' + Date.now());
      try {
        await fs.promises.mkdir(path.join(isolated, '.driv', 'templates', 'proposals'), {
          recursive: true,
        });
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'default.md'),
          '# 默认\n\n## 概述\n\n默认内容',
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'feature.md'),
          '# 功能\n\n## 功能描述\n\nfeature 内容',
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'feature-v2.md'),
          '# 功能 V2\n\n## 新增\n\nv2 内容',
        );
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'config.yaml'),
          [
            'version: "1"',
            'proposals:',
            '  default: default',
            '  type_mapping:',
            '    feature: feature',
            '    feature-v2: feature-v2',
            '  types:',
            '    feature: feature',
            '    feature-v2: feature-v2',
            'designs:',
            '  default: default',
            '  types: {}',
            'specs:',
            '  default: default',
            '  types: {}',
            'reviews: {}',
            'inheritance:',
            '  rules:',
            '    - child: feature',
            '      parent: default',
            '      strategy: extend',
            '      sections: {}',
            '    - child: feature-v2',
            '      parent: feature',
            '      strategy: extend',
            '      sections: {}',
            'placeholders:',
            '  system: []',
            '  user: []',
            'project_override:',
            '  search_paths:',
            '    - .driv/templates/custom',
          ].join('\n'),
        );
        const { FileSystem } = await import('../src/utils/file-system.js');
        const { TemplateManager } = await import('../src/core/template-manager.js');
        const f = new FileSystem(isolated);
        const tm = new TemplateManager(f, isolated);
        const result = await tm.applyTemplate('proposal', 'feature-v2', {});
        // 应包含 3 层所有内容
        expect(result).toContain('# 默认');
        expect(result).toContain('默认内容');
        expect(result).toContain('# 功能');
        expect(result).toContain('feature 内容');
        expect(result).toContain('# 功能 V2');
        expect(result).toContain('v2 内容');
      } finally {
        await fs.promises.rm(isolated, { recursive: true, force: true });
      }
    });
  });

  // ── 4.4 validateTemplate ──
  describe('validateTemplate', () => {
    it('合法模板返回 valid: true 无错误', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const result = await tm.validateTemplate('proposal', 'feature');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('模板不存在时报错', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const result = await tm.validateTemplate('proposal', 'ghost');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('缺少 # 标题时报告错误', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      await fs.writeFile(path.join(TMPL_DIR, 'proposals', 'no-title.md'), '纯文本内容\n\n无标题');
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const result = await tm.validateTemplate('proposal', 'no-title');
      expect(result.valid).toBe(false);
      const hasTitleError = result.errors.some((e) => /标题|title|#/i.test(e));
      expect(hasTitleError).toBe(true);
    });

    it('包含未解析占位符时报告警告', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      await fs.writeFile(
        path.join(TMPL_DIR, 'proposals', 'unresolved.md'),
        '# 未解析\n\n## 数据\n\n{{missing_placeholder}}\n\n{{another:ok}}',
      );
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const result = await tm.validateTemplate('proposal', 'unresolved');
      expect(result.warnings.length).toBeGreaterThan(0);
      const hasPlaceholderWarn = result.warnings.some((w) => /missing_placeholder/i.test(w));
      expect(hasPlaceholderWarn).toBe(true);
    });
  });

  // ── 4.5 getInheritanceChain ──
  describe('getInheritanceChain', () => {
    it('无继承规则的模板返回 [name]', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const chain = await tm.getInheritanceChain('proposal', 'bugfix');
      expect(chain).toEqual(['bugfix']);
    });

    it('有继承规则时返回 [parent, child]', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      const chain = await tm.getInheritanceChain('proposal', 'feature');
      expect(chain).toEqual(['default', 'feature']);
    });
  });

  // ── Config loading (6.1) ──
  describe('config 加载', () => {
    it('config.yaml 不存在时使用默认配置', async () => {
      const isolated = path.join(os.tmpdir(), 'driv-tmpl-noconfig-' + Date.now());
      try {
        await fs.promises.mkdir(path.join(isolated, '.driv', 'templates', 'proposals'), {
          recursive: true,
        });
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'default.md'),
          '# 默认\n\n{{x}}',
        );
        const { FileSystem } = await import('../src/utils/file-system.js');
        const { TemplateManager } = await import('../src/core/template-manager.js');
        const f = new FileSystem(isolated);
        const tm = new TemplateManager(f, isolated);
        const content = await tm.selectTemplate('proposal');
        expect(content).toContain('# 默认');
      } finally {
        await fs.promises.rm(isolated, { recursive: true, force: true });
      }
    });
  });

  // ── P2-3: deepMerge 数组合并去重 ──
  describe('deepMerge 数组合并', () => {
    it('覆盖配置中的数组与默认数组合并而非替换', async () => {
      const isolated = path.join(os.tmpdir(), 'driv-tmpl-merge-' + Date.now());
      try {
        await fs.promises.mkdir(path.join(isolated, '.driv', 'templates', 'proposals'), {
          recursive: true,
        });
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'default.md'),
          '# 默认\n\n{{x}}',
        );
        // 覆盖 placeholders.system 数组（仅写一个自定义项）
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'config.yaml'),
          [
            'version: "1"',
            'proposals:',
            '  default: default',
            '  types: {}',
            'designs:',
            '  default: default',
            '  types: {}',
            'specs:',
            '  default: default',
            '  types: {}',
            'reviews: {}',
            'inheritance:',
            '  rules: []',
            'placeholders:',
            '  system:',
            '    - custom_field',
            '  user: []',
            'project_override:',
            '  search_paths:',
            '    - .driv/templates/custom',
          ].join('\n'),
        );
        const { FileSystem } = await import('../src/utils/file-system.js');
        const { TemplateManager } = await import('../src/core/template-manager.js');
        const f = new FileSystem(isolated);
        const tm = new TemplateManager(f, isolated);
        const config = await tm.getConfig();
        // 默认 system 占位符 ['name','date','version'] 与覆盖 ['custom_field'] 应合并去重
        expect(config.placeholders.system).toContain('name');
        expect(config.placeholders.system).toContain('date');
        expect(config.placeholders.system).toContain('version');
        expect(config.placeholders.system).toContain('custom_field');
      } finally {
        await fs.promises.rm(isolated, { recursive: true, force: true });
      }
    });

    it('重复数组元素被去重', async () => {
      const isolated = path.join(os.tmpdir(), 'driv-tmpl-dedup-' + Date.now());
      try {
        await fs.promises.mkdir(path.join(isolated, '.driv', 'templates', 'proposals'), {
          recursive: true,
        });
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'default.md'),
          '# 默认\n\n{{x}}',
        );
        // 覆盖 system 数组中包含与默认重复的 'name'
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'config.yaml'),
          [
            'version: "1"',
            'proposals:',
            '  default: default',
            '  types: {}',
            'designs:',
            '  default: default',
            '  types: {}',
            'specs:',
            '  default: default',
            '  types: {}',
            'reviews: {}',
            'inheritance:',
            '  rules: []',
            'placeholders:',
            '  system:',
            '    - name',
            '    - extra',
            '  user: []',
            'project_override:',
            '  search_paths:',
            '    - .driv/templates/custom',
          ].join('\n'),
        );
        const { FileSystem } = await import('../src/utils/file-system.js');
        const { TemplateManager } = await import('../src/core/template-manager.js');
        const f = new FileSystem(isolated);
        const tm = new TemplateManager(f, isolated);
        const config = await tm.getConfig();
        const names = config.placeholders.system.filter((p) => p === 'name');
        expect(names).toHaveLength(1);
        expect(config.placeholders.system).toContain('extra');
      } finally {
        await fs.promises.rm(isolated, { recursive: true, force: true });
      }
    });
  });

  // ── P3-4: frontmatter 标准化 ──
  describe('frontmatter 标准化', () => {
    it('loadTemplate 解析并缓存 frontmatter', async () => {
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'proposals', 'fm-cached.md'),
        '---\ntemplate: fm-cached\nversion: 1.0\nplaceholders_required:\n  - change_name\n---\n\n# 测试\n\n{{change_name}}\n',
      );
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      await tm.loadTemplate('proposal', 'fm-cached');
      const fm = tm.getTemplateFrontmatter('proposal', 'fm-cached');
      expect(fm).not.toBeNull();
      expect(fm?.template).toBe('fm-cached');
      expect(fm?.version).toBe(1.0);
      expect(fm?.placeholders_required).toEqual(['change_name']);
    });

    it('无 frontmatter 的模板 getTemplateFrontmatter 返回 null', async () => {
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      await tm.loadTemplate('proposal', 'default');
      expect(tm.getTemplateFrontmatter('proposal', 'default')).toBeNull();
    });

    it('缺少 frontmatter 中声明的必填占位符时报告警告', async () => {
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'proposals', 'fm-missing.md'),
        '---\ntemplate: fm-missing\nplaceholders_required:\n  - change_name\n  - missing_one\n---\n\n# 测试\n\n{{change_name}}\n',
      );
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      const result = await tm.validateTemplate('proposal', 'fm-missing');
      const warn = result.warnings.find((w) => /缺少必填占位符/.test(w));
      expect(warn).toBeDefined();
      expect(warn).toContain('missing_one');
      expect(warn).not.toContain('change_name');
    });

    it('frontmatter 必填占位符全部存在时不报告该警告', async () => {
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'proposals', 'fm-ok.md'),
        '---\ntemplate: fm-ok\nplaceholders_required:\n  - change_name\n---\n\n# 测试\n\n{{change_name}}\n',
      );
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      const result = await tm.validateTemplate('proposal', 'fm-ok');
      expect(result.warnings.some((w) => /缺少必填占位符/.test(w))).toBe(false);
    });

    it('P0-1: required 占位符以 {{name:default}} 形式出现不应误判为缺失', async () => {
      // frontmatter 声明 placeholders_required: [priority]，模板正文使用 {{priority:P2}}
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'proposals', 'fm-default.md'),
        '---\ntemplate: fm-default\nplaceholders_required:\n  - priority\n---\n\n# 测试\n\n## 优先级\n\n{{priority:P2}}\n',
      );
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      const result = await tm.validateTemplate('proposal', 'fm-default');
      // 不应出现"缺少必填占位符: priority"的警告
      const missingWarn = result.warnings.find(
        (w) => /缺少必填占位符/.test(w) && /priority/.test(w),
      );
      expect(missingWarn).toBeUndefined();
    });

    it('P2-9: frontmatter YAML 解析失败时 console.warn 且 frontmatter 缓存为 null', async () => {
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'proposals', 'fm-bad-yaml.md'),
        '---\nkey: [unclosed\n---\n\n# 测试\n\n内容',
      );
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const fsInstance = new FileSystemClass(TMP_DIR);
        const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
        await tm.loadTemplate('proposal', 'fm-bad-yaml');
        expect(warnSpy).toHaveBeenCalled();
        const warnMsg = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
        expect(warnMsg).toContain('frontmatter');
        // frontmatter 缓存应为 null（解析失败契约不变）
        expect(tm.getTemplateFrontmatter('proposal', 'fm-bad-yaml')).toBeNull();
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('applyTemplate 父模板加载失败时输出 warn 日志', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        // 配置中已有继承规则 child: feature -> parent: default
        // 删除 default.md 模拟父模板加载失败
        await fs.promises.rm(path.join(TMPL_DIR, 'proposals', 'default.md'));
        const fsInstance = new FileSystemClass(TMP_DIR);
        const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
        // feature 模板仍存在，应回退使用子模板
        const result = await tm.applyTemplate('proposal', 'feature', { description: 'x' });
        expect(result).toContain('# 功能提案');
        expect(warnSpy).toHaveBeenCalled();
        const warnMsg = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
        expect(warnMsg).toContain('default');
      } finally {
        warnSpy.mockRestore();
        // 恢复 default.md
        await fs.promises.writeFile(
          path.join(TMPL_DIR, 'proposals', 'default.md'),
          '# 默认提案\n\n## 概述\n\n{{description}}\n\n## 背景\n\n{{background:无}}',
        );
      }
    });

    it('getInheritanceChain 循环引用时输出 warn 日志', async () => {
      const isolated = path.join(os.tmpdir(), 'driv-tmpl-cycle-' + Date.now());
      try {
        await fs.promises.mkdir(path.join(isolated, '.driv', 'templates', 'proposals'), {
          recursive: true,
        });
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'proposals', 'default.md'),
          '# 默认\n\n{{x}}',
        );
        // 构造循环引用: a -> b -> a
        await fs.promises.writeFile(
          path.join(isolated, '.driv', 'templates', 'config.yaml'),
          [
            'version: "1"',
            'proposals:',
            '  default: default',
            '  types: {}',
            'designs:',
            '  default: default',
            '  types: {}',
            'specs:',
            '  default: default',
            '  types: {}',
            'reviews: {}',
            'inheritance:',
            '  rules:',
            '    - child: a',
            '      parent: b',
            '      strategy: extend',
            '      sections: {}',
            '    - child: b',
            '      parent: a',
            '      strategy: extend',
            '      sections: {}',
            'placeholders:',
            '  system: []',
            '  user: []',
            'project_override:',
            '  search_paths:',
            '    - .driv/templates/custom',
          ].join('\n'),
        );
        const { FileSystem } = await import('../src/utils/file-system.js');
        const { TemplateManager } = await import('../src/core/template-manager.js');
        const f = new FileSystem(isolated);
        const tm = new TemplateManager(f, isolated);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
          const chain = await tm.getInheritanceChain('proposal', 'a');
          expect(chain).toEqual(['a']);
          expect(warnSpy).toHaveBeenCalled();
          const warnMsg = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
          expect(warnMsg).toContain('继承链解析失败');
        } finally {
          warnSpy.mockRestore();
        }
      } finally {
        await fs.promises.rm(isolated, { recursive: true, force: true });
      }
    });
  });

  // ── P2-1: 缓存一致性 ──
  describe('P2-1 缓存一致性', () => {
    it('selectTemplate 读取自定义模板后填充 frontmatterCache', async () => {
      // 覆盖自定义模板，带 frontmatter
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'custom', 'proposals', 'feature.md'),
        '---\ntemplate: custom-feature\n---\n\n# 项目自定义功能提案\n\n{{description}}',
      );
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      const content = await tm.selectTemplate('proposal', 'feature');
      expect(content).toContain('# 项目自定义功能提案');
      // selectTemplate 后应能取到 frontmatter（不再依赖 loadTemplate 前置调用）
      const fm = tm.getTemplateFrontmatter('proposal', 'feature');
      expect(fm).not.toBeNull();
      expect(fm?.template).toBe('custom-feature');
    });

    it('selectTemplate 读取 Core 层模板后也填充 frontmatterCache', async () => {
      // 给 default 模板加 frontmatter
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'proposals', 'default.md'),
        '---\ntemplate: core-default\n---\n\n# 默认提案\n\n{{description}}',
      );
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      // unknown_type 无自定义模板，回退到 Core 层 default
      await tm.selectTemplate('proposal', 'unknown_type');
      const fm = tm.getTemplateFrontmatter('proposal', 'default');
      expect(fm).not.toBeNull();
      expect(fm?.template).toBe('core-default');
      // 恢复 default.md
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'proposals', 'default.md'),
        '# 默认提案\n\n## 概述\n\n{{description}}\n\n## 背景\n\n{{background:无}}',
      );
    });

    it('clearCache 清空 frontmatterCache', async () => {
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'proposals', 'fm-clear.md'),
        '---\ntemplate: fm-clear\n---\n\n# 测试\n\n{{x}}',
      );
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      await tm.loadTemplate('proposal', 'fm-clear');
      expect(tm.getTemplateFrontmatter('proposal', 'fm-clear')).not.toBeNull();
      tm.clearCache();
      expect(tm.getTemplateFrontmatter('proposal', 'fm-clear')).toBeNull();
    });

    it('clearCache 清空 configCache 后可重新加载配置', async () => {
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      // 首次加载 config
      const config1 = await tm.getConfig();
      expect(config1).toBeDefined();
      // 修改 config.yaml
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'config.yaml'),
        [
          'version: "2"',
          'proposals:',
          '  default: default',
          '  types: {}',
          'designs:',
          '  default: default',
          '  types: {}',
          'specs:',
          '  default: default',
          '  types: {}',
          'reviews: {}',
          'inheritance:',
          '  rules: []',
          'placeholders:',
          '  system: []',
          '  user: []',
          'project_override:',
          '  search_paths:',
          '    - .driv/templates/custom',
        ].join('\n'),
      );
      tm.clearCache();
      const config2 = await tm.getConfig();
      expect(config2.version).toBe('2');
      // 恢复 config.yaml
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'config.yaml'),
        [
          'version: "1"',
          'proposals:',
          '  default: proposals/default.md',
          '  type_mapping:',
          '    feature: proposals/feature.md',
          '    bugfix: proposals/bugfix.md',
          '    refactor: proposals/refactor.md',
          '  types:',
          '    feature: feature',
          '    bugfix: bugfix',
          '    refactor: refactor',
          'designs:',
          '  default: designs/default.md',
          '  type_mapping:',
          '    feature: designs/feature.md',
          '    architecture: designs/architecture.md',
          '  types:',
          '    feature: feature',
          '    architecture: architecture',
          'specs:',
          '  default: specs/default.md',
          '  type_mapping:',
          '    capability: specs/capability.md',
          '    api: specs/api.md',
          '  types:',
          '    capability: capability',
          '    api: api',
          'reviews:',
          '  requirement: reviews/requirement-review.md',
          '  technical: reviews/technical-review.md',
          '  code: reviews/code-review.md',
          'inheritance:',
          '  rules:',
          '    - child: feature',
          '      parent: default',
          '      strategy: extend',
          '      sections: {}',
          'placeholders:',
          '  system:',
          '    - name',
          '    - date',
          '    - version',
          '  user: []',
          'project_override:',
          '  search_paths:',
          '    - .driv/templates/custom',
        ].join('\n'),
      );
    });
  });

  // ── P3-2: 模板内容缓存 ──
  describe('P3-2 模板内容缓存', () => {
    it('loadTemplate 同一模板连续调用两次，第二次从缓存返回', async () => {
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      const readFileSpy = vi.spyOn(fsInstance, 'readFile');
      await tm.loadTemplate('proposal', 'default');
      const firstCount = readFileSpy.mock.calls.length;
      expect(firstCount).toBeGreaterThan(0);
      await tm.loadTemplate('proposal', 'default');
      // 第二次应从 contentCache 返回，readFile 调用次数不增加
      expect(readFileSpy.mock.calls.length).toBe(firstCount);
    });

    it('clearCache 后 loadTemplate 重新读盘', async () => {
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      const readFileSpy = vi.spyOn(fsInstance, 'readFile');
      await tm.loadTemplate('proposal', 'default');
      const beforeClear = readFileSpy.mock.calls.length;
      tm.clearCache();
      await tm.loadTemplate('proposal', 'default');
      // clearCache 后应重新读盘
      expect(readFileSpy.mock.calls.length).toBeGreaterThan(beforeClear);
    });
  });

  // ── Task 2: getRequiredSections 接口 ──
  describe('Task 2 getRequiredSections', () => {
    it('返回模板 frontmatter 中声明的 required_sections 列表', async () => {
      // 覆盖 default.md，在 frontmatter 中声明 required_sections
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'proposals', 'default.md'),
        [
          '---',
          'template: proposal-default',
          'version: 1.0',
          'placeholders_required:',
          '  - change_name',
          'required_sections:',
          '  - 背景与问题',
          '  - 目标与非目标',
          '  - 变更范围',
          '  - 验收标准',
          '---',
          '',
          '# 变更提案',
          '',
          '## 背景与问题',
          '',
          '内容',
        ].join('\n'),
      );
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      const sections = await tm.getRequiredSections('proposal', 'default');
      expect(sections).toEqual([
        '背景与问题',
        '目标与非目标',
        '变更范围',
        '验收标准',
      ]);
    });

    it('模板无 frontmatter 时返回空数组（不抛错）', async () => {
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      // bugfix.md 由 beforeEach 创建，无 frontmatter
      const sections = await tm.getRequiredSections('proposal', 'bugfix');
      expect(sections).toEqual([]);
    });

    it('模板有 frontmatter 但未声明 required_sections 时返回空数组', async () => {
      await fs.promises.writeFile(
        path.join(TMPL_DIR, 'proposals', 'fm-no-sections.md'),
        '---\ntemplate: fm-no-sections\nversion: 1.0\n---\n\n# 测试\n\n{{x}}\n',
      );
      const fsInstance = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fsInstance, TMP_DIR);
      const sections = await tm.getRequiredSections('proposal', 'fm-no-sections');
      expect(sections).toEqual([]);
    });
  });
});
