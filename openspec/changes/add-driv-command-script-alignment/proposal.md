## Why

三份设计文档中的命令层、脚本层和命名策略尚未完整沉淀到现有 OpenSpec changes：`/driv-clarify`、`/driv-design`、`status`、`doctor`、`update`、脚本入口和 `opsx-*`/`driv-*` 兼容关系仍存在缺口。需要一个小 change 专门收敛这些入口层契约，避免后续实现时命令命名、脚本职责和用户指南漂移。

## What Changes

- 新增 Driv 命令与脚本一致性能力，明确 CLI 命令层、OpenCode slash 命令层和 shell/TS 脚本层的边界。
- 明确 OpenCode 阶段命令：`/driv-clarify`、`/driv-design`、`/driv-build`、`/driv-verify`、`/driv-archive`、`/driv-review`、`/driv`。
- 明确诊断/维护 CLI 命令：`driv init`、`driv status`、`driv doctor`、`driv update`、`driv review`。
- 明确脚本资产：`driv-env.sh`、`driv-state.sh`、`driv-guard.sh`、`driv-handoff.sh`、`driv-archive.sh`、`driv-review.sh`、`driv-cleancode.sh`、`driv-validate.sh`。
- 统一命名策略：`driv-*` 作为新企业研发流程入口；现有 `opsx-*` 作为 OpenSpec 原生命令兼容别名，不再作为 Driv 五阶段主入口。
- 补充子代理调度契约：Build 阶段只负责任务分解、调度记录、结果汇总和失败回收，不实现具体子代理内部编码逻辑。

## Capabilities

### New Capabilities
- `driv-command-script-alignment`: 定义 Driv 命令层、脚本层、命名兼容、诊断维护入口和子代理调度契约。

### Modified Capabilities

## Impact

- 影响 `.opencode/commands/` 与 `.opencode/skills/` 中未来新增的 `/driv-*` 命令和技能。
- 影响 CLI 命令注册、资产复制、初始化同步和诊断维护实现。
- 影响 `.driv/scripts/` 或资产目录中的 shell 脚本模板。
- 影响已有 changes：初始化工具需要生成命令和脚本资产，状态引擎/评审/Build 流程需要调用统一入口。
