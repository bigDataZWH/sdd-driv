# driv

```
██████╗ ██████╗ ██╗██╗   ██╗
██╔══██╗██╔══██╗██║██║   ██║
██║  ██║██████╔╝██║██║   ██║
██║  ██║██╔══██╗██║╚██╗ ██╔╝
██████╔╝██║  ██║██║ ╚████╔╝
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝
```

**OpenSpec + Superpowers 双星工作流** — Clarify → Design → Build → Verify → Archive。

OpenSpec 处理 **WHAT**（提案、spec 生命周期、归档）。

Superpowers 处理 **HOW**（头脑风暴、技术设计、执行）。

Driv 将二者串联为五阶段自动化流水线，支持可恢复状态机、阶段守护门禁、模板系统和质量评审门禁。

## 为什么需要 Driv

OpenSpec 擅长管理提案和 Spec 生命周期，但缺乏细致的技术设计和状态化工作流。

Superpowers 擅长头脑风暴和编码，但生成的文档缺少状态化设计，导致断点恢复时 Agent 需要重新翻文档核验，产生 Token 浪费。

**Driv 合并了两者的强项**，将流程整合为 5 个阶段，并通过 `.driv.yaml` 状态文件和 PhaseGuard 门禁保障阶段转换可靠性。

## 安装

前置要求：

- Node.js 20+
- npm/npx
- Git
- 可运行 bash 的 shell 环境（Windows 用户建议使用 Git Bash）

```bash
npm install -g driv
```

## 快速开始

```bash
cd your-project
driv init
```

`driv init` 会：

1. 安装 OpenSpec 技能
2. 安装 Superpowers 技能
3. 将 Driv 工作流技能部署到 OpenCode
4. 创建 `docs/superpowers/plans/` 工作目录
5. 创建 `.driv/config.yaml` 默认配置
6. 创建 `.driv/templates/` 默认模板

## CLI 命令

| 命令              | 描述                     |
|-------------------|--------------------------|
| `driv init`       | 初始化 Driv 工作流         |
| `driv status`     | 显示当前 change 和阶段      |
| `driv doctor`     | 诊断安装健康状态            |
| `driv update`     | 同步命令、技能、模板和脚本   |
| `driv review`     | 评审创建、提交和状态检查     |
| `driv --help`     | 显示帮助                   |
| `driv --version`  | 显示版本                   |

## 工作流

```
/driv
  ↓ 自动检测活跃 change
/driv-clarify → /driv-design → /driv-build → /driv-verify → /driv-archive
(OpenSpec)     (Superpowers)   (Superpowers)  (Both)        (OpenSpec)
```

### 五个阶段

| 阶段       | 命令               | 归属          | 产出物                                           |
|-----------|-------------------|---------------|-------------------------------------------------|
| 1. Clarify | `/driv-clarify`   | OpenSpec      | proposal.md、.openspec.yaml                         |
| 2. Design  | `/driv-design`    | Superpowers   | design.md、handoff 包、技术评审                      |
| 3. Build   | `/driv-build`     | Superpowers   | Superpowers plan、代码提交、Clean Code 检查、代码评审 |
| 4. Verify  | `/driv-verify`    | Both          | 验证报告、分支处理                                   |
| 5. Archive | `/driv-archive`   | OpenSpec      | Delta Spec 合并、归档                               |

### 核心原则

- **Clarify 不可跳过** — 每个变更必须先生成提案和 OpenSpec 元数据
- **Design 阶段产生 handoff** — Hash 校验确保 artifact 一致性
- **保持 tasks.md 同步** — 每完成一个任务就勾选
- **频繁提交** — 每个任务一个 commit
- **先 Verify 再 Archive** — 验证报告和门禁必须通过

## 技能

`driv init` 完成后，Driv 技能将被安装到 `.opencode/skills/` 目录：

### Driv 工作流技能

| 技能              | 描述                                  |
|------------------|---------------------------------------|
| `/driv`          | 主入口 — 显示当前 change、阶段和推荐下一步    |
| `/driv-clarify`  | 阶段 1：探索与澄清（提案、OpenSpec 元数据）        |
| `/driv-design`   | 阶段 2：设计与规划（头脑风暴、设计文档、handoff）|
| `/driv-build`    | 阶段 3：构建与实现（实现计划、编码、Clean Code）|
| `/driv-verify`   | 阶段 4：验证与测试（构建、测试、验证报告）      |
| `/driv-archive`  | 阶段 5：归档（Delta Spec 合并、归档）         |
| `/driv-review`   | 评审辅助（需求评审、技术评审、代码评审）        |
| `/driv-cleancode`| Clean Code 检查（六大维度评分）              |

### 守护与自动化脚本

| 脚本                  | 用途                                                   |
|-----------------------|--------------------------------------------------------|
| `driv-env.sh`         | 脚本发现助手 — 导出项目根、OpenSpec 目录、配置目录等环境变量 |
| `driv-env-template.sh`| 环境变量模板                                             |
| `driv-state.sh`       | 统一状态管理 — init/set/get/check                        |
| `driv-guard.sh`       | 阶段转换守护 — 验证退出条件                               |
| `driv-handoff.sh`     | 设计交接 — 从 OpenSpec 制品生成带 SHA256 追踪的上下文包     |
| `driv-archive.sh`     | 一键归档 — 验证状态、复制工件、更新状态                    |
| `driv-review.sh`      | 评审管理 — 创建、提交、检查评审                           |
| `driv-cleancode.sh`   | Clean Code 检查入口                                      |
| `driv-validate.sh`    | 完整验证套件 — 结构、命令、脚本、测试                      |

## 状态管理

Driv 使用解耦状态架构，`.driv.yaml` 独立管理工作流状态：

```yaml
change: feature-user-auth
workflow: full
phase: build
created_at: 2026-06-28
openspec:
  change_dir: openspec/changes/feature-user-auth
  proposal: openspec/changes/feature-user-auth/proposal.md
  design: openspec/changes/feature-user-auth/design.md
  tasks: openspec/changes/feature-user-auth/tasks.md
phases:
  clarify:
    status: completed
    artifacts:
      proposal: openspec/changes/feature-user-auth/proposal.md
  design:
    status: completed
    artifacts:
      design: openspec/changes/feature-user-auth/design.md
      tasks: openspec/changes/feature-user-auth/tasks.md
  build:
    status: in_progress
    artifacts:
      plan: docs/superpowers/plans/2026-06-28-user-auth.md
  verify:
    status: pending
  archive:
    status: pending
build_mode: subagent-driven-development
tdd_mode: tdd
isolation: branch
verify_mode: light
verify_result: pending
hw_process:
  requirement_review: pending
  technical_review: pending
  code_review: pending
context_compression: off
archived: false
```

### 阶段转换规则

状态机只允许严格顺序转换：`clarify → design → build → verify → archive`，不支持跳过或回退。

## 阶段守护

每个阶段的入口和出口都有硬性检查规则：

| 阶段退出   | 检查条件                                                           |
|-----------|-------------------------------------------------------------------|
| Clarify   | proposal.md 存在、.openspec.yaml 存在                              |
| Design    | design.md 存在、handoff 有效、技术评审通过                           |
| Build     | plan 存在、模式已选择、代码已提交、测试通过、Clean Code 通过、代码评审通过 |
| Verify    | 验证报告存在、分支已处理                                             |
| Archive   | 变更已移动到归档、spec 已合并                                       |

## 模板系统

默认模板位于 `.driv/templates/`：

| 类型       | 模板                                                           |
|-----------|----------------------------------------------------------------|
| proposals | default、feature、bugfix、refactor、config、docs                 |
| designs   | default、feature、architecture、interface、performance             |
| specs     | default、capability、api、component、service                      |
| reviews   | requirement-review、technical-review、code-review                 |

### 占位符

支持 `{{name}}` 和 `{{name:default}}` 语法，用于模板参数替换。

### 继承策略

支持 section 级模板继承：extend（追加）、override（替换）、merge（合并）、add（新增）。

## Clean Code 检查

六大维度权重评分：

| 维度       | 权重 | 规则                                 |
|-----------|-----:|--------------------------------------|
| 命名规范    | 15% | PascalCase 类、camelCase 变量/函数     |
| 函数设计    | 25% | 函数长度 ≤50 行、参数 ≤5、圈复杂度 ≤10  |
| 代码结构    | 20% | 类长度 ≤500 行、嵌套深度 ≤4 层          |
| 注释规范    | 15% | 公开 API 注释、复杂逻辑注释              |
| 错误处理    | 15% | 禁止空 catch、错误信息明确               |
| 安全规范    | 20% | 无硬编码密钥、输入验证                   |

通过条件：总分 ≥80 且无 critical 问题。

## 项目结构

```
your-project/
├── .driv/
│   ├── config.yaml              # 项目级全局配置
│   ├── scripts/                 # 守护与自动化脚本
│   │   ├── driv-env.sh
│   │   ├── driv-state.sh
│   │   ├── driv-guard.sh
│   │   ├── driv-handoff.sh
│   │   ├── driv-archive.sh
│   │   ├── driv-review.sh
│   │   ├── driv-cleancode.sh
│   │   └── driv-validate.sh
│   └── templates/               # 模板文件
│       ├── config.yaml
│       ├── proposals/
│       ├── designs/
│       ├── specs/
│       └── reviews/
├── .opencode/
│   └── skills/
│       ├── driv/SKILL.md
│       ├── driv-clarify/SKILL.md
│       ├── driv-design/SKILL.md
│       ├── driv-build/SKILL.md
│       ├── driv-verify/SKILL.md
│       ├── driv-archive/SKILL.md
│       ├── driv-review/SKILL.md
│       ├── driv-cleancode/SKILL.md
│       ├── openspec-*/SKILL.md
│       └── brainstorming/SKILL.md
├── openspec/                    # OpenSpec — WHAT
│   ├── changes/
│   │   └── <name>/
│   │       ├── .driv.yaml           # 工作流状态
│   │       ├── .driv/handoff/       # 交接包
│   │       ├── proposal.md
│   │       ├── design.md
│   │       ├── specs/<capability>/spec.md
│   │       ├── tasks.md
│   │       └── reviews/            # 评审文档
│   └── archive/                 # 归档变更
└── docs/superpowers/            # Superpowers — HOW
    └── plans/                   # 实现计划
```

## 开发

贡献流程、提交规范、PR 流程说明见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License

[MIT](LICENSE)
