## Why

当前项目已具备 OpenSpec 与 OpenCode 的基础命令/技能 scaffold，并已有 3 份设计文档描述 OpenSpec、Superpowers 与 OpenCode 的整合目标，但缺少一个可执行、可复用的集成工具把这些能力按 comet-master 的安装与分发模式落地。该变更将把现有设计收敛为一个最小可实现的工具能力，使 OpenSpec 负责变更真相源，Superpowers 负责实现流程，OpenCode 负责命令入口。

## What Changes

- 新增一个 OpenSpec + Superpowers + OpenCode 集成工具能力，参考 `D:\AI\project\SDD\TOOL\comet-master` 的 CLI、平台适配、OpenSpec 安装、Superpowers 安装和 OpenCode 命令生成模式。
- 以当前目录下 3 个 md 文件作为设计输入：`openspec-superpowers-opencode-integration-design.md`、`technical-architecture.md`、`implementation-guide.md`。
- 支持项目级初始化：创建 OpenSpec 规划目录、OpenCode 命令/技能目录、Superpowers 工作目录，并保留 OpenSpec 作为唯一设计真相源。
- 支持安装/同步 OpenSpec 工作流与 Superpowers 技能，并为 OpenCode 生成可调用命令。
- 约束 Superpowers 不生成独立 design 文档，设计产物统一写入 OpenSpec 变更目录。
- 不引入破坏性变更；现有 `.opencode` 命令和技能保持可用。

## Capabilities

### New Capabilities
- `integration-tool`: 定义集成工具的初始化、安装、目录生成、命令生成和 OpenSpec/Superpowers 协同规则。

### Modified Capabilities

## Impact

- 影响 `.opencode/commands/`、`.opencode/skills/`、OpenSpec 规划目录以及未来的工具源码目录。
- 参考 comet-master 的 `src/core/openspec.ts`、`src/core/superpowers.ts`、`src/core/skills.ts`、`src/core/platforms.ts`、`src/commands/init.ts` 与相关测试模式。
- 可能新增 TypeScript CLI 源码、测试用例、资产模板和初始化脚本。
- 需要验证 OpenCode 项目级目录 `.opencode/skills` 与 `.opencode/commands` 的生成结果符合 OpenCode 配置规则。
