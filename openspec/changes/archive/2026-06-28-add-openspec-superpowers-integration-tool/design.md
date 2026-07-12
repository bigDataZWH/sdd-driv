## Context

当前目录已经包含三份顶层设计文档：`openspec-superpowers-opencode-integration-design.md` 描述单一真相源原则和五阶段流程，`technical-architecture.md` 描述核心模块、适配层和测试策略，`implementation-guide.md` 描述使用方式与阶段指南。现有 `.opencode/commands` 与 `.opencode/skills` 已包含 OpenSpec 的 `opsx-*` 命令和技能，但还没有一个类似 comet-master 的安装/分发工具来统一安装 OpenSpec、Superpowers 与 OpenCode 入口。

参考实现 `D:\AI\project\SDD\TOOL\comet-master` 展示了可复用模式：`src/core/openspec.ts` 负责安装 OpenSpec CLI 和初始化工具，`src/core/superpowers.ts` 负责调用 `npx skills add obra/superpowers`，`src/core/skills.ts` 负责复制技能并为 OpenCode 生成命令，`src/core/platforms.ts` 负责平台目录映射，`src/commands/init.ts` 负责交互式初始化编排。

本变更只规划一个最小可实现的 Driv 集成工具能力：以 OpenSpec 作为设计真相源，以 Superpowers 作为实现流程约束，以 OpenCode 命令/技能作为用户入口。

## Goals / Non-Goals

**Goals:**

- 提供一个项目级集成工具，可初始化 OpenSpec、Superpowers 工作目录和 OpenCode 命令/技能入口。
- 复用 comet-master 的核心分层：CLI 命令层、核心安装适配层、平台目录映射层、资产复制层和测试层。
- 生成或同步 OpenCode 命令，使用户可通过 `/opsx-propose`、`/opsx-apply`、`/opsx-archive` 等入口执行 OpenSpec 流程。
- 明确 OpenSpec 是 proposal/design/specs/tasks 的唯一真相源；Superpowers 不另建设计文档，只在实施阶段生成 plan 或执行约束。
- 保持 Windows 可用，路径处理使用 Node `path` API，调用外部命令时兼容 `.cmd`。

**Non-Goals:**

- 不实现完整企业 IPD 评审系统、Clean Code 自动修复循环或归档合并算法的全部高级能力。
- 不替换 OpenSpec CLI 的状态机和 artifact 生成机制。
- 不把 comet-master 全量复制为 Driv；只借鉴安装、平台适配和命令生成模式。
- 不改变 OpenCode 配置 schema 或运行时加载机制。

## Decisions

### Decision 1: 采用 TypeScript CLI + assets 分发结构

集成工具采用与 comet-master 一致的 TypeScript CLI 结构：`src/commands/init.ts` 编排初始化，`src/core/openspec.ts`、`src/core/superpowers.ts`、`src/core/opencode.ts`、`src/core/skills.ts` 分别处理安装、平台适配和资产复制，`assets/` 存放命令/技能模板。

选择该方案是因为 comet-master 已验证这种结构适合多平台技能分发和测试。备选方案是只保留 `.opencode` 下的 Markdown 命令，但这无法提供安装、同步、检测和测试能力。

### Decision 2: OpenSpec 工件保持唯一真相源

所有需求、设计、规格和任务工件都写入 `openspec/changes/<change>/`，包括 `proposal.md`、`design.md`、`specs/<capability>/spec.md`、`tasks.md`。Superpowers 的 brainstorming、writing-plans、TDD 等流程只作为执行约束或计划输入，不生成独立 design 文档。

选择该方案是因为当前顶层设计文档明确要求单一真相源。备选方案是保留 `docs/superpowers/specs` 作为设计文档目录，但会造成 OpenSpec 与 Superpowers 两套设计产物漂移。

### Decision 3: 初始化只做项目级最小闭环

第一版默认只面向当前项目目录初始化：创建/校验 `openspec/`、`.opencode/skills`、`.opencode/commands`、`docs/superpowers/plans`，并安装或提示安装 OpenSpec/Superpowers 依赖。全局安装、跨平台全量分发和 hooks 可作为后续扩展。

选择该方案是为了控制实现范围并降低误写用户全局配置的风险。备选方案是复刻 comet-master 的全局/项目双模式，但会扩大测试矩阵和权限风险。

### Decision 4: OpenCode 命令由技能内容生成

OpenCode 命令文件放在 `.opencode/commands/<name>.md`，其正文引用对应 `.opencode/skills/<name>/SKILL.md` 的流程内容，并通过 `$ARGUMENTS` 传递命令参数。生成逻辑参考 comet-master 的 `createOpenCodeCommands`，但命令名保持 `opsx-*`，不引入 `driv-*` 重命名。

选择该方案是因为 OpenCode 对命令和技能目录有明确加载规则，且当前项目已经使用 `opsx-*`。备选方案是只放技能不生成命令，但用户体验不如直接命令入口。

### Decision 5: 外部命令调用隔离且可降级

OpenSpec 安装/初始化通过 `openspec` CLI 或 npm 包完成，Superpowers 通过 `npx skills add obra/superpowers --agent opencode` 完成；当安装失败时，工具给出错误和手动命令，不阻塞已有本地 artifact 使用。

选择该方案是因为网络、权限和 PATH 状态不可控。备选方案是强制安装成功后继续，但会降低离线或受限环境可用性。

## Risks / Trade-offs

- OpenSpec CLI 版本差异可能导致参数不兼容 → 使用能力检测和 fallback，参考 comet-master 对 `--profile` 的重试策略。
- OpenCode 项目级与全局目录不同可能导致文件写错位置 → 第一版只写项目级 `.opencode`，并用路径常量集中管理。
- Superpowers 默认流程会要求写 `docs/superpowers/specs` 设计文档 → 在技能/命令说明中明确 OpenSpec 工件优先，并把设计决策写入 `openspec/changes/<change>/design.md` 或 `tasks.md`。
- 直接复制 comet-master 可能引入不需要的平台复杂度 → 只参考核心模式，第一版仅实现 OpenCode 平台。
- Windows 路径与 shell 执行存在差异 → 所有 Node 代码使用 `path.join`，npm/npx 使用 `.cmd` 解析，测试覆盖 Windows 路径场景。

## Migration Plan

1. 添加最小工具源码和资产目录，不删除现有 `.opencode` 命令/技能。
2. 实现项目级 `init` 流程，先检测已存在文件，默认跳过或询问覆盖。
3. 生成 OpenCode 命令与技能时保持 `opsx-*` 文件名兼容。
4. 增加单元测试覆盖 OpenSpec 调用参数、Superpowers 安装参数、OpenCode 命令生成和目录创建。
5. 验证通过后，文档中提示用户重启 OpenCode 以加载新命令/技能。

回滚策略：删除新增工具源码、资产目录和生成的 `opsx-*` 文件即可恢复到当前手工 scaffold 状态；不迁移或删除已有 OpenSpec 变更目录。

## Open Questions

- npm 包名和 CLI 命令名是否最终使用 `driv`，还是保持当前目录的 `opsx` 命令命名？本变更默认工具内部可称 Driv，但 OpenCode 命令保留 `opsx-*`。
- 是否需要在第一版支持全局安装到 `~/.config/opencode`？本变更默认不支持。
- 是否需要引入企业评审和 Clean Code 检查作为第一版强制门禁？本变更默认先作为后续能力保留。
