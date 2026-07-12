import { DrivPhase } from './dispatch.js';
export type SlashCommandName = '/driv-clarify' | '/driv-design' | '/driv-build' | '/driv-verify' | '/driv-archive' | '/driv-review' | '/driv-cleancode' | '/driv';
export interface SlashCommandEntry {
    name: SlashCommandName;
    phase: DrivPhase | 'review' | 'cleancode' | 'status';
    skillName: string;
}
export interface SlashCommandContext {
    changeName?: string;
    args?: string[];
    cwd?: string;
}
export interface SlashCommandResult {
    success: boolean;
    name: string;
    phase: string;
    skillPath: string;
    commandPath: string;
    error?: string;
}
export declare function registerSlashCommands(): string[];
export declare function getSlashCommandEntry(name: string): SlashCommandEntry | undefined;
export declare function executeSlashCommand(name: string, context?: SlashCommandContext): Promise<SlashCommandResult>;
