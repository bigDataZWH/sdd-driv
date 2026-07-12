export interface DoctorOptions {
    scope?: 'auto' | 'project' | 'global';
    json?: boolean;
}
export interface DoctorResult {
    check: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
}
export declare function doctorCommand(targetPath: string, options?: DoctorOptions): Promise<DoctorResult[]>;
