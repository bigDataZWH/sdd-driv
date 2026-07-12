import { describe, it, expect } from 'vitest';

describe('YamlParser', () => {
  it('parse 将 YAML 字符串解析为对象', async () => {
    const { YamlParser } = await import('../src/utils/yaml-parser.js');
    const parser = new YamlParser();
    const obj = parser.parse('key: value\nnested:\n  inner: 42\n');
    expect(obj.key).toBe('value');
    expect(obj.nested.inner).toBe(42);
  });

  it('stringify 将对象序列化为 YAML', async () => {
    const { YamlParser } = await import('../src/utils/yaml-parser.js');
    const parser = new YamlParser();
    const yaml = parser.stringify({ key: 'value', num: 42 });
    expect(yaml).toContain('key: value');
    expect(yaml).toContain('num: 42');
  });

  it('readFile 读取 YAML 文件', async () => {
    const { YamlParser } = await import('../src/utils/yaml-parser.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const os = await import('os');
    const p = await import('path');
    const tmpDir = os.tmpdir();
    const projectRoot = p.join(tmpDir, 'driv-yaml-test-' + Date.now());
    const fsys = new FileSystem(projectRoot);
    const parser = new YamlParser(fsys);
    const testFile = p.join(projectRoot, 'test.yaml');
    await fsys.writeFile(testFile, 'name: driv\nversion: 1\n');
    const obj = await parser.readFile(testFile);
    expect(obj.name).toBe('driv');
    expect(obj.version).toBe(1);
  });

  it('writeFile 将对象写入 YAML 文件', async () => {
    const { YamlParser } = await import('../src/utils/yaml-parser.js');
    const { FileSystem } = await import('../src/utils/file-system.js');
    const os = await import('os');
    const p = await import('path');
    const tmpDir = os.tmpdir();
    const projectRoot = p.join(tmpDir, 'driv-yaml-write-' + Date.now());
    const fsys = new FileSystem(projectRoot);
    const parser = new YamlParser(fsys);
    const testFile = p.join(projectRoot, 'output.yaml');
    await parser.writeFile(testFile, { a: 1, b: { c: 2 } });
    const obj = await parser.readFile(testFile);
    expect(obj.a).toBe(1);
    expect(obj.b.c).toBe(2);
  });

  it('setField 更新嵌套字段', async () => {
    const { YamlParser } = await import('../src/utils/yaml-parser.js');
    const parser = new YamlParser();
    const obj = { a: { b: { c: 1 } }, d: 2 };
    parser.setField(obj, 'a.b.c', 99);
    expect(obj.a.b.c).toBe(99);
    expect(obj.d).toBe(2);
  });

  it('setField 创建不存在的嵌套路径', async () => {
    const { YamlParser } = await import('../src/utils/yaml-parser.js');
    const parser = new YamlParser();
    const obj = {};
    parser.setField(obj, 'x.y.z', 'new');
    expect((obj as any).x.y.z).toBe('new');
  });
});
