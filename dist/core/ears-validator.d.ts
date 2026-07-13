export interface EARSValidationResult {
    valid: boolean;
    issues: string[];
}
export declare function validateEARS(content: string): EARSValidationResult;
