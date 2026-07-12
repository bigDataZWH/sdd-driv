## Why

完整 Driv 方案的价值在于从技术评审通过后进入 Build，经过 TDD、子代理执行、Clean Code、代码评审、验证、分支处理和归档合并形成闭环。当前 OpenSpec 工件没有完整 Build/Verify/Archive 流程，无法实现从需求到归档的全生命周期。

## What Changes

- 新增 Build 阶段流程：创建 Superpowers plan、选择执行模式、选择 TDD 模式、选择隔离策略、执行编码任务、触发 Clean Code 和代码评审。
- 新增 Verify 阶段流程：评估变更规模、执行构建/测试/Clean Code/分支检查、处理分支策略、生成 verification-report.md。
- 新增 Archive 阶段流程：验证前置条件、创建归档目录、复制工件、合并 Delta Spec、更新知识库和状态文件。
- 新增 GitOps、ArchiveService、VerifyService、BuildOrchestrator 和命令入口。
- 保留三份设计文档中的 Build/Verify/Archive 详细步骤、产物路径、检查项、分支策略、归档合并策略和错误处理机制。
- 依赖状态引擎、模板系统和评审质量门禁。

## Capabilities

### New Capabilities
- `driv-build-verify-archive-flow`: 定义 Driv Build、Verify、Archive 三阶段执行、验证、分支处理、归档和 Delta Spec 合并能力。

### Modified Capabilities

## Impact

- 新增或影响 `src/core/build-orchestrator.ts`、`src/core/verify-service.ts`、`src/core/archive-service.ts`、`src/utils/git-ops.ts`。
- 新增或影响 OpenCode 命令 `/driv-build`、`/driv-verify`、`/driv-archive`、`/driv`。
- 新增 `docs/superpowers/plans/*`、`openspec/changes/<name>/reports/verification-report.md`、`openspec/archive/YYYY-MM-DD-<name>`、`openspec/specs/<capability>/spec.md` 合并输出。
