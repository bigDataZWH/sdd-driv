import { describe, it, expect } from 'vitest';

describe('PlaceholderParser', () => {
  describe('parse', () => {
    it('解析简单 {{name}} 占位符', async () => {
      const { PlaceholderParser } = await import('../src/core/placeholder-parser.js');
      const result = PlaceholderParser.parse('hello {{name}}');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('name');
      expect(result[0].defaultValue).toBeNull();
      expect(result[0].fullMatch).toBe('{{name}}');
    });

    it('解析带默认值的 {{name:default}} 占位符', async () => {
      const { PlaceholderParser } = await import('../src/core/placeholder-parser.js');
      const result = PlaceholderParser.parse('hello {{name:world}}');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('name');
      expect(result[0].defaultValue).toBe('world');
      expect(result[0].fullMatch).toBe('{{name:world}}');
    });

    it('无占位符文本返回空数组', async () => {
      const { PlaceholderParser } = await import('../src/core/placeholder-parser.js');
      const result = PlaceholderParser.parse('hello world');
      expect(result).toHaveLength(0);
    });

    it('解析多个占位符', async () => {
      const { PlaceholderParser } = await import('../src/core/placeholder-parser.js');
      const result = PlaceholderParser.parse('{{greet}} {{name:user}}');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('greet');
      expect(result[0].defaultValue).toBeNull();
      expect(result[1].name).toBe('name');
      expect(result[1].defaultValue).toBe('user');
    });
  });

  describe('replace', () => {
    it('用提供的值替换占位符', async () => {
      const { PlaceholderParser } = await import('../src/core/placeholder-parser.js');
      const result = PlaceholderParser.replace('hello {{name}}', { name: 'world' });
      expect(result).toBe('hello world');
    });

    it('无值时使用默认值', async () => {
      const { PlaceholderParser } = await import('../src/core/placeholder-parser.js');
      const result = PlaceholderParser.replace('hello {{name:world}}', {});
      expect(result).toBe('hello world');
    });

    it('无值且无默认值时保留原占位符', async () => {
      const { PlaceholderParser } = await import('../src/core/placeholder-parser.js');
      const result = PlaceholderParser.replace('hello {{name}}', {});
      expect(result).toBe('hello {{name}}');
    });

    it('处理多行默认值', async () => {
      const { PlaceholderParser } = await import('../src/core/placeholder-parser.js');
      const result = PlaceholderParser.replace('code:\n{{code:line1\nline2\nline3}}', {});
      expect(result).toBe('code:\nline1\nline2\nline3');
    });

    it('处理空字符串', async () => {
      const { PlaceholderParser } = await import('../src/core/placeholder-parser.js');
      const result = PlaceholderParser.replace('', {});
      expect(result).toBe('');
    });
  });
});
