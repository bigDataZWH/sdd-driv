import { execFile } from 'child_process';

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class ScriptExec {
  async exec(
    command: string,
    args?: string[],
    options?: { timeout?: number; cwd?: string },
  ): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      const child = execFile(
        command,
        args ?? [],
        {
          timeout: options?.timeout,
          cwd: options?.cwd,
          windowsHide: true,
        },
        (err, stdout, stderr) => {
          if (err) {
            if ((err as any).killed || err.message?.toLowerCase().includes('timeout')) {
              reject(new Error(`Command timed out after ${options?.timeout ?? 0}ms: ${command}`));
              return;
            }
            resolve({
              stdout,
              stderr,
              exitCode: (err as any).code ?? 1,
            });
            return;
          }
          resolve({ stdout, stderr, exitCode: 0 });
        },
      );

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
