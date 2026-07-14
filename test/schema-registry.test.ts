import { describe, it, expect } from 'vitest';

describe('SchemaRegistry', () => {
  describe('parseArtifact', () => {
    it('解析带 frontmatter 的产物', async () => {
      const { SchemaRegistry } = await import('../src/core/schema-registry.js');
      const registry = new SchemaRegistry();
      const content = `---
type: spec
title: Test Spec
---

# Spec Title

## Section

Body content.`;
      const result = registry.parseArtifact(content);
      expect(result.frontmatter).not.toBeNull();
      expect(result.frontmatter?.type).toBe('spec');
      expect(result.frontmatter?.title).toBe('Test Spec');
      expect(result.body).toContain('# Spec Title');
      expect(result.body).not.toContain('type: spec');
      expect(result.sections).toContain('# Spec Title');
      expect(result.sections).toContain('## Section');
    });

    it('无 frontmatter 时返回 null 并保留全部内容为 body', async () => {
      const { SchemaRegistry } = await import('../src/core/schema-registry.js');
      const registry = new SchemaRegistry();
      const content = `# Plain Document

No frontmatter here.`;
      const result = registry.parseArtifact(content);
      expect(result.frontmatter).toBeNull();
      expect(result.body).toBe(content);
      expect(result.sections).toContain('# Plain Document');
    });

    it('提取多级标题为 sections', async () => {
      const { SchemaRegistry } = await import('../src/core/schema-registry.js');
      const registry = new SchemaRegistry();
      const content = `# H1

## H2

### H3`;
      const result = registry.parseArtifact(content);
      expect(result.sections).toEqual(['# H1', '## H2', '### H3']);
    });

    it('空内容返回 null frontmatter 和空 body', async () => {
      const { SchemaRegistry } = await import('../src/core/schema-registry.js');
      const registry = new SchemaRegistry();
      const result = registry.parseArtifact('');
      expect(result.frontmatter).toBeNull();
      expect(result.body).toBe('');
      expect(result.sections).toEqual([]);
    });

    it('frontmatter 为非对象（纯字符串）时返回 null', async () => {
      const { SchemaRegistry } = await import('../src/core/schema-registry.js');
      const registry = new SchemaRegistry();
      const content = `---
just a string
---

# Body`;
      const result = registry.parseArtifact(content);
      expect(result.frontmatter).toBeNull();
    });

    it('格式错误的 YAML frontmatter（解析失败）时返回 null', async () => {
      const { SchemaRegistry } = await import('../src/core/schema-registry.js');
      const registry = new SchemaRegistry();
      const content = `---
"unclosed string
---

# Body`;
      const result = registry.parseArtifact(content);
      expect(result.frontmatter).toBeNull();
      expect(result.body).toContain('# Body');
    });
  });

  describe('validate', () => {
    it('有效产物返回 valid=true', async () => {
      const { SchemaRegistry } = await import('../src/core/schema-registry.js');
      const registry = new SchemaRegistry();
      const parsed = registry.parseArtifact('# Valid Spec\n\nContent here.');
      const result = registry.validate('spec', parsed);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('body 为空时返回 valid=false', async () => {
      const { SchemaRegistry } = await import('../src/core/schema-registry.js');
      const registry = new SchemaRegistry();
      const parsed = registry.parseArtifact('');
      const result = registry.validate('spec', parsed);
      expect(result.valid).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('缺少必需章节 (# ) 返回 valid=false', async () => {
      const { SchemaRegistry } = await import('../src/core/schema-registry.js');
      const registry = new SchemaRegistry();
      const parsed = registry.parseArtifact('No heading here, just text.');
      const result = registry.validate('spec', parsed);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes('# '))).toBe(true);
    });

    it('未知类型返回 valid=true (无 schema)', async () => {
      const { SchemaRegistry } = await import('../src/core/schema-registry.js');
      const registry = new SchemaRegistry();
      const result = registry.validate('unknown-type', { body: 'anything' });
      expect(result.valid).toBe(true);
    });

    it('接受字符串作为 parsed 参数', async () => {
      const { SchemaRegistry } = await import('../src/core/schema-registry.js');
      const registry = new SchemaRegistry();
      const result = registry.validate('spec', '# String Input\n\nContent.');
      expect(result.valid).toBe(true);
    });

    it('自定义 schema 生效', async () => {
      const { SchemaRegistry } = await import('../src/core/schema-registry.js');
      const registry = new SchemaRegistry({
        custom: {
          requiredSections: ['## Requirements'],
        },
      });
      const result1 = registry.validate('custom', { body: '# Title\n\nContent' });
      expect(result1.valid).toBe(false);
      const result2 = registry.validate('custom', { body: '## Requirements\n\n- Req 1' });
      expect(result2.valid).toBe(true);
    });

    it('body 仅含空白时返回 valid=false', async () => {
      const { SchemaRegistry } = await import('../src/core/schema-registry.js');
      const registry = new SchemaRegistry();
      const result = registry.validate('spec', { body: '   \n\t  \n' });
      expect(result.valid).toBe(false);
    });

    it('proposal 类型验证', async () => {
      const { SchemaRegistry } = await import('../src/core/schema-registry.js');
      const registry = new SchemaRegistry();
      const result = registry.validate('proposal', '# Proposal\n\nSome content');
      expect(result.valid).toBe(true);
    });

    it('tasks 类型验证', async () => {
      const { SchemaRegistry } = await import('../src/core/schema-registry.js');
      const registry = new SchemaRegistry();
      const result = registry.validate('tasks', '# Tasks\n\n- Task 1');
      expect(result.valid).toBe(true);
    });
  });
});
