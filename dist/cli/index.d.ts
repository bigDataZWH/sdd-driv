import { Command } from 'commander';
export interface StatusInput {
    change: string;
    phase: string;
    gates: string[];
    reports: string[];
    nextStep: string;
}
export declare function registerCommands(): string[];
export declare function formatStatusOutput(input: StatusInput): string;
export declare function doctorCheck(projectPath?: string): Promise<import('../commands/doctor.js').DoctorResult[]>;
export declare function createProgram(): Command;
declare function main(argv?: string[]): Promise<void>;
export { main };
