export interface ParsedPlaceholder {
    name: string;
    defaultValue: string | null;
    fullMatch: string;
}
export declare class PlaceholderParser {
    static parse(template: string): ParsedPlaceholder[];
    static replace(template: string, values: Record<string, string>): string;
}
