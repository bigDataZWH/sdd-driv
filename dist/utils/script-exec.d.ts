export interface ExecResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}
export declare class ScriptExec {
    exec(command: string, args?: string[], options?: {
        timeout?: number;
        cwd?: string;
    }): Promise<ExecResult>;
}
