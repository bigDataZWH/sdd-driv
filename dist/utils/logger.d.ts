import { Writable } from 'stream';
export declare class Logger {
    private stream;
    constructor(stream?: Writable);
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
    private write;
}
