export interface ParsedSection {
    name: string;
    level: number;
    content: string;
    children?: ParsedSection[];
}
export interface InheritanceRule {
    child: string;
    parent: string;
    strategy: 'extend' | 'override' | 'merge';
    sections: {
        extend?: string[];
        override?: string[];
        merge?: string[];
        add?: string[];
    };
}
export declare function parseSections(markdown: string): ParsedSection[];
export declare function applyInheritance(parent: string, child: string, rule: InheritanceRule): string;
export declare function resolveChain(rules: InheritanceRule[], start: string): string[];
