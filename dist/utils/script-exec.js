import { execFile } from 'child_process';
export class ScriptExec {
    async exec(command, args, options) {
        return new Promise((resolve, reject) => {
            const child = execFile(command, args ?? [], {
                timeout: options?.timeout,
                cwd: options?.cwd,
                windowsHide: true,
            }, (err, stdout, stderr) => {
                if (err) {
                    if (err.killed || err.message?.toLowerCase().includes('timeout')) {
                        reject(new Error(`Command timed out after ${options?.timeout ?? 0}ms: ${command}`));
                        return;
                    }
                    resolve({
                        stdout,
                        stderr,
                        exitCode: err.code ?? 1,
                    });
                    return;
                }
                resolve({ stdout, stderr, exitCode: 0 });
            });
            if (options?.timeout && options.timeout > 0) {
                child.on('exit', (code) => {
                    if (code === null) {
                        child.kill();
                    }
                });
            }
        });
    }
}
//# sourceMappingURL=script-exec.js.map