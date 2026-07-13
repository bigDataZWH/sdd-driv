import { parse as parseYaml } from 'yaml';
const DEFAULT_SCHEMAS = {
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
    schemas;
    constructor(schemas) {
        this.schemas = schemas ?? DEFAULT_SCHEMAS;
    }
    parseArtifact(content) {
        const frontmatter = this.extractFrontmatter(content);
        const body = frontmatter ? content.replace(/^---\n[\s\S]*?\n---\n?/, '') : content;
        const sections = this.extractSections(body);
        return { frontmatter, body, sections };
    }
    validate(type, parsed) {
        const schema = this.schemas[type];
        if (!schema) {
            return { valid: true };
        }
        const errors = [];
        const record = parsed;
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
    extractFrontmatter(content) {
        const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
        if (!match)
            return null;
        try {
            const parsed = parseYaml(match[1]);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    extractSections(body) {
        const sections = [];
        const matches = body.matchAll(/^(#{1,6})\s+(.+)$/gm);
        for (const m of matches) {
            sections.push(m[0]);
        }
        return sections;
    }
}
//# sourceMappingURL=schema-registry.js.map