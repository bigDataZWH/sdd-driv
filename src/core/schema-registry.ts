import { parse as parseYaml } from 'yaml';

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

const DEFAULT_SCHEMAS: Record<string, ArtifactSchema> = {
  proposal: {
    requiredSections: ['# '],
  },
  design: {
    requiredSections: ['# '],
  },
  spec: {
    requiredSections: ['# '],
  },
  tasks: {
    requiredSections: ['# '],
  },
};

export class SchemaRegistry {
  private schemas: Record<string, ArtifactSchema>;

  constructor(schemas?: Record<string, ArtifactSchema>) {
    this.schemas = schemas ?? DEFAULT_SCHEMAS;
  }

  parseArtifact(content: string): ParsedArtifact {
    const frontmatter = this.extractFrontmatter(content);
    const body = frontmatter ? content.replace(/^---\n[\s\S]*?\n---\n?/, '') : content;
    const sections = this.extractSections(body);
    return { frontmatter, body, sections };
  }

  validate(type: string, parsed: unknown): SchemaValidationResult {
    const schema = this.schemas[type];
    if (!schema) {
      return { valid: true };
    }

    const errors: string[] = [];
    const record = parsed as ParsedArtifact;
    const body = typeof record === 'string' ? record : record?.body;

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      errors.push('产物内容为空');
      return { valid: false, errors };
    }

    for (const section of schema.requiredSections) {
      if (!body.includes(section)) {
        errors.push(`缺少必需章节: ${section}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private extractFrontmatter(content: string): Record<string, unknown> | null {
    const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!match) return null;
    try {
      const parsed = parseYaml(match[1]);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }

  private extractSections(body: string): string[] {
    const sections: string[] = [];
    const matches = body.matchAll(/^(#{1,6})\s+(.+)$/gm);
    for (const m of matches) {
      sections.push(m[0]);
    }
    return sections;
  }
}
