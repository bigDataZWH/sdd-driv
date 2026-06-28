## Why

完整 Driv 方案要求每个变更都有可恢复、可验证、可审计的生命周期状态。当前 OpenSpec 工件只覆盖初始化集成，缺少 `.driv.yaml`、状态机、阶段守护和交接包，无法支撑五阶段工作流和中断恢复。

## What Changes

- 新增 Driv 状态与工作流引擎，覆盖 `clarify → design → build → verify → archive` 五阶段。
- 新增 `.driv.yaml` 变更状态文件，记录 OpenSpec 工件、Superpowers 实施计划、阶段状态、评审状态、验证状态、Git 引用和归档状态。
- 新增 StateMachine、PhaseGuard、HandoffManager、ContextCompression、基础设施工具的规格与实现任务。
- 保留三份设计文档中的接口、状态结构、转换规则、交接包结构、压缩策略、脚本环境变量和测试策略。
- 不实现具体评审模板、Clean Code 检查、Build/Verify/Archive 业务流程；这些由后续 changes 实现。

## Capabilities

### New Capabilities
- `driv-state-workflow-engine`: 定义 Driv 五阶段状态机、阶段守护、状态文件、交接包、上下文压缩和基础设施能力。

### Modified Capabilities

## Impact

- 新增或影响 `src/core/state-machine.ts`、`src/core/phase-guard.ts`、`src/core/handoff-manager.ts`、`src/core/context-compression.ts`。
- 新增或影响 `src/utils/file-system.ts`、`src/utils/yaml-parser.ts`、`src/utils/hash-utils.ts`、`src/utils/logger.ts`、`src/utils/script-exec.ts`。
- 新增 `.driv/config.yaml`、`openspec/changes/<name>/.driv.yaml` 和 `openspec/changes/<name>/.driv/handoff/*` 结构。
- 为后续模板系统、评审门禁、构建验证归档流程提供依赖基础。
