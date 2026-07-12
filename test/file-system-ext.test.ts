import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import os from 'os';

describe('FileSystem 扩展', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-fs-test-'));
  const projectRoot = path.join(tmpDir, 'project');

  const getFileSystem = async () => {
    const { FileSystem } = await import('../src/utils/file-system.js');
    return new FileSystem(projectRoot);
  };

  it('writeFile 创建父目录并写入内容', async () => {
    const fsys = await getFileSystem();
    const testFile = path.join(projectRoot, 'nested', 'test.txt');
    await fsys.writeFile(testFile, 'hello');
    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toBe('hello');
  });

  it('readFile 读取已有文件', async () => {
    const fsys = await getFileSystem();
    const testFile = path.join(projectRoot, 'read-test.txt');
    fs.writeFileSync(testFile, 'world', 'utf-8');
    const content = await fsys.readFile(testFile);
    expect(content).toBe('world');
  });

  it('exists 返回 true 当文件存在', async () => {
    const fsys = await getFileSystem();
    const testFile = path.join(projectRoot, 'exists-test.txt');
    fs.writeFileSync(testFile, '', 'utf-8');
    expect(await fsys.exists(testFile)).toBe(true);
    expect(await fsys.exists(path.join(projectRoot, 'non-existent'))).toBe(false);
  });

  it('copyFile 复制文件', async () => {
    const fsys = await getFileSystem();
    const src = path.join(projectRoot, 'copy-src.txt');
    const dst = path.join(projectRoot, 'nested', 'copy-dst.txt');
    fs.writeFileSync(src, 'copy-me', 'utf-8');
    await fsys.copyFile(src, dst);
    expect(fs.readFileSync(dst, 'utf-8')).toBe('copy-me');
  });

  it('listDir 返回目录内容', async () => {
    const fsys = await getFileSystem();
    const dir = path.join(projectRoot, 'list-test');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'a.txt'), '', 'utf-8');
    fs.writeFileSync(path.join(dir, 'b.txt'), '', 'utf-8');
    const entries = await fsys.listDir(dir);
    expect(entries).toContain('a.txt');
    expect(entries).toContain('b.txt');
  });

  it('writeFile 拒绝项目根目录外的路径', async () => {
    const fsys = await getFileSystem();
    const outside = path.join(tmpDir, 'outside.txt');
    await expect(fsys.writeFile(outside, 'bad')).rejects.toThrow(/outside/i);
  });

  it('readFile 拒绝项目根目录外的路径', async () => {
    const fsys = await getFileSystem();
    const outside = path.join(tmpDir, 'outside-read.txt');
    await expect(fsys.readFile(outside)).rejects.toThrow(/outside/i);
  });
});
