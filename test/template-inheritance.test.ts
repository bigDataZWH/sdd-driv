import { describe, it, expect, vi } from 'vitest';

describe('TemplateInheritance', () => {
  describe('parseSections', () => {
    it('将 markdown 按 # 标题解析为 section 数组', async () => {
      const { parseSections } = await import('../src/core/template-inheritance.js');
      const md = `# 简介

这是简介内容。

## 子标题

子标题内容。

# 核心功能

核心功能描述。`;

      const sections = parseSections(md);
      expect(sections).toHaveLength(2);
      expect(sections[0].name).toBe('简介');
      expect(sections[0].level).toBe(1);
      expect(sections[0].content).toContain('这是简介内容。');
      expect(sections[0].children).toHaveLength(1);
      expect(sections[0].children![0].name).toBe('子标题');
      expect(sections[0].children![0].level).toBe(2);
      expect(sections[1].name).toBe('核心功能');
      expect(sections[1].level).toBe(1);
    });

    it('解析空 markdown 返回空数组', async () => {
      const { parseSections } = await import('../src/core/template-inheritance.js');
      expect(parseSections('')).toEqual([]);
    });

    it('解析无标题的 markdown 返回空数组', async () => {
      const { parseSections } = await import('../src/core/template-inheritance.js');
      expect(parseSections('纯文本内容\n没有标题')).toEqual([]);
    });
  });

  describe('applyInheritance extend', () => {
    it('extend 策略保留父模板全部内容后追加子模板内容', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = `# 简介

父模板简介。

# 配置

父模板配置。`;

      const child = `# 简介

子模板简介。

# 配置

子模板配置。`;

      const rule = {
        child: 'child',
        parent: 'parent',
        strategy: 'extend' as const,
        sections: {},
      };

      const result = applyInheritance(parent, child, rule);
      expect(result).toContain('# 简介');
      expect(result).toContain('父模板简介。');
      expect(result).toContain('# 配置');
      expect(result).toContain('父模板配置。');
      expect(result).toContain('子模板简介。');
      expect(result).toContain('子模板配置。');
      // 父内容应该在子内容之前
      const parentIntroIndex = result.indexOf('父模板简介。');
      const childIntroIndex = result.indexOf('子模板简介。');
      expect(parentIntroIndex).toBeLessThan(childIntroIndex);
    });
  });

  describe('applyInheritance override', () => {
    it('override 策略替换父模板中指定的 section', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = `# 简介

父模板简介。

# 配置

父模板配置。`;

      const child = `# 简介

子模板简介。

# 配置

子模板配置。`;

      const rule = {
        child: 'child',
        parent: 'parent',
        strategy: 'override' as const,
        sections: { override: ['简介'] },
      };

      const result = applyInheritance(parent, child, rule);
      expect(result).toContain('子模板简介。');
      expect(result).toContain('父模板配置。');
      expect(result).not.toContain('父模板简介。');
      expect(result).not.toContain('子模板配置。');
    });

    it('override 不存在的 section 时保留父模板不变', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = '# 简介\n\n内容。';
      const child = '# 不存在\n\n其他。';
      const rule = {
        child: 'child',
        parent: 'parent',
        strategy: 'override' as const,
        sections: { override: ['不存在'] },
      };

      const result = applyInheritance(parent, child, rule);
      expect(result).toContain('简介');
      expect(result).toContain('内容。');
      expect(result).not.toContain('不存在');
    });
  });

  describe('applyInheritance merge', () => {
    it('merge 策略将子模板 section 内容追加到父模板对应 section', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = `# 简介

父模板简介。`;

      const child = `# 简介

子模板补充内容。`;

      const rule = {
        child: 'child',
        parent: 'parent',
        strategy: 'merge' as const,
        sections: { merge: ['简介'] },
      };

      const result = applyInheritance(parent, child, rule);
      expect(result).toContain('父模板简介。');
      expect(result).toContain('子模板补充内容。');
      // 父内容应在子内容之前
      const parentIdx = result.indexOf('父模板简介。');
      const childIdx = result.indexOf('子模板补充内容。');
      expect(parentIdx).toBeLessThan(childIdx);
    });

    it('merge 不存在的 section 时忽略', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = '# 简介\n\n内容。';
      const child = '# 不存在\n\n其他。';
      const rule = {
        child: 'child',
        parent: 'parent',
        strategy: 'merge' as const,
        sections: { merge: ['不存在'] },
      };

      const result = applyInheritance(parent, child, rule);
      expect(result).toContain('简介');
      expect(result).toContain('内容。');
      expect(result).not.toContain('不存在');
    });
  });

  describe('applyInheritance add', () => {
    it('add 策略插入子模板中有而父模板中没有的 section', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = `# 简介

已有内容。`;

      const child = `# 简介

子简介。

# 新增章节

新增内容。`;

      const rule = {
        child: 'child',
        parent: 'parent',
        strategy: 'add' as const,
        sections: { add: ['新增章节'] },
      };

      const result = applyInheritance(parent, child, rule);
      expect(result).toContain('已有内容。');
      expect(result).toContain('新增内容。');
      expect(result).not.toContain('子简介');
    });

    it('add 不覆盖父模板中已存在的 section', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = '# 简介\n\n父内容。';
      const child = '# 简介\n\n子内容。';
      const rule = {
        child: 'child',
        parent: 'parent',
        strategy: 'add' as const,
        sections: { add: ['简介'] },
      };

      const result = applyInheritance(parent, child, rule);
      expect(result).toContain('父内容。');
      expect(result).not.toContain('子内容。');
    });
  });

  // ── P0-3: frontmatter 在继承中泄漏 ──
  describe('applyInheritance frontmatter 处理', () => {
    it('extend 策略：父子都有 frontmatter 时只保留父 frontmatter', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = `---
template: parent
---

# 父标题

父内容。`;

      const child = `---
template: child
---

# 子标题

子内容。`;

      const rule = {
        child: 'child',
        parent: 'parent',
        strategy: 'extend' as const,
        sections: {},
      };

      const result = applyInheritance(parent, child, rule);
      // 父 frontmatter 应保留
      expect(result.startsWith('---\ntemplate: parent\n---')).toBe(true);
      // 子 frontmatter 不应作为正文泄漏
      const childFmCount = (result.match(/template: child/g) || []).length;
      expect(childFmCount).toBe(0);
      // 正文应包含父和子的内容
      expect(result).toContain('# 父标题');
      expect(result).toContain('父内容。');
      expect(result).toContain('# 子标题');
      expect(result).toContain('子内容。');
    });

    it('override 策略：父子都有 frontmatter 时保留父 frontmatter，section 替换正确', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = `---
template: parent
---

# 简介

父简介。

# 配置

父配置。`;

      const child = `---
template: child
---

# 简介

子简介。

# 配置

子配置。`;

      const rule = {
        child: 'child',
        parent: 'parent',
        strategy: 'override' as const,
        sections: { override: ['简介'] },
      };

      const result = applyInheritance(parent, child, rule);
      // 父 frontmatter 应保留在最前
      expect(result.startsWith('---\ntemplate: parent\n---')).toBe(true);
      // 子 frontmatter 不应出现
      const childFmCount = (result.match(/template: child/g) || []).length;
      expect(childFmCount).toBe(0);
      // section 替换正确
      expect(result).toContain('子简介。');
      expect(result).not.toContain('父简介。');
      expect(result).toContain('父配置。');
    });
  });

  // ── P1-2: 4 种新继承策略 ──
  describe('applyInheritance replace', () => {
    it('replace 策略完全替换父模板中指定的 section', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = `# 简介

父简介。

# 配置

父配置。`;

      const child = `# 简介

子简介。

# 配置

子配置。`;

      const rule = {
        child: 'child',
        parent: 'parent',
        strategy: 'replace' as const,
        sections: { replace: ['配置'] },
      };

      const result = applyInheritance(parent, child, rule);
      // 简介保留父
      expect(result).toContain('父简介。');
      // 配置被替换为子
      expect(result).toContain('子配置。');
      expect(result).not.toContain('父配置。');
    });

    it('replace 不存在的 section 时保留父模板不变', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = '# 简介\n\n内容。';
      const child = '# 不存在\n\n其他。';
      const rule = {
        child: 'child',
        parent: 'parent',
        strategy: 'replace' as const,
        sections: { replace: ['不存在'] },
      };

      const result = applyInheritance(parent, child, rule);
      expect(result).toContain('简介');
      expect(result).toContain('内容。');
    });
  });

  describe('applyInheritance prepend', () => {
    it('prepend 策略将子 section 内容前置到父 section 前', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = `# 简介

父内容。`;

      const child = `# 简介

子前置内容。`;

      const rule = {
        child: 'child',
        parent: 'parent',
        strategy: 'prepend' as const,
        sections: { prepend: ['简介'] },
      };

      const result = applyInheritance(parent, child, rule);
      expect(result).toContain('父内容。');
      expect(result).toContain('子前置内容。');
      // 子内容应在父内容之前
      const childIdx = result.indexOf('子前置内容。');
      const parentIdx = result.indexOf('父内容。');
      expect(childIdx).toBeLessThan(parentIdx);
    });
  });

  describe('applyInheritance append', () => {
    it('append 策略将子 section 内容追加到父 section 后', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = `# 简介

父内容。`;

      const child = `# 简介

子追加内容。`;

      const rule = {
        child: 'child',
        parent: 'parent',
        strategy: 'append' as const,
        sections: { append: ['简介'] },
      };

      const result = applyInheritance(parent, child, rule);
      expect(result).toContain('父内容。');
      expect(result).toContain('子追加内容。');
      // 父内容应在子内容之前
      const parentIdx = result.indexOf('父内容。');
      const childIdx = result.indexOf('子追加内容。');
      expect(parentIdx).toBeLessThan(childIdx);
    });
  });

  describe('applyInheritance wrap', () => {
    it('wrap 策略将子模板中的 {{CORE_TEMPLATE}} 替换为父 section 内容', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = `# 简介

父核心内容。`;

      const child = `# 简介

子前缀。
{{CORE_TEMPLATE}}
子后缀。`;

      const rule = {
        child: 'child',
        parent: 'parent',
        strategy: 'wrap' as const,
        sections: { wrap: ['简介'] },
      };

      const result = applyInheritance(parent, child, rule);
      // 子前缀和子后缀都应保留
      expect(result).toContain('子前缀。');
      expect(result).toContain('子后缀。');
      // 父核心内容应被注入到 {{CORE_TEMPLATE}} 位置
      expect(result).toContain('父核心内容。');
      // {{CORE_TEMPLATE}} 占位符应被替换
      expect(result).not.toContain('{{CORE_TEMPLATE}}');
      // 父内容应在子前缀之后、子后缀之前
      const preIdx = result.indexOf('子前缀。');
      const coreIdx = result.indexOf('父核心内容。');
      const postIdx = result.indexOf('子后缀。');
      expect(preIdx).toBeLessThan(coreIdx);
      expect(coreIdx).toBeLessThan(postIdx);
    });

    it('wrap 多个 {{CORE_TEMPLATE}} 占位符都被替换', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = `# 简介

核心。`;

      const child = `# 简介

前。
{{CORE_TEMPLATE}}
中。
{{CORE_TEMPLATE}}
后。`;

      const rule = {
        child: 'child',
        parent: 'parent',
        strategy: 'wrap' as const,
        sections: { wrap: ['简介'] },
      };

      const result = applyInheritance(parent, child, rule);
      // 两个占位符都应被替换
      expect(result).not.toContain('{{CORE_TEMPLATE}}');
      // 应包含 2 次"核心。"
      const matches = result.match(/核心。/g) || [];
      expect(matches).toHaveLength(2);
    });
  });

  describe('resolveChain', () => {
    it('返回正确的继承链顺序', async () => {
      const { resolveChain } = await import('../src/core/template-inheritance.js');
      const rules = [
        { child: 'child-a', parent: 'parent-x', strategy: 'extend' as const, sections: {} },
        { child: 'child-b', parent: 'child-a', strategy: 'override' as const, sections: {} },
        { child: 'child-c', parent: 'child-b', strategy: 'merge' as const, sections: {} },
      ];

      expect(
        resolveChain(
          [
            { child: 'child-a', parent: 'parent-x', strategy: 'extend', sections: {} },
            { child: 'child-b', parent: 'child-a', strategy: 'override', sections: {} },
            { child: 'child-c', parent: 'child-b', strategy: 'merge', sections: {} },
          ],
          'child-c',
        ),
      ).toEqual(['parent-x', 'child-a', 'child-b', 'child-c']);
    });

    it('检测循环引用并抛出错误', async () => {
      const { resolveChain } = await import('../src/core/template-inheritance.js');
      const rules = [
        { child: 'a', parent: 'b', strategy: 'extend' as const, sections: {} },
        { child: 'b', parent: 'c', strategy: 'extend' as const, sections: {} },
        { child: 'c', parent: 'a', strategy: 'extend' as const, sections: {} },
      ];

      expect(() => resolveChain(rules, 'a')).toThrow('循环引用');
    });

    it('检测自引用循环', async () => {
      const { resolveChain } = await import('../src/core/template-inheritance.js');
      const rules = [{ child: 'a', parent: 'a', strategy: 'extend' as const, sections: {} }];

      expect(() => resolveChain(rules, 'a')).toThrow('循环引用');
    });

    it('叶子模板（无子规则）返回单元素数组', async () => {
      const { resolveChain } = await import('../src/core/template-inheritance.js');
      expect(resolveChain([], 'base')).toEqual(['base']);
    });
  });

  // ── P2-2: sectionToText 保留空行结构 ──
  describe('P2-2 sectionToText 空行结构', () => {
    it('parseSections → sectionsToText 往返保留标题与正文间的空行', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = `# 简介\n\n正文内容。`;
      // override 不存在的 section，触发 parseSections → sectionsToText 往返
      const result = applyInheritance(parent, '', {
        child: 'c',
        parent: 'p',
        strategy: 'override' as const,
        sections: { override: ['不存在'] },
      });
      // 标题与正文间应保留空行（markdown 惯例 \n\n）
      expect(result).toContain('# 简介\n\n正文内容。');
    });

    it('带子 section 时往返保留层级间空行', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = `# 简介\n\n父内容。\n\n## 子节\n\n子内容。`;
      const result = applyInheritance(parent, '', {
        child: 'c',
        parent: 'p',
        strategy: 'override' as const,
        sections: { override: ['不存在'] },
      });
      expect(result).toContain('# 简介\n\n父内容。');
      expect(result).toContain('## 子节\n\n子内容。');
    });
  });

  // ── P2-3: parseSections 跳过代码块内的 # ──
  describe('P2-3 代码块内 # 不识别为标题', () => {
    it('代码块内的 # 注释不识别为 section', async () => {
      const { parseSections } = await import('../src/core/template-inheritance.js');
      const md = [
        '# 简介',
        '',
        '正文。',
        '',
        '```',
        '# 注释',
        '## 也是注释',
        '```',
        '',
        '# 真实标题',
        '',
        '真实内容。',
      ].join('\n');
      const sections = parseSections(md);
      const names = sections.map((s) => s.name);
      expect(names).toContain('简介');
      expect(names).toContain('真实标题');
      // 代码块内的 # 不应作为独立 section
      expect(names).not.toContain('注释');
      expect(names).not.toContain('也是注释');
    });

    it('代码块内容应作为上一个 section 的 content', async () => {
      const { parseSections } = await import('../src/core/template-inheritance.js');
      const md = [
        '# 简介',
        '',
        '正文。',
        '',
        '```',
        '# 注释',
        '```',
      ].join('\n');
      const sections = parseSections(md);
      expect(sections).toHaveLength(1);
      expect(sections[0].name).toBe('简介');
      // 代码块内容应保留在 content 中
      expect(sections[0].content).toContain('# 注释');
      expect(sections[0].content).toContain('```');
    });
  });

  // ── P2-4: findSectionByName 可选 level 参数 ──
  describe('P2-4 findSectionByName level 参数', () => {
    it('同名不同 level 时指定 level 返回对应层级 section', async () => {
      const { parseSections, findSectionByName } = await import(
        '../src/core/template-inheritance.js'
      );
      const md = `# 概述\n\n顶层概述。\n\n## 概述\n\n子层概述。`;
      const sections = parseSections(md);
      // 不指定 level：返回第一个匹配（顶层 level 1）
      const anyMatch = findSectionByName(sections, '概述');
      expect(anyMatch?.level).toBe(1);
      // 指定 level 2：返回子层
      const level2 = findSectionByName(sections, '概述', 2);
      expect(level2?.level).toBe(2);
      expect(level2?.content).toContain('子层概述。');
      // 指定 level 1：返回顶层
      const level1 = findSectionByName(sections, '概述', 1);
      expect(level1?.level).toBe(1);
      expect(level1?.content).toContain('顶层概述。');
    });

    it('指定不存在的 level 时返回 undefined', async () => {
      const { parseSections, findSectionByName } = await import(
        '../src/core/template-inheritance.js'
      );
      const md = `# 概述\n\n顶层概述。`;
      const sections = parseSections(md);
      expect(findSectionByName(sections, '概述', 3)).toBeUndefined();
    });
  });

  // ── P2-5: merge 策略合并子 section 的 children ──
  describe('P2-5 merge 策略合并 children', () => {
    it('父 section 无 children，子 section 有 children，merge 后父应包含子的 children', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = `# 简介\n\n父内容。`;
      const child = `# 简介\n\n子内容。\n\n## 子小节\n\n子小节内容。`;
      const rule = {
        child: 'c',
        parent: 'p',
        strategy: 'merge' as const,
        sections: { merge: ['简介'] },
      };
      const result = applyInheritance(parent, child, rule);
      expect(result).toContain('父内容。');
      expect(result).toContain('子内容。');
      // 子 section 的 children 应被合并进来
      expect(result).toContain('## 子小节');
      expect(result).toContain('子小节内容。');
    });

    it('merge 不重复添加父已有的同名 child section', async () => {
      const { applyInheritance } = await import('../src/core/template-inheritance.js');
      const parent = `# 简介\n\n父内容。\n\n## 子小节\n\n父的子小节。`;
      const child = `# 简介\n\n子内容。\n\n## 子小节\n\n子的子小节。`;
      const rule = {
        child: 'c',
        parent: 'p',
        strategy: 'merge' as const,
        sections: { merge: ['简介'] },
      };
      const result = applyInheritance(parent, child, rule);
      // 父的子小节内容应保留
      expect(result).toContain('父的子小节。');
      // 不应重复出现两个 ## 子小节 标题
      const matches = result.match(/^## 子小节/gm) || [];
      expect(matches).toHaveLength(1);
    });
  });

  // ── P2-7: resolveChain 多 parent 静默覆盖 ──
  describe('P2-7 resolveChain 多 parent 检测', () => {
    it('同一 child 配置多个不同 parent 时 console.warn', async () => {
      const { resolveChain } = await import('../src/core/template-inheritance.js');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const rules = [
          { child: 'feature', parent: 'default', strategy: 'extend' as const, sections: {} },
          { child: 'feature', parent: 'other', strategy: 'extend' as const, sections: {} },
        ];
        resolveChain(rules, 'feature');
        expect(warnSpy).toHaveBeenCalled();
        const warnMsg = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
        expect(warnMsg).toContain('feature');
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('同一 child 配置相同 parent 时不 warn', async () => {
      const { resolveChain } = await import('../src/core/template-inheritance.js');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const rules = [
          { child: 'feature', parent: 'default', strategy: 'extend' as const, sections: {} },
          { child: 'feature', parent: 'default', strategy: 'extend' as const, sections: {} },
        ];
        resolveChain(rules, 'feature');
        expect(warnSpy).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });
  });
});
