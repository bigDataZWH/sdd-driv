## Why

完整 Driv 方案要求 proposal、design、spec、review 等文档可按类型生成、继承和项目级覆盖。当前仅有 OpenSpec 默认工件，没有 `.driv/templates` 模板体系，无法落地三份设计文档中的企业化文档结构和可配置模板策略。

## What Changes

- 新增 `.driv/templates` 模板目录，覆盖 proposals、designs、specs、reviews 和 custom override。
- 新增 TemplateManager、TemplateInheritance、PlaceholderParser、TemplateConfig 能力。
- 支持模板选择策略：项目级自定义 > 变更类型 > 默认模板。
- 支持模板继承策略：extend、override、merge、add。
- 支持占位符解析与替换，覆盖系统字段、用户字段和可选字段。
- 为评审系统提供 requirement-review、technical-review、code-review 模板基础。

## Capabilities

### New Capabilities
- `driv-template-system`: 定义 Driv 模板加载、选择、继承、占位符替换、配置读取和模板验证能力。

### Modified Capabilities

## Impact

- 新增或影响 `src/core/template-manager.ts`、`src/core/template-inheritance.ts`、`src/core/placeholder-parser.ts`、`src/core/template-config.ts`。
- 新增 `.driv/templates/config.yaml` 与默认模板文件。
- 影响后续 review 文档生成、OpenSpec proposal/design/spec 生成辅助和企业研发流程模板化。
