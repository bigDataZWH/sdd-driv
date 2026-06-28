## Context

Driv 完整方案要求企业级 proposal、design、spec 和 review 文档可配置、可继承、可复用。当前只依赖 OpenSpec 默认模板，无法表达文档中 `.driv/templates` 结构、模板继承、占位符解析和项目级覆盖策略。本 change 聚焦模板系统，为评审系统和后续命令提供文档生成基础。

## Goals / Non-Goals

**Goals:**

- 创建 `.driv/templates` 目录结构，包含 `proposals`、`designs`、`specs`、`reviews` 和 `custom` 子目录。
- 实现 TemplateManager：加载模板、选择模板、应用模板、列出模板、验证模板、获取继承链。
- 实现 TemplateInheritance：支持 `extend`、`override`、`merge`、`add` 策略。
- 实现 PlaceholderParser：解析 `{{name}}` 与 `{{name:default}}` 占位符，支持多行默认值。
- 实现 TemplateConfig：读取 `.driv/templates/config.yaml`，缺失时使用默认配置。
- 提供默认 proposal、design、spec、review 模板，保留三份设计文档里的评审模板结构。

**Non-Goals:**

- 不实现评审状态流转和门禁提交。
- 不实现 OpenSpec CLI 的模板替换。
- 不引入复杂模板语言，只支持简单占位符。

## Decisions

### Decision 1: 项目模板优先

模板选择顺序固定为：项目级自定义模板 > 变更类型映射 > 默认模板。这样用户可以覆盖企业模板，同时保持 Driv 默认可用。

```typescript
export interface TemplateManager {
  loadTemplate(type: TemplateType, name: string): Promise<string>;
  selectTemplate(type: TemplateType, changeType?: string): Promise<string>;
  applyTemplate(type: TemplateType, name: string, data: Record<string, string>): Promise<string>;
  listTemplates(type?: TemplateType): Promise<TemplateInfo[]>;
  validateTemplate(type: TemplateType, name: string): Promise<ValidationResult>;
  getInheritanceChain(type: TemplateType, name: string): Promise<string[]>;
}
```

### Decision 2: 模板类型固定

`TemplateType = 'proposal' | 'design' | 'spec' | 'review'`。目录映射如下：

```text
.driv/templates/
├── proposals/
│   ├── default.md
│   ├── feature.md
│   ├── bugfix.md
│   ├── refactor.md
│   ├── config.md
│   ├── docs.md
│   └── custom/
├── designs/
│   ├── default.md
│   ├── feature.md
│   ├── architecture.md
│   ├── interface.md
│   ├── performance.md
│   └── custom/
├── specs/
│   ├── default.md
│   ├── capability.md
│   ├── api.md
│   ├── component.md
│   ├── service.md
│   └── custom/
├── reviews/
│   ├── requirement-review.md
│   ├── technical-review.md
│   └── code-review.md
└── config.yaml
```

### Decision 3: Markdown section 级继承

模板继承按 Markdown section 解析，支持：

- `extend`：保留父模板并追加子模板内容。
- `override`：指定 section 用子模板替换父模板。
- `merge`：指定 section 合并父子内容。
- `add`：新增父模板没有的 section。

继承规则使用配置描述：

```typescript
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
```

### Decision 4: 占位符保持简单可审计

占位符格式固定为 `{{name}}` 或 `{{name:default}}`，解析正则为 `/\{\{([a-z_0-9]+)(:([^}]+))?\}\}/gs`。未提供值且没有默认值时保留原占位符，便于验证发现遗漏。

配置字段：

```typescript
export interface TemplateConfig {
  version: string;
  proposals: TemplateCategoryConfig;
  designs: TemplateCategoryConfig;
  specs: TemplateCategoryConfig;
  reviews: Record<string, string>;
  inheritance: InheritanceConfig;
  placeholders: PlaceholderConfig;
  project_override: ProjectOverrideConfig;
}
```

### Decision 5: 评审模板保留企业流程细节

默认 review 模板必须包含三份设计文档中的 requirement-review、technical-review、code-review 结构：基本信息、检查项、关联文档、AI 检查结果、评审意见、最终结论、评审记录。技术评审包含设计文档链接、架构设计检查、决策记录审查和任务完整性。代码评审包含代码规范、单元测试、安全漏洞和注释文档检查。

## Risks / Trade-offs

- Markdown section 解析不完美 → 第一版只支持 `#` 标题结构，不解析复杂嵌套表格语义。
- 占位符默认值含 `}` 可能解析失败 → 模板规范禁止默认值包含 `}`。
- OpenSpec 自身也有模板机制 → Driv 模板仅用于 Driv 生成的评审/辅助文档，不替换 OpenSpec CLI artifact 生成机制。

## Migration Plan

1. 创建 `.driv/templates` 默认目录和配置。
2. 实现 PlaceholderParser 与单元测试。
3. 实现 TemplateInheritance 与 section merge 测试。
4. 实现 TemplateManager 和模板选择策略。
5. 增加默认模板验证测试。
6. 供 review-quality-gates change 调用。

## Open Questions

- 是否允许用户通过命令导出默认模板？本 change 不实现，只保留 TemplateManager 能力。
