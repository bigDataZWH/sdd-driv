## Context

已有 5 个 changes 已覆盖初始化工具、状态机、模板系统、评审质量门禁和 Build/Verify/Archive 闭环，但入口层仍分散：首个 change 保留 `opsx-*`，后续 changes 使用 `/driv-*`，技术架构又列出 `init/status/doctor/update/review` CLI 命令。实施指南要求用户使用 `/driv-clarify`、`/driv-design` 等完整五阶段入口。若不单独收敛，后续实现会出现用户命令、CLI 命令、脚本资产和 OpenSpec 原生命令互相漂移。

本 change 只定义入口契约，不重新设计状态机、模板、评审、验证或归档内部逻辑。

## Goals / Non-Goals

**Goals:**

- 明确 Driv 用户主入口统一使用 `driv` 命名。
- 明确 OpenCode slash 命令：`/driv-clarify`、`/driv-design`、`/driv-build`、`/driv-verify`、`/driv-archive`、`/driv-review`、`/driv`。
- 明确 CLI 诊断维护命令：`driv init`、`driv status`、`driv doctor`、`driv update`、`driv review`。
- 明确 `opsx-*` 仅作为 OpenSpec 原生命令兼容入口，不能替代 Driv 五阶段入口。
- 明确 `.driv/scripts` 脚本资产清单和职责。
- 明确 Build 阶段子代理调度契约。

**Non-Goals:**

- 不实现命令内部完整业务逻辑；业务逻辑由前置 changes 的状态、评审、模板和 Build/Verify/Archive 模块承担。
- 不删除现有 `opsx-*` 命令或技能。
- 不实现真实 AI 子代理编码逻辑。
- 不修改 OpenSpec CLI schema 或 artifact 生命周期。

## Decisions

### Decision 1: `driv-*` 是企业研发五阶段主入口

OpenCode 面向用户的五阶段入口统一使用 `/driv-*`：

| 命令 | 阶段/职责 | 依赖能力 |
|---|---|---|
| `/driv-clarify` | 创建或补全 proposal/tasks/spec 初稿，生成需求评审 | integration-tool、state-workflow、template、review |
| `/driv-design` | 生成 handoff，调用 brainstorming，完善 OpenSpec `design.md`，生成技术评审 | state-workflow、template、review |
| `/driv-build` | 创建 Superpowers plan，选择执行/TDD/隔离模式，进入实现 | build-verify-archive、review |
| `/driv-verify` | 执行验证、分支处理和验证报告 | build-verify-archive、review |
| `/driv-archive` | 归档、合并 spec、更新知识库 | build-verify-archive |
| `/driv-review` | 创建、提交、检查三类评审 | review-quality-gates |
| `/driv` | 显示当前 change 状态、阻塞原因和下一步 | state-workflow |

选择该方案是因为实施指南和后续 changes 已经以 `/driv-*` 表达企业研发流程。备选方案是继续使用 `opsx-*`，但 `opsx-*` 语义更偏 OpenSpec 原生工作流，无法承载 Driv 的评审门禁、Clean Code 和状态机语义。

### Decision 2: `opsx-*` 保留为兼容别名

现有 `opsx-*` 命令保持可用，并定位为 OpenSpec 原生命令兼容入口。初始化工具可继续复制或生成 `opsx-*`，但必须同时生成 Driv 主入口。文档和新流程优先推荐 `/driv-*`。

这样兼容当前项目已有 scaffold，又能解决命名冲突。若用户直接运行 `opsx-*`，系统不应假设 Driv 五阶段状态已同步，除非后续实现显式调用状态同步。

### Decision 3: CLI 命令与 OpenCode slash 命令分层

TypeScript CLI 面向安装、诊断和维护：

```text
driv init      初始化项目级 OpenSpec/Superpowers/OpenCode/Driv 资产
driv status    显示当前 change、阶段、门禁、报告和下一步
driv doctor    检查环境、依赖、目录、命令、脚本和配置健康度
driv update    同步/升级 Driv 命令、技能、模板和脚本资产
driv review    非交互执行评审创建、提交、状态检查
```

OpenCode slash 命令面向日常研发流转。CLI 可以被 slash 命令调用，但 slash 命令不得绕过 PhaseGuard。

### Decision 4: 脚本资产只做可组合基础操作

`.driv/scripts` 或工具 assets 中必须提供以下脚本模板：

| 脚本 | 职责 |
|---|---|
| `driv-env.sh` | 解析项目根、OpenSpec 目录、change 目录、配置目录和 Bash 环境 |
| `driv-state.sh` | 读取/更新 `.driv.yaml`，提供状态查询与再生成入口 |
| `driv-guard.sh` | 执行阶段入口/出口检查和阻塞原因输出 |
| `driv-handoff.sh` | 生成/校验 handoff context |
| `driv-archive.sh` | 调用归档前置检查、复制、spec merge 和回滚 |
| `driv-review.sh` | 创建、提交、检查 review 文档 |
| `driv-cleancode.sh` | 执行 Clean Code 检查和报告生成 |
| `driv-validate.sh` | 聚合 lint/typecheck/test/build/openspec 状态检查 |

脚本必须支持 Windows Git Bash，路径引用必须加引号，并通过 `driv-env.sh` 统一获取目录变量。

### Decision 5: 子代理调度只定义编排契约

Build 阶段的 `subagent-driven-development` 模式负责：

1. 从 OpenSpec tasks 和 Superpowers plan 提取可并行任务。
2. 生成调度记录，包含任务 id、输入上下文、依赖、期望输出和验证命令。
3. 调用 OpenCode 可用子代理执行独立任务。
4. 汇总子代理结果、失败原因、修改文件和验证证据。
5. 将调度摘要写入 `openspec/changes/<name>/reports/subagent-dispatch-report.md` 或 `.driv.yaml.phases.build.subagents`。

不在本 change 中规定具体子代理内部如何编码；具体实现仍需遵守 TDD、PhaseGuard、Clean Code 和 review 门禁。

## Risks / Trade-offs

- `opsx-*` 与 `/driv-*` 同时存在可能让用户困惑 → 文档明确 `/driv-*` 是 Driv 主流程，`opsx-*` 是 OpenSpec 兼容入口。
- CLI 与 slash 命令职责重叠 → CLI 只负责安装、维护、诊断和可脚本化操作，研发流转优先 slash 命令。
- Windows shell 兼容复杂 → 脚本通过 Git Bash 运行，所有路径统一引用并由 `driv-env.sh` 解析。
- 子代理调度可能引入不可控修改 → 调度记录必须包含任务边界、依赖和验证证据，失败时不得自动进入 Verify。

## Migration Plan

1. 在初始化工具中新增 Driv slash 命令和技能资产生成。
2. 保留现有 `opsx-*`，但更新说明为兼容入口。
3. 新增 CLI command registry，注册 `init/status/doctor/update/review`。
4. 新增 `.driv/scripts` 资产模板并在 `driv init/update` 中同步。
5. 更新 `/driv` 状态入口输出当前阶段、阻塞门禁、报告路径和下一步命令。
6. 为命令生成、脚本资产同步、doctor 检查和 Windows Git Bash 路径添加测试。

## Open Questions

- `driv update` 是否允许自动覆盖用户修改过的模板？建议默认不覆盖，生成 `.new` 或要求显式 `--force`。
- `/driv-clarify` 是否应直接包装现有 `/opsx-propose`？建议第一版复用 OpenSpec artifact 生成能力，但必须同步 `.driv.yaml` 和需求评审文档。
