import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

describe('ScriptExec', () => {
  it('exec 成功运行简单命令并返回结果', async () => {
    const { ScriptExec } = await import('../src/utils/script-exec.js');
    const exec = new ScriptExec();
    const result = await exec.exec(process.execPath, ['-e', 'console.log("ok")']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('ok');
  });

  it('exec 超时时 reject TimeoutError', async () => {
    const { ScriptExec } = await import('../src/utils/script-exec.js');
    const exec = new ScriptExec();
    const promise = exec.exec(
      process.execPath,
      ['-e', 'setTimeout(() => console.log("too late"), 5000)'],
      { timeout: 100 },
    );
    await expect(promise).rejects.toThrow(/timed out/i);
  });

  it('exec 传递 cwd 参数', async () => {
    const { ScriptExec } = await import('../src/utils/script-exec.js');
    const exec = new ScriptExec();
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-exec-'));
    const result = await exec.exec(process.execPath, ['-e', 'console.log(process.cwd())'], {
      cwd: tmpDir,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(tmpDir);
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it('exec 返回非零 exitCode', async () => {
    const { ScriptExec } = await import('../src/utils/script-exec.js');
    const exec = new ScriptExec();
    const result = await exec.exec(process.execPath, ['-e', 'process.exit(42)']);
    expect(result.exitCode).toBe(42);
  });
});
