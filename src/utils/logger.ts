import { Writable } from 'stream';

export class Logger {
  private stream: Writable;

  constructor(stream?: Writable) {
    this.stream = stream ?? process.stdout;
  }

  info(msg: string, meta?: Record<string, unknown>): void {
    this.write('INFO', msg, meta);
  }

  warn(msg: string, meta?: Record<string, unknown>): void {
    this.write('WARN', msg, meta);
  }

  error(msg: string, meta?: Record<string, unknown>): void {
    this.write('ERROR', msg, meta);
  }

  private write(level: string, msg: string, meta?: Record<string, unknown>): void {
    const ts = new Date().toISOString();
    let line = `[${level}] ${ts} ${msg}`;
    if (meta && Object.keys(meta).length > 0) {
      line += ` ${JSON.stringify(meta)}`;
    }
    this.stream.write(line + '\n');
  }
}
