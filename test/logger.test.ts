import { describe, it, expect } from 'vitest';
import { Writable } from 'stream';

describe('Logger', () => {
  function captureStream(): { stream: Writable; lines: string[] } {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding: string, cb: () => void) {
        lines.push(chunk.toString().trimEnd());
        cb();
      },
    });
    return { stream, lines };
  }

  it('info 输出 [INFO] 格式', async () => {
    const { Logger } = await import('../src/utils/logger.js');
    const { stream, lines } = captureStream();
    const log = new Logger(stream);
    log.info('hello world', { key: 'val' });
    expect(lines.length).toBe(1);
    expect(lines[0]).toMatch(/^\[INFO\]/);
    expect(lines[0]).toContain('hello world');
    expect(lines[0]).toContain('"key":"val"');
  });

  it('warn 输出 [WARN] 格式', async () => {
    const { Logger } = await import('../src/utils/logger.js');
    const { stream, lines } = captureStream();
    const log = new Logger(stream);
    log.warn('小心处理', { count: 3 });
    expect(lines.length).toBe(1);
    expect(lines[0]).toMatch(/^\[WARN\]/);
    expect(lines[0]).toContain('小心处理');
    expect(lines[0]).toContain('"count":3');
  });

  it('error 输出 [ERROR] 格式', async () => {
    const { Logger } = await import('../src/utils/logger.js');
    const { stream, lines } = captureStream();
    const log = new Logger(stream);
    log.error('出错了', { code: 500 });
    expect(lines.length).toBe(1);
    expect(lines[0]).toMatch(/^\[ERROR\]/);
    expect(lines[0]).toContain('出错了');
    expect(lines[0]).toContain('"code":500');
  });

  it('info 不含 meta 时正常输出', async () => {
    const { Logger } = await import('../src/utils/logger.js');
    const { stream, lines } = captureStream();
    const log = new Logger(stream);
    log.info('no meta');
    expect(lines.length).toBe(1);
    expect(lines[0]).toMatch(/^\[INFO\]/);
    expect(lines[0]).toContain('no meta');
    expect(lines[0]).not.toContain('{}');
  });
});
