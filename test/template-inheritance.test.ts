import { describe, it, expect } from 'vitest';

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
});
