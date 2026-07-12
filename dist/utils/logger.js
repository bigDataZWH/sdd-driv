export class Logger {
    stream;
    constructor(stream) {
        this.stream = stream ?? process.stdout;
    }
    info(msg, meta) {
        this.write('INFO', msg, meta);
    }
    warn(msg, meta) {
        this.write('WARN', msg, meta);
    }
    error(msg, meta) {
        this.write('ERROR', msg, meta);
    }
    write(level, msg, meta) {
        const ts = new Date().toISOString();
        let line = `[${level}] ${ts} ${msg}`;
        if (meta && Object.keys(meta).length > 0) {
            line += ` ${JSON.stringify(meta)}`;
        }
        this.stream.write(line + '\n');
    }
}
//# sourceMappingURL=logger.js.map