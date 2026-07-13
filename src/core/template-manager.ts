import { FileSystem } from '../utils/file-system.js';
import { PlaceholderParser } from './placeholder-parser.js';
import { applyInheritance, resolveChain, type InheritanceRule } from './template-inheritance.js';
import { parse as parseYaml } from 'yaml';
import * as path from 'path';

export type TemplateType = 'proposal' | 'design' | 'spec' | 'review';

export interface TemplateInfo {
  name: string;
  type: TemplateType;
  path: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface TemplateCategoryConfig {
  default: string;
  types: Record<string, string>;
  type_mapping?: Record<string, string>;
}

interface TemplateConfig {
  version: string;
  proposals: TemplateCategoryConfig;
  designs: TemplateCategoryConfig;
  specs: TemplateCategoryConfig;
  reviews: Record<string, string>;
  inheritance: { rules: InheritanceRule[] };
  placeholders: { system: string[]; user: string[] };
  project_override: { search_paths: string[] };
}

type TemplateCategory = 'proposals' | 'designs' | 'specs' | 'reviews';

const DEFAULT_CONFIG: TemplateConfig = {
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

function deepMerge<T>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const k = key as keyof T;
    const ovVal = override[k];
    const baseVal = result[k];
    if (Array.isArray(baseVal) && Array.isArray(ovVal)) {
      // 合并数组并去重（保持顺序，优先保留 base 中已存在的元素）
      result[k] = [...new Set([...baseVal, ...ovVal])] as unknown as T[keyof T];
      continue;
    }
    if (
      typeof ovVal === 'object' &&
      ovVal !== null &&
      !Array.isArray(ovVal) &&
      typeof baseVal === 'object' &&
      baseVal !== null &&
      !Array.isArray(baseVal)
    ) {
      result[k] = deepMerge(
        baseVal as Record<string, unknown>,
        ovVal as Record<string, unknown>,
      ) as T[keyof T];
    } else if (ovVal !== undefined) {
      result[k] = ovVal as T[keyof T];
    }
  }
  return result;
}

function categoryForType(type: TemplateType): TemplateCategory {
  return `${type}s` as TemplateCategory;
}

function stripMarkdownExtension(value: string): string {
  return value.replace(/\.md$/, '');
}

function normalizeTemplatePath(type: TemplateType, value: string): string {
  const category = categoryForType(type);
  const normalized = stripMarkdownExtension(value.replace(/\\/g, '/'));
  if (normalized.includes('/')) {
    return `${normalized}.md`;
  }
  return `${category}/${normalized}.md`;
}

function basenameWithoutExtension(templatePath: string): string {
  return stripMarkdownExtension(path.posix.basename(templatePath.replace(/\\/g, '/')));
}

export class TemplateManager {
  private fs: FileSystem;
  private root: string;
  private configCache: TemplateConfig | null = null;
  private frontmatterCache: Map<string, Record<string, unknown> | null> = new Map();

  constructor(fs: FileSystem, root: string) {
    this.fs = fs;
    this.root = root;
  }

  private parseFrontmatter(content: string): Record<string, unknown> | null {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
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

  getTemplateFrontmatter(type: TemplateType, name: string): Record<string, unknown> | null {
    return this.frontmatterCache.get(`${type}/${name}`) ?? null;
  }

  private templatesDir(): string {
    return path.join(this.root, '.driv', 'templates');
  }

  private typeDir(type: TemplateType): string {
    return path.join(this.templatesDir(), categoryForType(type));
  }

  private templatePath(type: TemplateType, templateNameOrPath: string): string {
    const relativePath = normalizeTemplatePath(type, templateNameOrPath);
    return path.join(this.templatesDir(), relativePath);
  }

  private async readTemplatePath(templatePath: string): Promise<string> {
    const filePath = path.join(this.templatesDir(), templatePath);
    if (!(await this.fs.exists(filePath))) {
      throw new Error(`模板不存在: ${templatePath}`);
    }
    return this.fs.readFile(filePath);
  }

  private async readFirstExistingTemplate(paths: string[]): Promise<string | null> {
    for (const templatePath of paths) {
      const filePath = path.join(this.templatesDir(), templatePath);
      if (await this.fs.exists(filePath)) {
        return this.fs.readFile(filePath);
      }
    }
    return null;
  }

  async getConfig(): Promise<TemplateConfig> {
    if (this.configCache) return this.configCache;
    const configPath = path.join(this.templatesDir(), 'config.yaml');
    if (await this.fs.exists(configPath)) {
      const raw = await this.fs.readFile(configPath);
      const parsed = parseYaml(raw) as Partial<TemplateConfig>;
      this.configCache = deepMerge(structuredClone(DEFAULT_CONFIG), parsed);
    } else {
      this.configCache = structuredClone(DEFAULT_CONFIG);
    }
    return this.configCache!;
  }

  async loadTemplate(type: TemplateType, name: string): Promise<string> {
    const filePath = this.templatePath(type, name);
    if (!(await this.fs.exists(filePath))) {
      throw new Error(`模板不存在: ${type}/${name}`);
    }
    const content = await this.fs.readFile(filePath);
    // 解析 frontmatter 并缓存，供 validateTemplate 等消费
    this.frontmatterCache.set(`${type}/${name}`, this.parseFrontmatter(content));
    return content;
  }

  async listTemplates(type?: TemplateType): Promise<TemplateInfo[]> {
    const types: TemplateType[] = type ? [type] : ['proposal', 'design', 'spec', 'review'];
    const result: TemplateInfo[] = [];
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
      } catch {
        // skip
      }
    }
    return result;
  }

  async selectTemplate(type: TemplateType, changeType?: string): Promise<string> {
    const config = await this.getConfig();
    let selectedPath: string;
    let defaultPath: string | null = null;

    if (type === 'review') {
      if (changeType && config.reviews[changeType]) {
        selectedPath = normalizeTemplatePath(type, config.reviews[changeType]);
      } else if (changeType) {
        selectedPath = normalizeTemplatePath(type, changeType);
      } else {
        throw new Error('review 模板需要 changeType 参数');
      }
    } else {
      const catKey = categoryForType(type);
      const category = config[catKey] as TemplateCategoryConfig;
      defaultPath = normalizeTemplatePath(type, category.default);
      if (changeType && category.type_mapping?.[changeType]) {
        selectedPath = normalizeTemplatePath(type, category.type_mapping[changeType]);
      } else if (changeType && category.types[changeType]) {
        selectedPath = normalizeTemplatePath(type, category.types[changeType]);
      } else {
        selectedPath = defaultPath;
      }
    }

    const customPaths = [
      path.posix.join(
        'custom',
        categoryForType(type),
        basenameWithoutExtension(selectedPath) + '.md',
      ),
    ];
    if (defaultPath && defaultPath !== selectedPath) {
      customPaths.push(
        path.posix.join(
          'custom',
          categoryForType(type),
          basenameWithoutExtension(defaultPath) + '.md',
        ),
      );
    }

    const customContent = await this.readFirstExistingTemplate(customPaths);
    if (customContent !== null) return customContent;

    return this.readTemplatePath(selectedPath);
  }

  async applyTemplate(
    type: TemplateType,
    name: string,
    data: Record<string, string>,
  ): Promise<string> {
    let content = await this.loadTemplate(type, name);

    const config = await this.getConfig();
    const rule = config.inheritance.rules.find((r) => r.child === name);
    if (rule) {
      try {
        const parentContent = await this.loadTemplate(type, rule.parent);
        content = applyInheritance(parentContent, content, rule);
      } catch (error) {
        console.warn(
          `[driv] 模板继承: 父模板 '${rule.parent}' 加载失败，使用子模板: ${(error as Error).message}`,
        );
      }
    }

    return PlaceholderParser.replace(content, data);
  }

  async validateTemplate(type: TemplateType, name: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

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

    // 校验 frontmatter 中声明的 placeholders_required 是否在模板中使用
    const frontmatter = this.parseFrontmatter(content);
    if (frontmatter) {
      this.frontmatterCache.set(`${type}/${name}`, frontmatter);
      const required = frontmatter.placeholders_required;
      if (Array.isArray(required)) {
        const missing = required
          .filter((p): p is string => typeof p === 'string')
          .filter((p) => !content.includes(`{{${p}}}`));
        if (missing.length > 0) {
          warnings.push(`缺少必填占位符: ${missing.join(', ')}`);
        }
      }
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

  async getInheritanceChain(type: TemplateType, name: string): Promise<string[]> {
    const config = await this.getConfig();
    try {
      return resolveChain(config.inheritance.rules, name);
    } catch (error) {
      console.warn(`[driv] 继承链解析失败: ${(error as Error).message}`);
      return [name];
    }
  }
}
