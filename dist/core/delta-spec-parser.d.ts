export interface DeltaSpec {
    added: string[];
    modified: string[];
    removed: string[];
}
export declare function parseDeltaSpec(content: string): DeltaSpec;
export declare function hasDelta(content: string): boolean;
