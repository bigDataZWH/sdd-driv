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

    it('review 未知 changeType 回退到默认（使用 changeType 作为名称）', async () => {
      const fs = new FileSystemClass(TMP_DIR);
      const tm = new TemplateManagerClass(fs, TMP_DIR);
      await expect(tm.selectTemplate('review', 'nobody')).rejects.toThrow();
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
});
