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
  project_override: { enabled?: boolean; search_paths: string[] };
  presets?: { active?: string };
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
  project_override: { enabled: true, search_paths: ['.driv/templates/custom'] },
  presets: {},
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

// 规范化继承规则中使用的名称：剥离 .md 后缀、统一斜杠
function normalizeRuleName(value: string): string {
  return value.replace(/\.md$/, '').replace(/\\/g, '/');
}

// 提取规则名称的短名形式（取最后一段路径）
function shortName(value: string): string {
  const normalized = normalizeRuleName(value);
  return normalized.split('/').pop() ?? normalized;
}

// 在规则集中查找 child 匹配 name 的规则：支持短名 'feature' 或完整路径 'proposals/feature.md'
function findRuleForName(
  rules: InheritanceRule[],
  name: string,
  type: TemplateType,
): InheritanceRule | undefined {
  const category = categoryForType(type);
  return rules.find((r) => {
    const rn = normalizeRuleName(r.child);
    return rn === name || rn === `${category}/${name}` || rn.endsWith(`/${name}`);
  });
}

// 规范化单个 search_path 配置项，返回相对 templatesDir 的路径（不包含 basename）
// 规则：
//   1) 反斜杠统一为正斜杠，去掉末尾 '/'
//   2) 剥离 '.driv/templates/' 前缀
//   3) 替换 {category} 占位符
function normalizeSearchPath(searchPath: string, category: TemplateCategory): string {
  let normalized = searchPath.replace(/\\/g, '/').replace(/\/$/, '');
  if (normalized.startsWith('.driv/templates/')) {
    normalized = normalized.slice('.driv/templates/'.length);
  }
  if (normalized.includes('{category}')) {
    normalized = normalized.replace(/\{category\}/g, category);
  }
  return normalized;
}

// 根据 search_path 与 basename 解析出实际模板路径（相对 templatesDir）
function resolveSearchPath(
  searchPath: string,
  category: TemplateCategory,
  baseName: string,
): string {
  const normalized = normalizeSearchPath(searchPath, category);
  if (normalized.includes('{category}') || normalized === '') {
    // 包含 {category}（已被替换）或多段路径，直接接 basename
    return normalized + '/' + baseName;
  }
  // 单段路径（如 'custom'）：兼容旧行为，接 /<category>/<basename>
  if (!normalized.includes('/')) {
    return normalized + '/' + category + '/' + baseName;
  }
  // 多段路径（如 'proposals/custom' 或 'my-override/proposals'）：直接接 basename
  return normalized + '/' + baseName;
}

export class TemplateManager {
  private fs: FileSystem;
  private root: string;
  private configCache: TemplateConfig | null = null;
  private frontmatterCache: Map<string, Record<string, unknown> | null> = new Map();
  // 模板内容缓存：key 为 `${type}/${name}`，避免 applyTemplate 等场景重复读盘
  private contentCache: Map<string, string> = new Map();

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
    } catch (error) {
      // 不破坏返回 null 的契约，但记录告警以便排查
      console.warn(`[driv] frontmatter YAML 解析失败: ${(error as Error).message}`);
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
    const key = `${type}/${name}`;
    // 命中内容缓存直接返回，避免重复读盘与解析
    if (this.contentCache.has(key)) return this.contentCache.get(key)!;

    const filePath = this.templatePath(type, name);
    if (!(await this.fs.exists(filePath))) {
      throw new Error(`模板不存在: ${type}/${name}`);
    }
    const content = await this.fs.readFile(filePath);
    // 解析 frontmatter 并缓存，供 validateTemplate 等消费
    this.frontmatterCache.set(key, this.parseFrontmatter(content));
    this.contentCache.set(key, content);
    return content;
  }

  async listTemplates(type?: TemplateType): Promise<TemplateInfo[]> {
    const types: TemplateType[] = type ? [type] : ['proposal', 'design', 'spec', 'review'];
    // 并行读取各类型目录，提升 IO 并发度
    const results = await Promise.all(
      types.map(async (t): Promise<TemplateInfo[]> => {
        const dir = this.typeDir(t);
        try {
          const files = await this.fs.listDir(dir);
          return files
            .filter((f) => f.endsWith('.md'))
            .map((file) => ({
              name: file.replace(/\.md$/, ''),
              type: t,
              path: path.join(dir, file),
            }));
        } catch {
          // 目录不存在等错误跳过
          return [];
        }
      }),
    );
    return results.flat();
  }

  async selectTemplate(type: TemplateType, changeType?: string): Promise<string> {
    const config = await this.getConfig();
    let selectedPath: string;
    let defaultPath: string | null = null;

    if (type === 'review') {
      // review 分支：未知 changeType 或缺省时回退到 requirement-review（更友好）
      const reviewType = changeType ?? 'requirement';
      if (config.reviews[reviewType]) {
        selectedPath = normalizeTemplatePath(type, config.reviews[reviewType]);
      } else {
        selectedPath = normalizeTemplatePath(
          type,
          config.reviews['requirement'] || 'requirement-review',
        );
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

    // 读取 search_paths 配置，对每个 search_path 规范化后生成自定义模板查找路径
    const category = categoryForType(type);
    const searchPaths = config.project_override?.search_paths ?? ['.driv/templates/custom'];
    const customPaths: string[] = [];
    const selectedBaseName = basenameWithoutExtension(selectedPath) + '.md';
    // Override 层（最高优先级）
    for (const sp of searchPaths) {
      customPaths.push(resolveSearchPath(sp, category, selectedBaseName));
    }
    // Preset 层：如果配置了 presets.active，则在该层查找
    if (config.presets?.active) {
      customPaths.push(`presets/${config.presets.active}/${category}/${selectedBaseName}`);
    }
    // 加 default 的自定义版本作为 fallback
    if (defaultPath && defaultPath !== selectedPath) {
      const defaultBaseName = basenameWithoutExtension(defaultPath) + '.md';
      for (const sp of searchPaths) {
        customPaths.push(resolveSearchPath(sp, category, defaultBaseName));
      }
      if (config.presets?.active) {
        customPaths.push(`presets/${config.presets.active}/${category}/${defaultBaseName}`);
      }
    }

    const customContent = await this.readFirstExistingTemplate(customPaths);
    if (customContent !== null) {
      // 自定义模板命中时也填充 frontmatterCache，保持与 loadTemplate 一致的填充时机
      const baseName = basenameWithoutExtension(selectedPath);
      this.frontmatterCache.set(`${type}/${baseName}`, this.parseFrontmatter(customContent));
      return customContent;
    }

    // Core 层
    const coreContent = await this.readTemplatePath(selectedPath);
    const coreBaseName = basenameWithoutExtension(selectedPath);
    this.frontmatterCache.set(`${type}/${coreBaseName}`, this.parseFrontmatter(coreContent));
    return coreContent;
  }

  // 清空所有缓存（configCache、frontmatterCache、contentCache），运行期修改 config.yaml 或模板后可调用以重新加载
  clearCache(): void {
    this.configCache = null;
    this.frontmatterCache.clear();
    this.contentCache.clear();
  }

  async applyTemplate(
    type: TemplateType,
    name: string,
    data: Record<string, string>,
  ): Promise<string> {
    let content = await this.loadTemplate(type, name);

    const config = await this.getConfig();
    let rule = findRuleForName(config.inheritance.rules, name, type);

    // P1-1 Extension 层：如果没有显式 rule，但 frontmatter 声明了 extends，构造隐式 rule
    if (!rule) {
      const fm = this.frontmatterCache.get(`${type}/${name}`);
      if (fm?.extends && typeof fm.extends === 'string') {
        rule = {
          child: name,
          parent: fm.extends,
          strategy: 'extend',
          sections: {},
        };
      }
    }

    if (rule) {
      try {
        // P1-4 多级继承：获取完整继承链 [root, ..., parent, child]
        // 显式 rules 存在时基于全量 rules 解析；否则基于隐式 rule 解析
        // 注意：getInheritanceChain 内部已对 rules 做短名规范化
        const chain = await this.getInheritanceChain(type, name);
        if (chain.length > 1) {
          // 从最父级 root（chain[0]）开始向下合并
          let accumulated = await this.loadTemplate(type, chain[0]);
          for (let i = 1; i < chain.length; i++) {
            const childName = chain[i];
            const childContent =
              childName === name ? content : await this.loadTemplate(type, childName);
            // 查找当前级对应的 rule：优先显式 rules，再 fallback extend
            const r =
              findRuleForName(config.inheritance.rules, childName, type) ??
              (i === chain.length - 1 && rule
                ? rule
                : {
                    child: childName,
                    parent: chain[i - 1],
                    strategy: 'extend' as const,
                    sections: {},
                  });
            accumulated = applyInheritance(accumulated, childContent, r);
          }
          content = accumulated;
        } else {
          // 单级继承
          const parentContent = await this.loadTemplate(type, rule.parent);
          content = applyInheritance(parentContent, content, rule);
        }
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
        // 使用 PlaceholderParser 解析出所有实际占位符的 name 集合
        // 这样 {{priority:P2}} 等带默认值的形式也能被识别
        const usedNames = new Set(PlaceholderParser.parse(content).map((p) => p.name));
        const missing = required
          .filter((p): p is string => typeof p === 'string')
          .filter((p) => !usedNames.has(p));
        if (missing.length > 0) {
          warnings.push(`缺少必填占位符: ${missing.join(', ')}`);
        }
      }
    }

    const config = await this.getConfig();
    const rule = findRuleForName(config.inheritance.rules, name, type);
    if (rule) {
      // rule.parent 可能是完整路径 'proposals/default.md'，统一通过 normalizeTemplatePath 处理
      const parentRel = normalizeTemplatePath(type, rule.parent);
      const parentPath = path.join(this.templatesDir(), parentRel);
      if (!(await this.fs.exists(parentPath))) {
        errors.push(`父模板不存在: ${type}/${rule.parent}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async getInheritanceChain(type: TemplateType, name: string): Promise<string[]> {
    const config = await this.getConfig();
    try {
      // 将规则中的 child/parent 规范化为短名形式，使 resolveChain 能用短名匹配
      const normalizedRules: InheritanceRule[] = config.inheritance.rules.map((r) => ({
        ...r,
        child: shortName(r.child),
        parent: shortName(r.parent),
      }));
      return resolveChain(normalizedRules, name);
    } catch (error) {
      console.warn(`[driv] 继承链解析失败: ${(error as Error).message}`);
      return [name];
    }
  }
}
