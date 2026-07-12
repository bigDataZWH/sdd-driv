import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TMP_DIR = path.join(os.tmpdir(), 'driv-test-' + Date.now());

beforeEach(async () => {
  await fs.promises.mkdir(TMP_DIR, { recursive: true });
});

afterEach(async () => {
  await fs.promises.rm(TMP_DIR, { recursive: true, force: true });
});

describe('fileExists', () => {
  it('文件存在时返回 true', async () => {
    const { fileExists } = await import('../src/utils/file-system.js');
    const testFile = path.join(TMP_DIR, 'exists.txt');
    await fs.promises.writeFile(testFile, 'hello');
    expect(await fileExists(testFile)).toBe(true);
  });

  it('文件不存在时返回 false', async () => {
    const { fileExists } = await import('../src/utils/file-system.js');
    expect(await fileExists(path.join(TMP_DIR, 'nope.txt'))).toBe(false);
  });
});

describe('ensureDir', () => {
  it('创建不存在的目录', async () => {
    const { ensureDir } = await import('../src/utils/file-system.js');
    const newDir = path.join(TMP_DIR, 'a', 'b', 'c');
    await ensureDir(newDir);
    expect(fs.existsSync(newDir)).toBe(true);
  });

  it('目录已存在时不报错', async () => {
    const { ensureDir } = await import('../src/utils/file-system.js');
    const existingDir = path.join(TMP_DIR, 'already-there');
    await fs.promises.mkdir(existingDir, { recursive: true });
    await expect(ensureDir(existingDir)).resolves.toBeUndefined();
  });
});

describe('writeFile', () => {
  it('写入文件并创建父目录', async () => {
    const { writeFile } = await import('../src/utils/file-system.js');
    const filePath = path.join(TMP_DIR, 'nested', 'test.txt');
    await writeFile(filePath, 'content');
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('content');
  });
});

describe('readJson', () => {
  it('读取并解析 JSON 文件', async () => {
    const { readJson } = await import('../src/utils/file-system.js');
    const filePath = path.join(TMP_DIR, 'data.json');
    await fs.promises.writeFile(filePath, '{"key": "value"}');
    const data = await readJson<{ key: string }>(filePath);
    expect(data.key).toBe('value');
  });
});

describe('copyFile', () => {
  it('复制文件到目标路径', async () => {
    const { copyFile } = await import('../src/utils/file-system.js');
    const src = path.join(TMP_DIR, 'src.txt');
    const dest = path.join(TMP_DIR, 'sub', 'dest.txt');
    await fs.promises.writeFile(src, 'copy me');
    await copyFile(src, dest);
    expect(fs.readFileSync(dest, 'utf-8')).toBe('copy me');
  });
});
