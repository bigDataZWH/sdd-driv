## Why

完整 Driv 方案要求每个阶段转换通过企业研发门禁，并在 Build 阶段执行 Clean Code 检查。当前 OpenSpec 工件只定义初始化能力，没有需求评审、技术评审、代码评审、Clean Code 检查和质量报告，无法满足企业研发流程适配目标。

## What Changes

- 新增 ReviewSystem，支持创建评审文档、提交评审、检查状态、执行检查项和列出评审。
- 新增 requirement、technical、code 三类评审门禁和默认检查项。
- 新增 CleanCodeChecker，支持命名规范、函数长度、参数数量、圈复杂度、重复代码、注释质量、错误处理和安全规则。
- 新增 Clean Code 报告、问题列表和修复历史产物。
- 将评审状态写入 `.driv.yaml` 的 `hw_process` 和各阶段状态中。
- 依赖 `add-driv-state-workflow-engine` 的状态文件与 PhaseGuard，依赖 `add-driv-template-system` 的评审模板能力。

## Capabilities

### New Capabilities
- `driv-review-quality-gates`: 定义企业研发评审门禁、评审文档、评审状态、Clean Code 检查和质量报告能力。

### Modified Capabilities

## Impact

- 新增或影响 `src/core/review-system.ts`、`src/core/clean-code.ts`、`src/core/phase-guard.ts`。
- 新增 `.driv/review-templates`、`openspec/changes/<name>/reviews/*`、`openspec/changes/<name>/reports/clean-code-*`。
- 影响 `/driv-review`、`/driv-cleancode`、Build 阶段退出条件和 Verify 阶段前置条件。
