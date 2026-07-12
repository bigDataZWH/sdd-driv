export interface CodeIssue {
    rule: string;
    file?: string;
    line?: number;
    severity: 'critical' | 'major' | 'minor' | 'info';
    message: string;
}
export interface CleanCodeRule {
    name: string;
    check: (content: string, filePath?: string) => CodeIssue[];
    enabled: boolean;
    severity: 'critical' | 'major' | 'minor' | 'info';
}
export interface CleanCodeResult {
    score: number;
    passed: boolean;
    issues: CodeIssue[];
    categoryScores: Record<string, number>;
}
export declare class CleanCodeChecker {
    private rules;
    constructor();
    private registerDefaultRules;
    registerRule(rule: CleanCodeRule): void;
    enableRule(name: string): void;
    disableRule(name: string): void;
    getRule(name: string): CleanCodeRule | undefined;
    getRules(): CleanCodeRule[];
    check(content: string, filePath?: string): Promise<CleanCodeResult>;
    generateReports(result: CleanCodeResult, outputDir: string): Promise<void>;
    private generateMarkdownReport;
}
