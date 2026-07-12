import { PlaceholderParser } from './placeholder-parser.js';
import { applyInheritance, resolveChain } from './template-inheritance.js';
import { parse as parseYaml } from 'yaml';
import * as path from 'path';
const DEFAULT_CONFIG = {
    version: '1',
    proposals: {
        default: 'default',
        types: {
            feature: 'feature',
            bugfix: 'bugfix',
            refactor: 'refactor',
            config: 'config',
            docs: 'docs',
        },
    },
    designs: {
        default: 'default',
        types: {
            feature: 'feature',
            architecture: 'architecture',
            interface: 'interface',
            performance: 'performance',
        },
    },
    specs: {
        default: 'default',
        types: {
            capability: 'capability',
            api: 'api',
            component: 'component',
            service: 'service',
        },
    },
    reviews: {
        requirement: 'requirement-review',
        technical: 'technical-review',
        code: 'code-review',
    },
    inheritance: { rules: [] },
    placeholders: { system: ['name', 'date', 'version'], user: [] },
    project_override: { search_paths: ['.driv/templates/custom'] },
};
function deepMerge(base, override) {
    const result = { ...base };
    for (const key of Object.keys(override)) {
        const k = key;
        const ovVal = override[k];
        const baseVal = result[k];
        if (typeof ovVal === 'object' &&
            ovVal !== null &&
            !Array.isArray(ovVal) &&
            typeof baseVal === 'object' &&
            baseVal !== null &&
            !Array.isArray(baseVal)) {
            result[k] = deepMerge(baseVal, ovVal);
        }
        else if (ovVal !== undefined) {
            result[k] = ovVal;
        }
    }
    return result;
}
function categoryForType(type) {
    return `${type}s`;
}
function stripMarkdownExtension(value) {
    return value.replace(/\.md$/, '');
}
function normalizeTemplatePath(type, value) {
    const category = categoryForType(type);
    const normalized = stripMarkdownExtension(value.replace(/\\/g, '/'));
    if (normalized.includes('/')) {
        return `${normalized}.md`;
    }
    return `${category}/${normalized}.md`;
}
function basenameWithoutExtension(templatePath) {
    return stripMarkdownExtension(path.posix.basename(templatePath.replace(/\\/g, '/')));
}
export class TemplateManager {
    fs;
    root;
    configCache = null;
    constructor(fs, root) {
        this.fs = fs;
        this.root = root;
    }
    templatesDir() {
        return path.join(this.root, '.driv', 'templates');
    }
    typeDir(type) {
        return path.join(this.templatesDir(), categoryForType(type));
    }
    templatePath(type, templateNameOrPath) {
        const relativePath = normalizeTemplatePath(type, templateNameOrPath);
        return path.join(this.templatesDir(), relativePath);
    }
    async readTemplatePath(templatePath) {
        const filePath = path.join(this.templatesDir(), templatePath);
        if (!(await this.fs.exists(filePath))) {
            throw new Error(`模板不存在: ${templatePath}`);
        }
        return this.fs.readFile(filePath);
    }
    async readFirstExistingTemplate(paths) {
        for (const templatePath of paths) {
            const filePath = path.join(this.templatesDir(), templatePath);
            if (await this.fs.exists(filePath)) {
                return this.fs.readFile(filePath);
            }
        }
        return null;
    }
    async getConfig() {
        if (this.configCache)
            return this.configCache;
        const configPath = path.join(this.templatesDir(), 'config.yaml');
        if (await this.fs.exists(configPath)) {
            const raw = await this.fs.readFile(configPath);
            const parsed = parseYaml(raw);
            this.configCache = deepMerge(structuredClone(DEFAULT_CONFIG), parsed);
        }
        else {
            this.configCache = structuredClone(DEFAULT_CONFIG);
        }
        return this.configCache;
    }
    async loadTemplate(type, name) {
        const filePath = this.templatePath(type, name);
        if (!(await this.fs.exists(filePath))) {
            throw new Error(`模板不存在: ${type}/${name}`);
        }
        return this.fs.readFile(filePath);
    }
    async listTemplates(type) {
        const types = type ? [type] : ['proposal', 'design', 'spec', 'review'];
        const result = [];
        for (const t of types) {
            const dir = this.typeDir(t);
            try {
                const files = await this.fs.listDir(dir);
                for (const file of files) {
                    if (file.endsWith('.md')) {
                        result.push({
                            name: file.replace(/\.md$/, ''),
                            type: t,
                            path: path.join(dir, file),
                        });
                    }
                }
            }
            catch {
                // skip
            }
        }
        return result;
    }
    async selectTemplate(type, changeType) {
        const config = await this.getConfig();
        let selectedPath;
        let defaultPath = null;
        if (type === 'review') {
            if (changeType && config.reviews[changeType]) {
                selectedPath = normalizeTemplatePath(type, config.reviews[changeType]);
            }
            else if (changeType) {
                selectedPath = normalizeTemplatePath(type, changeType);
            }
            else {
                throw new Error('review 模板需要 changeType 参数');
            }
        }
        else {
            const catKey = categoryForType(type);
            const category = config[catKey];
            defaultPath = normalizeTemplatePath(type, category.default);
            if (changeType && category.type_mapping?.[changeType]) {
                selectedPath = normalizeTemplatePath(type, category.type_mapping[changeType]);
            }
            else if (changeType && category.types[changeType]) {
                selectedPath = normalizeTemplatePath(type, category.types[changeType]);
            }
            else {
                selectedPath = defaultPath;
            }
        }
        const customPaths = [
            path.posix.join('custom', categoryForType(type), basenameWithoutExtension(selectedPath) + '.md'),
        ];
        if (defaultPath && defaultPath !== selectedPath) {
            customPaths.push(path.posix.join('custom', categoryForType(type), basenameWithoutExtension(defaultPath) + '.md'));
        }
        const customContent = await this.readFirstExistingTemplate(customPaths);
        if (customContent !== null)
            return customContent;
        return this.readTemplatePath(selectedPath);
    }
    async applyTemplate(type, name, data) {
        let content = await this.loadTemplate(type, name);
        const config = await this.getConfig();
        const rule = config.inheritance.rules.find((r) => r.child === name);
        if (rule) {
            try {
                const parentContent = await this.loadTemplate(type, rule.parent);
                content = applyInheritance(parentContent, content, rule);
            }
            catch {
                // continue without inheritance
            }
        }
        return PlaceholderParser.replace(content, data);
    }
    async validateTemplate(type, name) {
        const errors = [];
        const warnings = [];
        const filePath = path.join(this.typeDir(type), `${name}.md`);
        if (!(await this.fs.exists(filePath))) {
            errors.push(`模板不存在: ${type}/${name}`);
            return { valid: false, errors, warnings };
        }
        const content = await this.fs.readFile(filePath);
        if (!/^#\s+.+/m.test(content)) {
            errors.push('模板缺少 # 标题');
        }
        const placeholders = PlaceholderParser.parse(content);
        const unresolved = placeholders.filter((p) => p.defaultValue === null);
        for (const p of unresolved) {
            warnings.push(`未解析占位符: ${p.name}`);
        }
        const config = await this.getConfig();
        const rule = config.inheritance.rules.find((r) => r.child === name);
        if (rule) {
            const parentPath = path.join(this.typeDir(type), `${rule.parent}.md`);
            if (!(await this.fs.exists(parentPath))) {
                errors.push(`父模板不存在: ${type}/${rule.parent}`);
            }
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    async getInheritanceChain(type, name) {
        const config = await this.getConfig();
        try {
            return resolveChain(config.inheritance.rules, name);
        }
        catch {
            return [name];
        }
    }
}
//# sourceMappingURL=template-manager.js.map