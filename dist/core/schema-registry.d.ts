export type ArtifactType = 'proposal' | 'design' | 'spec' | 'tasks';
export interface SchemaValidationResult {
    valid: boolean;
    errors?: string[];
}
export interface ParsedArtifact {
    frontmatter: Record<string, unknown> | null;
    body: string;
    sections: string[];
}
interface ArtifactSchema {
    requiredSections: string[];
    optionalSections?: string[];
}
export declare class SchemaRegistry {
    private schemas;
    constructor(schemas?: Record<string, ArtifactSchema>);
    parseArtifact(content: string): ParsedArtifact;
    validate(type: string, parsed: unknown): SchemaValidationResult;
    private extractFrontmatter;
    private extractSections;
}
export {};
