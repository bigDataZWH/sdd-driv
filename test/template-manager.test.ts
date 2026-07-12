import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
});
