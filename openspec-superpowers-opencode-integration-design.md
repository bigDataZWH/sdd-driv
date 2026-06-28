# OpenSpec + Superpowers + OpenCode 整合方案设计文档 - Driv

## 文档信息

| 项目   | 内容           |
| ---- | ------------ |
| 版本   | V1.0         |
| 创建日期 | 2026-06-28   |
| 作者   | AI Expert    |
| 参考项目 | comet-master |
| 项目名称 | Driv         |
| 目标平台 | OpenCode     |

***

## 一、项目背景与目标

### 1.1 项目背景

当前 AI 辅助开发领域存在两大核心能力框架：

- **OpenSpec**：专注于 WHAT（需求管理、提案、Spec 生命周期、归档）
- **Superpowers**：专注于 HOW（规划、执行、收尾）

两者互补但独立使用时存在断点：

- OpenSpec 的提案和 Task 缺乏技术设计支撑
- Superpowers 的执行过程缺乏状态化管理

**comet 项目**提供了优秀的整合实践，我们将此优化为 **Driv** 项目，采用**单一真相源**原则：

- **OpenSpec 作为唯一的真相源**：管理所有设计文档（proposal、design、tasks、specs）
- **Superpowers 只负责实现**：不产出独立的设计文档，执行 brainstorming 但记录决策到 tasks.md

### 1.2 设计目标

1. **单一真相源**：OpenSpec 统一管理所有设计产物，Superpowers 只负责实现
2. **流程整合**：实现从需求到归档的全生命周期管理
3. **企业研发流程适配**：支持需求评审、技术评审、代码评审等关键节点
4. **OpenCode 集成**：针对 OpenCode 平台优化，提供原生命令支持
5. **Clean Code 实践**：确保生成的代码符合高质量标准
6. **状态可恢复**：支持中断后继续，避免重复劳动

### 1.3 核心价值主张

```
OpenSpec 处理 WHAT — 需求、提案、设计文档、任务清单、Spec（唯一真相源）
Superpowers 处理 HOW — 规划、执行、收尾（不产出独立设计文档）
OpenCode 提供 WHERE — 在 AI 编码环境中落地执行
企业研发流程提供 WHEN — 评审节点、质量门禁、交付里程碑
```

### 1.4 单一真相源原则

**核心原则**：所有设计文档由 OpenSpec 统一管理，Superpowers 只负责实现。

| 产物类型             | 产出方         | 存储位置                    | 唯一性 |
| ---------------- | ----------- | ----------------------- | --- |
| proposal.md      | OpenSpec    | openspec/changes/...    | ✅   |
| design.md        | OpenSpec    | openspec/changes/...    | ✅   |
| tasks.md         | OpenSpec    | openspec/changes/...    | ✅   |
| specs/\*/spec.md | OpenSpec    | openspec/changes/...    | ✅   |
| plan.md          | Superpowers | docs/superpowers/plans/ | ✅   |
| 代码               | Superpowers | src/...                 | ✅   |

**关键约束**：

- ❌ Superpowers 不产出独立的 design-doc.md
- ❌ 不存在两份设计文档需要维护
- ✅ Brainstorming 执行但决策记录到 tasks.md 或 plan.md

***

## 二、系统架构设计

### 2.1 总体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OpenCode CLI 工具层                          │
│  init │ status │ doctor │ update │ new │ continue │ verify │ archive│
├─────────────────────────────────────────────────────────────────────┤
│                         Skill 技能层（Driv）                         │
│  open-design │ design │ build │ verify │ archive │                     │
├─────────────────────────────────────────────────────────────────────┤
│                      核心编排引擎 (Core Engine)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ State Machine│  │Phase Guard   │  │ Handoff Mgr  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ OpenSpec API │  │Superpowers   │  │ Context Cmpr │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
├─────────────────────────────────────────────────────────────────────┤
│                         基础设施层                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Git Ops      │  │ YAML/JSON    │  │ Script Exec  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 五阶段工作流模型

| 阶段          | 核心职责           | 企业研发流程对应  | 关键产出                        |
| ----------- | -------------- | --------- | --------------------------- |
| **Open**    | 需求收集、提案创建      | 需求分析阶段    | proposal.md, .openspec.yaml |
| **Design**  | 深度设计、技术方案、决策记录 | 技术方案评审    | design.md, tasks.md（含决策记录）  |
| **Build**   | 编码实现、单元测试      | 详细设计+编码   | plan.md（引用OpenSpec），代码提交    |
| **Verify**  | 验证、代码评审        | 测试验证+代码评审 | verification-report.md      |
| **Archive** | 归档、知识沉淀        | 结项归档      | 归档目录, spec 合并               |

### 2.3 工作流定义

```YAML
workflow:
  name: full
  description: 完整五阶段流程，确保每个变更都经过充分的思考和设计
  phases: [clarify, design, build, verify, archive]
  principles:
    - 深度设计不可跳过：每个变更必须经过 brainstorming
    - TDD 优先：默认采用测试驱动开发
    - 企业研发评审门禁：每个阶段转换必须通过对应评审
  checkpoints:
    - requirement_review: clarify → design
    - technical_review: design → build
    - code_review: build → verify
    - verify_pass: verify → archive
```

***

## 三、文件结构设计

### 3.1 项目目录结构

```text
project-root/
├── .driv/                           # Driv 配置目录
│   ├── config.yaml                    # 项目配置
│   ├── templates/                     # 模板目录
│   │   ├── proposals/                 # Proposal 模板
│   │   │   ├── default.md
│   │   │   ├── feature.md
│   │   │   ├── bugfix.md
│   │   │   ├── refactor.md
│   │   │   ├── config.md
│   │   │   ├── docs.md
│   │   │   └── custom/                # 自定义模板
│   │   ├── designs/                   # Design 模板
│   │   │   ├── default.md
│   │   │   ├── feature.md
│   │   │   ├── architecture.md
│   │   │   ├── interface.md
│   │   │   ├── performance.md
│   │   │   └── custom/                # 自定义模板
│   │   ├── specs/                     # Spec 模板
│   │   │   ├── default.md
│   │   │   ├── capability.md
│   │   │   ├── api.md
│   │   │   ├── component.md
│   │   │   ├── service.md
│   │   │   └── custom/                # 自定义模板
│   │   ├── reviews/                   # Review 模板
│   │   │   ├── requirement-review.md
│   │   │   ├── technical-review.md
│   │   │   └── code-review.md
│   │   └── config.yaml                # 模板配置
│
├── openspec/                          # OpenSpec — WHAT
│   ├── config.yaml
│   ├── changes/                       # 活跃变更
│   │   └── <change-name>/
│   │       ├── .openspec.yaml         # OpenSpec 元数据
│   │       ├── .driv.yaml           # 状态文件
│   │       ├── proposal.md            # 需求提案
│   │       ├── design.md              # 高层设计
│   │       ├── specs/                 # Delta Spec
│   │       │   └── <capability>/
│   │       │       └── spec.md
│   │       ├── tasks.md               # 任务清单
│   │       ├── .driv/               # 阶段交接包
│   │       │   └── handoff/
│   │       │       ├── design-context.json
│   │       │       └── design-context.md
│   │       └── reviews/               # 评审记录
│   │           ├── requirement-review.md
│   │           ├── technical-review.md
│   │           └── code-review.md
│   └── specs/                         # 主 Spec（归档时合并）
│       └── <capability>/
│           └── spec.md
│
├── docs/                              # 文档目录
│   └── superpowers/                   # Superpowers — HOW
│       └── plans/                     # 实施计划（引用 OpenSpec 设计）
│           └── YYYY-MM-DD-<feature>.md
│
└── .driv-commands/                  # OpenCode 命令目录
    ├── driv.md
    ├── driv-clarify.md
    ├── driv-design.md
    ├── driv-build.md
    ├── driv-verify.md
    └── driv-archive.md
```

### 3.2 状态文件设计 (.driv.yaml)

```yaml
# 变更元数据
change: feature-user-auth
workflow: full  # 只有 full 流程
phase: build
created_at: 2026-06-28
creator: developer-name

# OpenSpec 产物（唯一真相源）
openspec:
  change_dir: openspec/changes/feature-user-auth
  proposal: openspec/changes/feature-user-auth/proposal.md
  design: openspec/changes/feature-user-auth/design.md
  tasks: openspec/changes/feature-user-auth/tasks.md
  specs:
    - openspec/changes/feature-user-auth/specs/auth/spec.md

# Superpowers 产物（只负责实现）
superpowers:
  plan: docs/superpowers/plans/2026-06-28-user-auth.md

# 阶段状态
phases:
  clarify:
    status: completed
    completed_at: 2026-06-28T10:00:00
    artifacts:
      proposal: openspec/changes/feature-user-auth/proposal.md
  design:
    status: completed
    completed_at: 2026-06-28T14:00:00
    artifacts:
      # 设计文档来自 OpenSpec，不来自 Superpowers
      design: openspec/changes/feature-user-auth/design.md
      tasks: openspec/changes/feature-user-auth/tasks.md
      decisions: openspec/changes/feature-user-auth/tasks.md  # 决策记录在 tasks.md
  build:
    status: in_progress
    started_at: 2026-06-28T15:00:00
    artifacts:
      plan: docs/superpowers/plans/2026-06-28-user-auth.md
    mode:
      build_mode: subagent-driven-development
      tdd_mode: tdd
      isolation: branch

# 执行模式
build_mode: subagent-driven-development
build_pause: null
subagent_dispatch: confirmed
tdd_mode: tdd
isolation: branch

# 验证状态
verify_mode: light
verify_result: pending
verification_report: null
branch_status: pending

# 企业研发流程扩展
hw_process:
  requirement_review: passed
  requirement_review_at: 2026-06-28T11:00:00
  technical_review: passed
  technical_review_at: 2026-06-28T14:30:00
  code_review: pending
  test_report: null

# Git 引用
base_ref: a1b2c3d4e5f6...
head_ref: feature/user-auth

# 上下文压缩
context_compression: off

# 归档状态
archived: false
verified_at: null
```

***

## 四、企业研发研发流程对接设计

### 4.1 企业研发 IPD 流程映射

```
企业研发 IPD 阶段              本工作流阶段           质量门禁
────────────────────────────────────────────────────────────
概念阶段 ──────────────────► Open Phase
  ├─ 需求收集                    proposal.md 创建
  ├─ 需求分析                    tasks.md 定义
  └─ 需求评审 ────────────────────► requirement_review 门禁

计划阶段 ──────────────────► Design Phase
  ├─ 技术方案设计                design.md 创建（OpenSpec产出）
  ├─ Brainstorming              执行但不产文档，决策记录到 tasks.md
  ├─ 技术方案评审 ────────────────► technical_review 门禁
  └─ 详细设计                    tasks.md 更新

开发阶段 ──────────────────► Build Phase
  ├─ 编码实现                    代码提交
  ├─ 单元测试                    测试通过
  └─ 代码走查 ────────────────────► code_review 门禁

验证阶段 ──────────────────► Verify Phase
  ├─ 集成测试
  ├─ 系统测试
  └─ 验收测试                    verification_report.md

发布阶段 ──────────────────► Archive Phase
  ├─ 文档归档
  ├─ 代码归档
  └─ 知识沉淀
```

### 4.2 评审门禁设计

```yaml
# .driv/config.yaml
gates:
  requirement_review:
    phase: clarify
    trigger: before_design
    required_approvals: 1
    checklist:
      - 需求描述清晰完整
      - 验收标准明确
      - 范围边界清晰
      - 风险识别充分
    template: reviews/requirement-review.md

  technical_review:
    phase: design
    trigger: before_build
    required_approvals: 1
    checklist:
      - 技术方案可行性
      - 架构设计合理性
      - 接口设计完整性
      - 性能考虑充分
    template: reviews/technical-review.md

  code_review:
    phase: build
    trigger: before_verify
    required_approvals: 1
    checklist:
      - 代码符合规范
      - 单元测试覆盖
      - 无安全漏洞
      - 注释文档完整
    template: reviews/code-review.md
```

### 4.3 评审流程集成

```
┌────────────────────────────────────────────────────────────────┐
│                    评审门禁执行流程                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Phase Complete ──► Gate Check ──► [通过?]                    │
│                          │                                     │
│                          ▼                                     │
│               ┌──────────────────┐                            │
│               │ 生成评审文档      │                            │
│               │ 使用模板填充      │                            │
│               └────────┬─────────┘                            │
│                        │                                       │
│                        ▼                                       │
│               ┌──────────────────┐                            │
│               │ 执行检查项验证    │                            │
│               │ (自动化+人工)     │                            │
│               └────────┬─────────┘                            │
│                        │                                       │
│          ┌─────────────┴─────────────┐                         │
│          ▼                           ▼                         │
│     [通过]                        [不通过]                      │
│        │                              │                        │
│        ▼                              ▼                        │
│   记录评审结果                   记录问题清单                    │
│   更新状态文件                   阻塞下一阶段                    │
│   进入下一阶段                   等待                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4.4 Build 阶段详细设计

#### 4.4.1 阶段概述

| 属性 | 说明 |
|------|------|
| **目标** | 实现功能，单元测试 |
| **触发条件** | 技术评审通过后 |
| **命令** | `/driv-build` |
| **门禁** | 代码评审 |

#### 4.4.2 核心流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Build 阶段核心流程                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  技术评审通过                                                         │
│      ↓                                                               │
│  ┌────────────────┐                                                  │
│  │ 运行 /driv-build │                                                 │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│  ┌────────────────┐                                                  │
│  │ 创建实施计划     │  docs/superpowers/plans/YYYY-MM-DD-<feature>.md │
│  │   plan.md      │                                                  │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│  ┌────────────────┐                                                  │
│  │ 选择执行模式     │                                                  │
│  │ 选择 TDD 模式    │                                                  │
│  │ 选择工作区隔离   │                                                  │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│  ┌────────────────┐                                                  │
│  │ 执行编码任务     │                                                  │
│  │ (TDD 模式优先)   │                                                  │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│  ┌────────────────┐                                                  │
│  │ Clean Code 检查  │  华为标准六大维度                                 │
│  │ (循环优化)      │  分数≥80 通过                                     │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│  ┌────────────────┐                                                  │
│  │ 生成代码评审     │  AI初稿 + 人工复核                                │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│  ┌────────────────┐                                                  │
│  │ 代码评审门禁     │                                                  │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│     ┌─────┴─────┐                                                    │
│     │           │                                                    │
│  通过          不通过                                                 │
│     │           │                                                    │
│     ↓           ↓                                                    │
│  Verify       返回 Build                                             │
│  阶段         修复问题                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4.4.3 执行模式选择

| 模式 | 说明 | 推荐度 | 适用场景 |
|------|------|--------|----------|
| **subagent-driven-development** | 子代理驱动开发 | ⭐⭐⭐ 推荐 | 大多数场景，复杂任务 |
| **direct** | 直接实现 | ⭐ 不推荐 | 简单变更，特殊情况 |

#### 4.4.4 TDD 模式选择

| 模式 | 说明 | 推荐度 | 流程 |
|------|------|--------|------|
| **tdd** | 测试驱动开发 | ⭐⭐⭐ 推荐 | Red → Green → Refactor |
| **direct** | 直接实现 | ⭐ 不推荐 | 先实现，后测试 |

**TDD 流程**：
```
1. Red:   写测试用例 → 运行测试 → 失败（符合预期）
2. Green: 写最简实现 → 运行测试 → 通过
3. Refactor: 重构优化 → 运行测试 → 通过
4. 重复直到所有功能实现
```

#### 4.4.5 工作区隔离选择

| 模式 | 说明 | 推荐度 | 适用场景 |
|------|------|--------|----------|
| **branch** | Git 分支隔离 | ⭐⭐⭐ 推荐 | 大多数场景 |
| **worktree** | Git worktree | ⭐⭐ 可选 | 并行多任务 |

#### 4.4.6 Clean Code 检查（华为标准）

**六大维度检查**：

| 维度 | 权重 | 关键规则 | 阈值 |
|------|------|----------|------|
| 命名规范 | 15% | 类名 PascalCase，函数 camelCase | - |
| 函数设计 | 25% | 函数长度、参数数量、圈复杂度 | ≤50行, ≤5参数, ≤10复杂度 |
| 代码结构 | 20% | 类长度、嵌套深度 | ≤500行, ≤4层 |
| 注释规范 | 15% | 公开API必须有注释 | - |
| 错误处理 | 15% | 禁止空catch | - |
| 安全规范 | 20% | 无硬编码密钥、输入验证 | - |

**循环优化机制**：
```
检查 → 分数 < 80? → AI自动修复 → 重新检查 → (最多5轮)
                          ↓
                     分数 ≥ 80 → 通过
                          ↓
                     仍未通过 → 人工介入
```

#### 4.4.7 评审门禁

**触发时机**：Build 阶段完成，准备进入 Verify 阶段前

**检查项**：
```yaml
code_review:
  pass_conditions:
    - check_1: passed  # 代码符合规范
    - check_2: passed  # 单元测试覆盖（≥80%）
    - check_3: passed  # 无安全漏洞
    - check_4: passed  # 错误处理完善
```

**Build 阶段退出检查**：
```typescript
checks: [
  { name: 'plan_exists', critical: true },
  { name: 'build_mode_set', critical: true },
  { name: 'tdd_mode_set', critical: true },
  { name: 'isolation_set', critical: true },
  { name: 'code_committed', critical: true },
  { name: 'tests_passed', critical: true },
  { name: 'clean_code_passed', critical: false },  // 企业研发扩展
  { name: 'code_review_passed', critical: true },  // 企业研发扩展
]
```

#### 4.4.8 产出物

```
docs/superpowers/plans/
└── YYYY-MM-DD-<feature>.md          # 实施计划

openspec/changes/<name>/reviews/
└── code-review.md                    # 代码评审文档

openspec/changes/<name>/reports/
├── clean-code-report.md              # Clean Code 报告
├── clean-code-issues.json            # 问题列表
└── clean-code-fix-history.json       # 修复历史
```

#### 4.4.9 状态文件示例

```yaml
phases:
  build:
    status: completed
    completed_at: 2026-06-28T18:00:00
    artifacts:
      plan: docs/superpowers/plans/2026-06-28-user-auth.md
    mode:
      build_mode: subagent-driven-development
      tdd_mode: tdd
      isolation: branch
    clean_code:
      score: 85
      iterations: 2
      passed: true
    tests:
      coverage: 82%
      passed: true
```

### 4.5 Verify 阶段详细设计

#### 4.5.1 阶段概述

| 属性 | 说明 |
|------|------|
| **目标** | 验证实现，处理分支 |
| **触发条件** | 代码评审通过后 |
| **命令** | `/driv-verify` |
| **门禁** | 验证通过即可归档 |

#### 4.5.2 核心流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Verify 阶段核心流程                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  代码评审通过                                                         │
│      ↓                                                               │
│  ┌────────────────┐                                                  │
│  │ 运行 /driv-verify │                                                │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│  ┌────────────────┐                                                  │
│  │ 评估变更规模     │                                                  │
│  │ light: <3 tasks │                                                  │
│  │ full: ≥3 tasks  │                                                  │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│  ┌────────────────┐                                                  │
│  │ 执行验证检查     │                                                  │
│  │ - 构建成功      │                                                  │
│  │ - 测试通过      │                                                  │
│  │ - Clean Code 通过 │                                                │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│  ┌────────────────┐                                                  │
│  │ 处理开发分支    │                                                  │
│  │ - 合并到主分支  │                                                  │
│  │ - 或保留独立分支 │                                                 │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│  ┌────────────────┐                                                  │
│  │ 生成验证报告    │                                                  │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│        Archive                                                       │
│        阶段                                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4.5.3 变更规模评估

| 规模 | 条件 | 验证策略 |
|------|------|----------|
| **light**（轻量） | <3 tasks, <4 files | 简化验证流程 |
| **full**（完整） | ≥3 tasks, ≥4 files | 完整验证流程 |

#### 4.5.4 验证检查项

| 检查项 | 说明 | 自动化 |
|--------|------|--------|
| 构建成功 | 代码可正常编译/构建 | ✅ |
| 测试通过 | 所有单元测试/集成测试通过 | ✅ |
| Clean Code 通过 | 分数 ≥ 80 | ✅ |
| 分支已处理 | 分支已合并或保留 | ✅ |
| 验证报告生成 | verification-report.md | ✅ |

#### 4.5.5 分支处理策略

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| **merge** | 合并到主分支 | 小改动，通过验证 |
| **squash** | Squash 合并 | 中等改动，需要保持历史 |
| **rebase** | Rebase 到主分支 | 大改动，保持线性历史 |
| **retain** | 保留独立分支 | 需要继续开发 |

#### 4.5.6 产出物

```
openspec/changes/<name>/reports/
└── verification-report.md        # 验证报告
```

#### 4.5.7 状态文件示例

```yaml
phases:
  verify:
    status: completed
    completed_at: 2026-06-28T20:00:00
    scale: full
    checks:
      build_passed: true
      tests_passed: true
      clean_code_passed: true
      branch_handled: true
    branch:
      strategy: merge
      source_branch: feature/user-auth
      target_branch: main
    report: openspec/changes/feature-user-auth/reports/verification-report.md
```

### 4.6 Archive 阶段详细设计

#### 4.6.1 阶段概述

| 属性 | 说明 |
|------|------|
| **目标** | 归档变更，合并 Spec |
| **触发条件** | 验证通过后 |
| **命令** | `/driv-archive` |
| **门禁** | 无 |

#### 4.6.2 核心流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Archive 阶段核心流程                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  验证通过                                                             │
│      ↓                                                               │
│  ┌────────────────┐                                                  │
│  │ 运行 /driv-archive │                                                │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│  ┌────────────────┐                                                  │
│  │ 确认归档条件     │                                                  │
│  │ - 变更完成      │                                                  │
│  │ - Spec 可合并   │                                                  │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│  ┌────────────────┐                                                  │
│  │ 移动变更到归档   │                                                  │
│  │ - 复制文件      │                                                  │
│  │ - 更新目录结构  │                                                  │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│  ┌────────────────┐                                                  │
│  │ 合并 Delta Spec │                                                  │
│  │ 到主 Spec      │                                                  │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│  ┌────────────────┐                                                  │
│  │ 更新知识库      │                                                  │
│  │ (可选)         │                                                  │
│  └────────┬───────┘                                                  │
│           ↓                                                          │
│        完成                                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4.6.3 归档产物

```
openspec/archive/YYYY-MM-DD-<name>/    # 归档目录
├── proposal.md                        # 原始提案
├── design.md                          # 技术设计
├── tasks.md                           # 任务清单
├── specs/                             # Delta Spec
│   └── <capability>/
│       └── spec.md
└── reviews/                           # 评审记录
    ├── requirement-review.md
    ├── technical-review.md
    └── code-review.md

openspec/specs/<capability>/spec.md   # 合并后的主 Spec
```

#### 4.6.4 状态文件示例

```yaml
phases:
  archive:
    status: completed
    completed_at: 2026-06-28T22:00:00
    archive_path: openspec/archive/2026-06-28-feature-user-auth
    spec_merged:
      capability: user-auth
      merged_at: 2026-06-28T21:30:00
    artifacts:
      proposal: archived
      design: archived
      specs: merged
      reviews: archived
```

#### 4.6.5 命令行接口

```bash
/driv-archive [选项]

选项：
  --change <name>      # 变更名称（必填）
  --spec-merge        # 合并 Spec（默认：true）
  --skip-knowledge    # 跳过知识库更新
  --dry-run           # 预演模式
  --force             # 强制归档（忽略警告）

示例：
  /driv-archive --change feature-user-auth
  /driv-archive --change feature-user-auth --skip-knowledge
  /driv-archive --change feature-user-auth --dry-run
```

#### 4.6.6 执行流程（详细步骤）

```
Step 1: 验证前置条件
├── 检查 verify 阶段是否完成
├── 检查变更是否存在
└── 检查是否已归档

Step 2: 确认归档条件
├── 变更完成状态 = completed
├── 所有评审已通过
└── 验证报告存在

Step 3: 创建归档目录
├── 创建 openspec/archive/YYYY-MM-DD-<name>/
└── 创建子目录结构

Step 4: 复制文件到归档目录
├── proposal.md
├── design.md
├── tasks.md
├── specs/<capability>/
└── reviews/

Step 5: 合并 Delta Spec
├── 读取主 Spec (openspec/specs/<capability>/spec.md)
├── 读取 Delta Spec (openspec/changes/<name>/specs/<capability>/spec.md)
├── 执行合并策略
└── 写入主 Spec

Step 6: 更新知识库（可选）
├── 更新索引文件
├── 更新变更摘要
└── 生成变更报告

Step 7: 更新状态文件
├── phase.archive.status = completed
├── archive_path = <path>
└── completed_at = <timestamp>

Step 8: 清理临时文件
├── 清理 Build 阶段临时文件
└── 清理验证报告（可选保留）
```

#### 4.6.7 Delta Spec 合并策略

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| **append** | 追加新能力到主 Spec | 新增能力 |
| **update** | 更新已有能力 | 修改现有能力 |
| **supersede** | 替换整个能力 | 完全重写 |

**合并算法**：
```python
def merge_delta_spec(main_spec, delta_spec):
    for section in delta_spec:
        if section not in main_spec:
            main_spec[section] = section  # 新增
        elif section.type == 'capability':
            if section.merge_strategy == 'update':
                merge_capability(main_spec[section], section)
            elif section.merge_strategy == 'supersede':
                main_spec[section] = section
        else:
            merge_section(main_spec[section], section)
    return main_spec
```

#### 4.6.8 归档检查清单

```yaml
archive_checks:
  preconditions:
    - name: verify_completed
      check: phases.verify.status == 'completed'
      
    - name: change_exists
      check: openspec/changes/<name>/ exists
      
    - name: not_archived
      check: phases.archive.status != 'completed'
      
    - name: verification_report_exists
      check: reports/verification-report.md exists
      
  file_copy:
    - proposal.md
    - design.md
    - tasks.md
    - specs/<capability>/spec.md
    - reviews/requirement-review.md
    - reviews/technical-review.md
    - reviews/code-review.md
    
  postconditions:
    - name: archive_created
      check: openspec/archive/YYYY-MM-DD-<name>/ exists
      
    - name: spec_merged
      check: openspec/specs/<capability>/spec.md updated
      
    - name: status_updated
      check: phases.archive.status == 'completed'
```

#### 4.6.9 错误处理机制

| 错误类型 | 处理策略 | 回滚操作 |
|----------|----------|----------|
| 归档目录已存在 | 跳过创建 | 无需回滚 |
| Spec 合并冲突 | 保留原 Spec，创建 conflict 文件 | 无需回滚 |
| 文件复制失败 | 回滚已复制文件 | 删除已创建的目录 |
| 状态更新失败 | 保留归档文件，手动修复 | 无需回滚 |

**回滚脚本**：
```bash
driv-archive-rollback() {
  local archive_path="$1"
  
  # 删除归档目录
  rm -rf "openspec/archive/$archive_path"
  
  # 恢复 Spec（如果有冲突备份）
  if [ -f "openspec/specs/.backup/" ]; then
    cp "openspec/specs/.backup/"* "openspec/specs/"
  fi
  
  # 重置状态
  yq -i '.phases.archive.status = "pending"' ".driv/changes/$archive_path/state.yaml"
}
```

#### 4.6.10 知识库更新（可选）

```yaml
knowledge_updates:
  - type: index_update
    file: openspec/archive/index.yaml
    fields:
      - change_name
      - archive_date
      - capability
      - summary
      
  - type: capability_summary
    file: openspec/specs/capabilities.yaml
    updates:
      - capability_name
      - last_updated
      - change_count
      
  - type: change_report
    file: openspec/reports/changes-<month>.md
    content:
      - change_name
      - date
      - 评审结果
      - 实现摘要
```

#### 4.6.11 实现脚本结构

```
.driv/scripts/
├── archive.sh                    # 主归档脚本
├── archive-merge-spec.sh         # Spec 合并脚本
├── archive-copy-files.sh         # 文件复制脚本
├── archive-rollback.sh           # 回滚脚本
└── archive-verify.sh             # 归档验证脚本
```

#### 4.6.12 输出日志格式

```
[INFO] 2026-06-28T22:00:00 Starting archive for change: feature-user-auth
[INFO] 2026-06-28T22:00:01 Validating preconditions...
[INFO] 2026-06-28T22:00:01 All preconditions passed
[INFO] 2026-06-28T22:00:02 Creating archive directory...
[INFO] 2026-06-28T22:00:02 Archive directory created: openspec/archive/2026-06-28-feature-user-auth
[INFO] 2026-06-28T22:00:03 Copying files...
[INFO] 2026-06-28T22:00:04 Files copied successfully
[INFO] 2026-06-28T22:00:05 Merging Delta Spec...
[INFO] 2026-06-28T22:00:05 Spec merged successfully: user-auth capability
[INFO] 2026-06-28T22:00:06 Updating knowledge base...
[INFO] 2026-06-28T22:00:07 Knowledge base updated
[INFO] 2026-06-28T22:00:08 Updating state file...
[INFO] 2026-06-28T22:00:08 Archive completed successfully
```

### 4.7 五阶段完整流程图

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Driv 五阶段完整工作流                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐                                                    │
│  │   Clarify   │  需求澄清，生成 proposal.md                        │
│  │   需求澄清   │                                                    │
│  └──────┬──────┘                                                    │
│         │                                                            │
│         ▼ 需求评审                                                    │
│  ┌─────────────┐                                                    │
│  │   Design    │  技术设计，完善 design.md                          │
│  │   技术设计   │                                                    │
│  └──────┬──────┘                                                    │
│         │                                                            │
│         ▼ 技术评审                                                   │
│  ┌─────────────┐                                                    │
│  │   Build     │  编码实现，TDD 模式，Clean Code 检查                │
│  │   编码实现   │                                                    │
│  └──────┬──────┘                                                    │
│         │                                                            │
│         ▼ 代码评审                                                   │
│  ┌─────────────┐                                                    │
│  │   Verify    │  验证测试，处理分支，生成验证报告                    │
│  │   验证测试   │                                                    │
│  └──────┬──────┘                                                    │
│         │                                                            │
│         ▼ 验证通过                                                   │
│  ┌─────────────┐                                                    │
│  │   Archive   │  归档变更，合并 Spec                                │
│  │   归档沉淀   │                                                    │
│  └──────┬──────┘                                                    │
│         │                                                            │
│         ▼ 完成                                                       │
│  ┌─────────────┐                                                    │
│  │    Done     │  变更归档，知识沉淀                                 │
│  │    完成     │                                                    │
│  └─────────────┘                                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

***

## 五、评审模板生成机制

### 5.1 模板体系架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                     评审模板生成体系                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  .driv/                                                              │
│  ├── config.yaml                    # 评审配置                       │
│  │                                                                  │
│  └── review-templates/              # 模板目录                        │
│      ├── requirement-review.md     # 需求评审模板                    │
│      ├── technical-review.md       # 技术评审模板                    │
│      └── code-review.md            # 代码评审模板                    │
│                                                                      │
│  模板生成时机：                                                        │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Phase Complete ──► 触发评审 ──► 模板填充 ──► AI 初审 ──► 人工 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 模板文件结构

#### 5.2.1 需求评审模板

```markdown
# 需求评审

## 基本信息

| 项目 | 内容 |
|------|------|
| 变更名称 | {{change_name}} |
| 变更类型 | {{change_type}} |
| 创建日期 | {{created_at}} |
| 评审人 | {{reviewer}} |
| 评审日期 | {{review_date}} |

## 检查项

| 序号 | 检查项 | 状态 | 说明 |
|------|--------|------|------|
| 1 | 需求描述清晰完整 | {{check_1}} | {{check_1_note}} |
| 2 | 验收标准明确 | {{check_2}} | {{check_2_note}} |
| 3 | 范围边界清晰 | {{check_3}} | {{check_3_note}} |
| 4 | 风险识别充分 | {{check_4}} | {{check_4_note}} |

## 关联文档

| 文档 | 路径 |
|------|------|
| 需求提案 | [proposal.md]({{proposal_path}}) |
| 任务清单 | [tasks.md]({{tasks_path}}) |

## AI 检查结果

> AI 根据 proposal.md 和 tasks.md 自动生成

{{ai_review_content}}

## 评审意见

**整体评价**：{{overall_evaluation}}

**通过条件**：
{{pass_conditions}}

**补充内容**：
{{additional_content}}

## 最终结论

{{final_decision}}

---

## 评审记录

| 轮次 | 评审人 | 日期 | 结论 |
|------|--------|------|------|
| {{round}} | {{reviewer}} | {{date}} | {{decision}} |
```

#### 5.2.2 技术评审模板

```markdown
# 技术评审

## 基本信息

| 项目 | 内容 |
|------|------|
| 变更名称 | {{change_name}} |
| 评审人 | {{reviewer}} |
| 评审日期 | {{review_date}} |

## 设计文档

- [design.md]({{design_path}})
- [tasks.md]({{tasks_path}})

## 检查项

### 架构设计

| 序号 | 检查项 | 状态 | 说明 |
|------|--------|------|------|
| 1 | 技术方案可行性 | {{check_1}} | {{check_1_note}} |
| 2 | 架构设计合理性 | {{check_2}} | {{check_2_note}} |
| 3 | 接口设计完整性 | {{check_3}} | {{check_3_note}} |
| 4 | 性能考虑充分 | {{check_4}} | {{check_4_note}} |

### 决策记录审查

| 决策ID | 决策内容 | 评审意见 |
|--------|----------|----------|
{{decisions_table}}

### 任务完整性

| 任务数 | 已设计任务 | 评审意见 |
|--------|------------|----------|
| {{task_count}} | {{task_detail}} | {{task_review}} |

## AI 检查结果

> AI 根据 design.md、tasks.md 自动生成

{{ai_review_content}}

## 评审意见

**整体评价**：{{overall_evaluation}}

**通过条件**：
{{pass_conditions}}

## 最终结论

{{final_decision}}
```

#### 5.2.3 代码评审模板

```markdown
# 代码评审

## 基本信息

| 项目 | 内容 |
|------|------|
| 变更名称 | {{change_name}} |
| 分支 | {{branch}} |
| Commits | {{commit_count}} |
| 代码量 | {{code_stats}} |
| 评审人 | {{reviewer}} |
| 评审日期 | {{review_date}} |

## 自动化检查结果

| 检查项 | 工具 | 状态 | 结果 |
|--------|------|------|------|
| 代码格式 | prettier | {{format_check}} | {{format_result}} |
| ESLint | eslint | {{lint_check}} | {{lint_result}} |
| 单元测试覆盖 | jest --coverage | {{coverage_check}} | {{coverage_result}} |
| 安全扫描 | npm audit | {{security_check}} | {{security_result}} |

## 检查项

| 序号 | 检查项 | 状态 | 说明 |
|------|--------|------|------|
| 1 | 代码符合规范 | {{check_1}} | {{check_1_note}} |
| 2 | 单元测试覆盖 | {{check_2}} | {{check_2_note}} |
| 3 | 无安全漏洞 | {{check_3}} | {{check_3_note}} |
| 4 | 注释文档完整 | {{check_4}} | {{check_4_note}} |
| 5 | 错误处理完善 | {{check_5}} | {{check_5_note}} |

## AI 代码分析

> AI 基于 Git diff 和测试报告自动生成

{{ai_code_analysis}}

## 评审意见

### 亮点

{{strengths}}

### 需要改进

{{improvements}}

## 最终结论

{{final_decision}}
```

### 5.3 模板填充机制

#### 5.3.1 填充脚本

```bash
#!/bin/bash
# driv-review-generate.sh - 生成评审文档

generate_review_template() {
  local change_name=$1
  local review_type=$2  # requirement | technical | code

  local template_path=".driv/review-templates/${review_type}-review.md"
  local output_dir="openspec/changes/${change_name}/reviews"
  local output_path="${output_dir}/${review_type}-review.md"

  echo "[REVIEW] Generating ${review_type} review for ${change_name}"

  # 1. 检查模板是否存在
  if [ ! -f "$template_path" ]; then
    echo "[ERROR] Template not found: $template_path"
    return 1
  fi

  # 2. 创建输出目录
  mkdir -p "$output_dir"

  # 3. 复制模板
  cp "$template_path" "$output_path"

  # 4. 获取基本信息
  local created_at=$(date -I)
  local proposal_path="openspec/changes/${change_name}/proposal.md"
  local tasks_path="openspec/changes/${change_name}/tasks.md"
  local design_path="openspec/changes/${change_name}/design.md"

  # 5. 替换占位符
  sed -i "s/{{change_name}}/${change_name}/g" "$output_path"
  sed -i "s/{{created_at}}/${created_at}/g" "$output_path"
  sed -i "s/{{review_date}}/待填写/g" "$output_path"
  sed -i "s/{{reviewer}}/待填写/g" "$output_path"
  sed -i "s|{{proposal_path}}|${proposal_path}|g" "$output_path"
  sed -i "s|{{tasks_path}}|${tasks_path}|g" "$output_path"
  sed -i "s|{{design_path}}|${design_path}|g" "$output_path"

  # 6. AI 填充检查项
  ai_fill_review_content "$change_name" "$review_type" "$output_path"

  echo "[REVIEW] Review template generated: $output_path"
}

# AI 填充逻辑
ai_fill_review_content() {
  local change_name=$1
  local review_type=$2
  local output_path=$3

  echo "[AI] Starting AI review analysis..."

  case "$review_type" in
    requirement)
      ai-analyze-requirements \
        --change "$change_name" \
        --output "$output_path"
      ;;

    technical)
      ai-analyze-design \
        --change "$change_name" \
        --output "$output_path"
      ;;

    code)
      ai-analyze-code \
        --change "$change_name" \
        --branch "feature/${change_name}" \
        --output "$output_path"
      ;;
  esac
}
```

#### 5.3.2 AI 评审命令

```bash
#!/bin/bash
# driv-review-ai.sh - AI 评审分析

case "$1" in
  requirement)
    ai-analyze-requirements --change "$2" --output "$3"
    ;;

  technical)
    ai-analyze-design --change "$2" --output "$3"
    ;;

  code)
    ai-analyze-code --change "$2" --output "$3"
    ;;
esac

# AI 分析函数示例
ai-analyze-requirements() {
  local change_name=$1
  local output_path=$2

  local proposal="openspec/changes/${change_name}/proposal.md"
  local tasks="openspec/changes/${change_name}/tasks.md"

  # 读取文档内容
  local proposal_content=$(cat "$proposal")
  local tasks_content=$(cat "$tasks")

  # AI 分析（调用 AI 模型）
  local ai_result=$(ai-model-request "分析以下需求文档，检查：
1. 需求描述是否清晰完整
2. 验收标准是否明确
3. 范围边界是否清晰
4. 风险识别是否充分

需求文档：
$proposal_content

任务清单：
$tasks_content

请给出：
1. 每项检查的结果（通过/待确认/未通过）
2. 发现的问题（如有）
3. 改进建议（如有）
4. 整体评价和通过建议" --format markdown)

  # 填充到文档
  sed -i "s/{{ai_review_content}}/${ai_result}/g" "$output_path"
}
```

### 5.4 评审流程集成

#### 5.4.1 完整评审流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                    评审模板生成完整流程                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Phase 完成                                                       │
│     例：Open 阶段完成，准备进入 Design                                │
│                          │                                          │
│                          ▼                                          │
│  2. 触发评审生成                                                     │
│     /driv-review generate feature-user-auth requirement             │
│                          │                                          │
│                          ▼                                          │
│  3. 读取模板                                                         │
│     .driv/review-templates/requirement-review.md                   │
│                          │                                          │
│                          ▼                                          │
│  4. 填充基本信息                                                     │
│     - change_name: feature-user-auth                               │
│     - created_at: 2026-06-28                                        │
│     - proposal_path: openspec/changes/...                           │
│     - tasks_path: openspec/changes/...                              │
│                          │                                          │
│                          ▼                                          │
│  5. AI 自动分析                                                      │
│     - 读取 proposal.md, tasks.md                                     │
│     - 逐项检查                                                       │
│     - 生成检查结果                                                   │
│                          │                                          │
│                          ▼                                          │
│  6. 生成评审文档                                                     │
│     openspec/changes/feature-user-auth/reviews/                    │
│     └── requirement-review.md                                       │
│                          │                                          │
│                          ▼                                          │
│  7. 人工复核确认                                                     │
│     评审人检查 AI 结果，补充人工意见，给出最终结论                     │
│                          │                                          │
│                          ▼                                          │
│  8. 提交评审结果                                                     │
│     /driv-review submit feature-user-auth requirement               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 5.4.2 评审模式配置

```yaml
# .driv/config.yaml
review:
  # 评审模式：ai-first（推荐）| manual-only
  mode: ai-first

  # AI 评审时自动执行的检查
  ai_checks:
    format: true        # 格式规范性
    completeness: true  # 完整性检查
    consistency: true   # 内容一致性
    automation: true    # 自动化检查（测试覆盖、安全扫描等）

  # 需要人工确认的检查项
  manual_checks:
    - 业务价值判断
    - 架构权衡决策
    - 新风险识别
    - 最终审批

  # AI 模型配置
  ai_model:
    provider: openai  # openai | anthropic | local
    model: gpt-4
    temperature: 0.3  # 低温度确保一致性

  # 检查项配置
  checks:
    requirement:
      - name: 需求描述清晰完整
        type: completeness
        required: true
        ai_evaluatable: true
      - name: 验收标准明确
        type: clarity
        required: true
        ai_evaluatable: true
      - name: 范围边界清晰
        type: boundary
        required: true
        ai_evaluatable: true
      - name: 风险识别充分
        type: risk
        required: false
        ai_evaluatable: true

    technical:
      - name: 技术方案可行性
        type: feasibility
        required: true
        ai_evaluatable: true
      - name: 架构设计合理性
        type: architecture
        required: true
        ai_evaluatable: true
      - name: 接口设计完整性
        type: api
        required: true
        ai_evaluatable: true
      - name: 性能考虑充分
        type: performance
        required: false
        ai_evaluatable: true

    code:
      - name: 代码符合规范
        type: lint
        required: true
        ai_evaluatable: true
        auto_check: prettier/eslint
      - name: 单元测试覆盖
        type: coverage
        required: true
        ai_evaluatable: true
        auto_check: jest --coverage
      - name: 无安全漏洞
        type: security
        required: true
        ai_evaluatable: true
        auto_check: npm audit
      - name: 注释文档完整
        type: documentation
        required: false
        ai_evaluatable: true
      - name: 错误处理完善
        type: error_handling
        required: true
        ai_evaluatable: true
```

### 5.5 AI vs 人工职责划分

| 评审维度      | AI 负责             | 人工负责     |
| --------- | ----------------- | -------- |
| **格式规范性** | ✅ 检查文档格式、必填项      | -        |
| **完整性检查** | ✅ 检查必填内容是否齐全      | -        |
| **自动化检查** | ✅ 测试覆盖率、代码格式、安全扫描 | -        |
| **逻辑一致性** | ✅ 检查前后一致性         | -        |
| **需求合理性** | ⚠️ 可辅助检查逻辑一致性     | ✅ 业务价值判断 |
| **设计合理性** | ⚠️ 可辅助检查技术方案      | ✅ 架构权衡决策 |
| **风险评估**  | ⚠️ 可识别已知风险模式      | ✅ 新风险判断  |
| **最终审批**  | -                 | ✅ 人工签字确认 |

### 5.6 评审结果记录

#### 5.6.1 .driv.yaml 更新

```yaml
reviews:
  requirement:
    status: pending        # pending | passed | rejected
    reviewed_at: null
    reviewer: null
    comments: null
    ai_analysis: true
    rounds: 1
    current_round: 1
    issues: []
  technical:
    status: pending
    reviewed_at: null
    reviewer: null
    comments: null
    ai_analysis: true
    rounds: 1
    current_round: 1
    issues: []
  code:
    status: pending
    reviewed_at: null
    reviewer: null
    comments: null
    ai_analysis: true
    rounds: 1
    current_round: 1
    issues: []
```

#### 5.6.2 评审通过条件

```yaml
# 评审通过条件配置
gates:
  requirement_review:
    pass_conditions:
      - check_1: passed  # 需求描述清晰完整
      - check_2: passed  # 验收标准明确
      - check_3: passed  # 范围边界清晰
      # check_4 为可选项

  technical_review:
    pass_conditions:
      - check_1: passed  # 技术方案可行性
      - check_2: passed  # 架构设计合理性
      - check_3: passed  # 接口设计完整性

  code_review:
    pass_conditions:
      - check_1: passed  # 代码符合规范
      - check_2: passed  # 单元测试覆盖（≥80%）
      - check_3: passed  # 无安全漏洞
      - check_5: passed  # 错误处理完善
```

***

## 六、模板配置系统

### 6.1 模板体系架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                 Driv 完整模板体系                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  .driv/templates/                                                    │
│  ├── proposals/                     # Proposal 模板                  │
│  │   ├── default.md                                                │
│  │   ├── feature.md                                                │
│  │   ├── bugfix.md                                                 │
│  │   └── ...                                                       │
│  │                                                                  │
│  ├── designs/                       # Design 模板                   │
│  │   ├── default.md                # 默认设计模板                    │
│  │   ├── feature.md                # 功能设计模板                    │
│  │   ├── architecture.md           # 架构设计模板                    │
│  │   ├── interface.md              # 接口设计模板                    │
│  │   └── performance.md            # 性能优化模板                    │
│  │                                                                  │
│  ├── specs/                        # Spec 模板                       │
│  │   ├── default.md                # 默认规格模板                    │
│  │   ├── capability.md             # 能力规格模板                    │
│  │   ├── api.md                    # API 规格模板                    │
│  │   ├── component.md              # 组件规格模板                    │
│  │   └── service.md                # 服务规格模板                    │
│  │                                                                  │
│  ├── reviews/                      # Review 模板                     │
│  │   ├── requirement-review.md    # 需求评审模板                    │
│  │   ├── technical-review.md      # 技术评审模板                    │
│  │   └── code-review.md           # 代码评审模板                    │
│  │                                                                  │
│  └── config.yaml                    # 全局模板配置                    │
│                                                                      │
│  模板选择策略：                                                        │
│  1. 项目级自定义 > 2. 变更类型 > 3. 默认模板                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 全局模板配置

**.driv/templates/config.yaml**：

```yaml
version: "1.0"

proposals:
  default: proposals/default.md
  type_mapping:
    feature: proposals/feature.md
    bugfix: proposals/bugfix.md
    refactor: proposals/refactor.md
    config: proposals/config.md
    docs: proposals/docs.md

designs:
  default: designs/default.md
  type_mapping:
    feature: designs/feature.md
    architecture: designs/architecture.md
    interface: designs/interface.md
    performance: designs/performance.md
    refactor: designs/refactor.md

specs:
  default: specs/default.md
  type_mapping:
    capability: specs/capability.md
    api: specs/api.md
    component: specs/component.md
    service: specs/service.md

reviews:
  requirement: reviews/requirement-review.md
  technical: reviews/technical-review.md
  code: reviews/code-review.md

inheritance:
  enabled: true
  rules:
    - child: designs/feature.md
      parent: designs/default.md
      extends_sections: ['basic_info', 'architecture', 'interfaces']
    - child: specs/api.md
      parent: specs/default.md
      extends_sections: ['metadata', 'versioning']

placeholders:
  system:
    - change_name
    - change_type
    - created_at
    - creator
  user:
    - description
    - background
    - goals
  optional:
    - performance_metrics
    - security_requirements

project_override:
  enabled: true
  search_paths:
    - .driv/templates/custom/
    - .driv/templates/proposals/custom/
    - .driv/templates/designs/custom/
    - .driv/templates/specs/custom/
```

### 6.3 Design 模板（华为研发流程）

#### 6.3.1 默认设计模板

**.driv/templates/designs/default.md**：

```markdown
---
template: design-default
version: 1.0
based_on: 企业研发流程技术方案评审标准
placeholders_required:
  - change_name
  - change_type
  - design_version
  - designer
  - design_date
---

# 技术设计方案：{{change_name}}

## 一、方案概述

### 1.1 基本信息

| 项目 | 内容 |
|------|------|
| 变更名称 | {{change_name}} |
| 变更类型 | {{change_type}} |
| 设计版本 | {{design_version:V1.0}} |
| 设计人 | {{designer}} |
| 设计日期 | {{design_date}} |
| 方案状态 | {{status:初稿/评审中/已批准}} |

### 1.2 方案简介

{{design_summary}}

### 1.3 变更范围

{{change_scope}}

## 二、需求分析

### 2.1 业务需求回顾

{{business_requirements}}

### 2.2 技术需求分析

{{technical_requirements}}

### 2.3 非功能需求

{{non_functional_requirements}}

## 三、总体架构设计

### 3.1 架构原则

{{architecture_principles}}

### 3.2 系统架构图

{{system_architecture}}

### 3.3 模块划分

{{module_division}}

### 3.4 技术选型

{{tech_stack}}

## 四、详细设计

### 4.1 核心流程设计

{{main_flow}}

### 4.2 接口设计

{{api_design}}

### 4.3 数据模型设计

{{data_model}}

### 4.4 状态设计

{{state_design}}

## 五、性能设计

### 5.1 性能目标

{{performance_targets}}

### 5.2 性能优化策略

{{performance_optimization}}

### 5.3 缓存设计

{{cache_design}}

## 六、安全设计

### 6.1 安全需求分析

{{security_analysis}}

### 6.2 认证与授权

{{auth_design}}

### 6.3 数据安全

{{data_security}}

### 6.4 安全审计

{{security_audit}}

## 七、可靠性设计

### 7.1 容错设计

{{fault_tolerance}}

### 7.2 降级与熔断

{{degradation}}

### 7.3 监控告警

{{monitoring}}

## 八、兼容性与扩展性

### 8.1 兼容性设计

{{compatibility}}

### 8.2 扩展性设计

{{extensibility}}

## 九、测试策略

### 9.1 测试范围

{{test_scope}}

### 9.2 测试用例设计

{{test_cases}}

### 9.3 Mock 策略

{{mock_strategy}}

## 十、部署方案

### 10.1 部署架构

{{deployment}}

### 10.2 配置管理

{{configuration}}

### 10.3 发布策略

{{release_strategy}}

## 十一、风险评估

### 11.1 技术风险

{{tech_risks}}

### 11.2 实施风险

{{implementation_risks}}

## 十二、决策记录

### 12.1 关键决策

{{decisions}}

### 12.2 备选方案

{{alternatives}}

## 十三、附录

### 13.1 参考文档

{{references}}

### 13.2 术语定义

{{glossary}}

### 13.3 变更历史

{{change_history}}
```

#### 6.3.2 功能设计模板（简化版）

**.driv/templates/designs/feature.md**：

```markdown
---
template: design-feature
version: 1.0
extends: default
simplified_sections:
  - 去除架构设计详细章节（适用于小功能）
  - 保留核心流程、接口、数据模型
---

# 技术设计方案：{{change_name}}（功能）

## 一、方案概述

### 1.1 基本信息

| 项目 | 内容 |
|------|------|
| 变更名称 | {{change_name}} |
| 变更类型 | feature |
| 设计版本 | V1.0 |
| 设计人 | {{designer}} |
| 设计日期 | {{design_date}} |

### 1.2 方案简介

{{design_summary}}

## 二、需求分析

{{business_requirements}}

## 三、核心流程设计

{{main_flow}}

## 四、接口设计

{{api_design}}

## 五、数据模型

{{data_model}}

## 六、测试策略

{{test_strategy}}

## 七、决策记录

{{decisions}}
```

### 6.4 Spec 模板（华为研发流程）

#### 6.4.1 默认规格模板

**.driv/templates/specs/default.md**：

```markdown
---
template: spec-default
version: 1.0
based_on: 企业研发流程规格说明书标准
placeholders_required:
  - capability_name
  - spec_version
  - spec_owner
---

# 能力规格说明书：{{capability_name}}

## 一、规格概述

### 1.1 基本信息

| 项目 | 内容 |
|------|------|
| 能力名称 | {{capability_name}} |
| 规格版本 | {{spec_version:V1.0}} |
| 规格负责人 | {{spec_owner}} |
| 创建日期 | {{created_at}} |
| 最后更新 | {{last_updated}} |
| 规格状态 | {{status}} |

### 1.2 能力简介

{{capability_summary}}

### 1.3 能力定位

{{capability_positioning}}

## 二、能力详述

### 2.1 能力定义

{{capability_definition}}

### 2.2 能力分解

{{capability_decomposition}}

### 2.3 能力等级

{{capability_levels}}

## 三、接口规格

### 3.1 接口清单

{{interface_list}}

### 3.2 接口详细定义

{{interface_detail}}

### 3.3 接口约束

{{interface_constraints}}

## 四、行为规格

### 4.1 正常行为

{{normal_behavior}}

### 4.2 异常行为

{{exception_behavior}}

### 4.3 边界行为

{{boundary_behavior}}

## 五、质量规格

### 5.1 性能规格

{{performance_spec}}

### 5.2 可用性规格

{{availability_spec}}

### 5.3 可扩展性规格

{{scalability_spec}}

## 六、安全规格

### 6.1 安全要求

{{security_requirements}}

### 6.2 合规要求

{{compliance_requirements}}

## 七、兼容性规格

### 7.1 版本兼容性

{{version_compatibility}}

### 7.2 平台兼容性

{{platform_compatibility}}

### 7.3 数据兼容性

{{data_compatibility}}

## 八、使用约束

### 8.1 使用前置条件

{{preconditions}}

### 8.2 使用限制

{{usage_limits}}

### 8.3 使用建议

{{usage_recommendations}}

## 九、变更管理

### 9.1 变更类型

{{change_types}}

### 9.2 变更流程

{{change_process}}

### 9.3 变更历史

{{change_history}}

## 十、维护支持

### 10.1 维护责任

{{maintenance_responsibility}}

### 10.2 问题处理

{{issue_handling}}

### 10.3 升级策略

{{upgrade_strategy}}

## 十一、附录

### 11.1 相关文档

{{related_docs}}

### 11.2 术语定义

{{glossary}}

### 11.3 FAQ

{{faq}}
```

#### 6.4.2 API 规格模板

**.driv/templates/specs/api.md**：

```markdown
---
template: spec-api
version: 1.0
extends: default
---

# API 规格说明书：{{api_name}}

## 一、API 概述

### 1.1 基本信息

| 项目 | 内容 |
|------|------|
| API 名称 | {{api_name}} |
| API 版本 | {{api_version}} |
| 基础路径 | {{base_path}} |
| 认证方式 | {{auth_method}} |

### 1.2 API 简介

{{api_summary}}

## 二、接口定义

### 2.1 接口列表

{{api_list}}

### 2.2 详细定义

{{api_details}}

## 三、数据模型

### 3.1 请求模型

{{request_models}}

### 3.2 响应模型

{{response_models}}

## 四、调用示例

### 4.1 正常调用

{{normal_calls}}

### 4.2 异常处理

{{exception_handling}}

## 五、最佳实践

{{best_practices}}
```

### 6.5 模板继承机制

#### 6.5.1 继承规则配置

```yaml
inheritance:
  enabled: true
  rules:
    - child: designs/feature.md
      parent: designs/default.md
      strategy: extend
      sections:
        extend:
          - basic_info
          - requirements_analysis
        override:
          - architecture_design
        merge:
          - interface_design
```

#### 6.5.2 继承处理器

```typescript
interface InheritanceRule {
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

class TemplateInheritance {
  process(childTemplate: string, rule: InheritanceRule): string {
    const parentContent = this.loadTemplate(rule.parent);
    const childContent = this.loadTemplate(childTemplate);

    // 合并元数据 + 处理各章节
    // ... 实现逻辑省略
  }
}
```

### 6.6 占位符系统

#### 6.6.1 占位符格式

```markdown
{{placeholder_name}}                  # 简单占位符
{{placeholder_name:default_value}}    # 带默认值
{{placeholder_name:
- 多行
- 默认
- 内容
}}                                    # 多行默认值
```

#### 6.6.2 占位符解析器

```typescript
class PlaceholderParser {
  parse(template: string): Placeholder[] {
    // 正则匹配占位符
    const regex = /\{\{([a-z_0-9]+)(:([^}]+))?\}\}/g;
    // ...
  }

  replace(template: string, values: Record<string, string>): string {
    // 替换占位符
    // ...
  }
}
```

### 6.7 模板管理命令

```markdown
/driv-template list                # 查看所有模板类型
/driv-template list proposals     # 查看 Proposal 模板
/driv-template list designs       # 查看 Design 模板
/driv-template list specs         # 查看 Spec 模板
/driv-template create <type> <name> # 创建自定义模板
/driv-template show <type> <name>   # 查看模板内容
/driv-template validate <type> <name> # 验证模板
/driv-template inheritance <type> <name> # 查看继承关系
```

***

## 七、核心功能模块设计

### 7.1 状态机模块 (State Machine)

```typescript
// 核心状态定义
type Phase = 'clarify' | 'design' | 'build' | 'verify' | 'archive';
type Workflow = 'full';  // 只有完整流程

interface StateTransition {
  from: Phase;
  to: Phase;
  conditions: Condition[];
  actions: Action[];
}

// 状态转换规则
const transitions: StateTransition[] = [
  {
    from: 'clarify',
    to: 'design',
    conditions: [
      { field: 'proposal.md', check: 'exists' },
      { field: 'tasks.md', check: 'exists' },
      { field: 'requirement_review', check: 'passed' } // 企业研发扩展
    ],
    actions: [
      { type: 'run_script', script: 'driv-state.ts transition <name> open-complete' },
      { type: 'update_phase', phase: 'design' }
    ]
  },
  // ... 其他转换规则
];
```

### 7.2 阶段守护模块 (Phase Guard)

```bash
# driv-guard.sh 核心逻辑
#!/bin/bash
set -e

CHANGE_NAME=$1
PHASE=$2
ACTION=${3:-check}

case "$PHASE" in
  open)
    # 检查提案完整性
    check_proposal_completeness "$CHANGE_NAME"
    # 企业研发扩展：检查需求评审
    check_requirement_review "$CHANGE_NAME"
    ;;

  design)
    # 检查设计文档存在
    check_design_doc_exists "$CHANGE_NAME"
    # 检查 handoff 包有效性
    check_handoff_valid "$CHANGE_NAME"
    # 企业研发扩展：检查技术评审
    check_technical_review "$CHANGE_NAME"
    ;;

  build)
    # 检查计划存在
    check_plan_exists "$CHANGE_NAME"
    # 检查工作区隔离
    check_workspace_isolation "$CHANGE_NAME"
    # 检查 TDD 模式合规
    check_tdd_compliance "$CHANGE_NAME"
    ;;

  verify)
    # 检查代码提交
    check_code_committed "$CHANGE_NAME"
    # 检查测试通过
    check_tests_passed "$CHANGE_NAME"
    # 企业研发扩展：检查代码评审
    check_code_review "$CHANGE_NAME"
    ;;

  archive)
    # 检查验证通过
    check_verify_passed "$CHANGE_NAME"
    # 检查文档完整
    check_documentation_complete "$CHANGE_NAME"
    ;;
esac
```

### 7.3 上下文交接模块 (Handoff Manager)

```typescript
// Handoff 包生成器
interface HandoffPackage {
  version: string;
  change: string;
  phase: Phase;
  timestamp: string;

  // 源文件引用
  sources: {
    path: string;
    hash: string;
    role: 'proposal' | 'design' | 'tasks' | 'spec';
  }[];

  // 压缩后的上下文
  context: {
    summary: string;
    decisions: Decision[];
    constraints: Constraint[];
    tasks: TaskSummary[];
  };

  // 验证信息
  verification: {
    total_hash: string;
    signature?: string;
  };
}

// 生成 Handoff 包
async function generateHandoffPackage(
  changeName: string,
  fromPhase: Phase,
  toPhase: Phase,
  options: { compression: 'off' | 'beta' | 'full' }
): Promise<HandoffPackage> {
  // 1. 收集源文件
  const sources = await collectSourceFiles(changeName, fromPhase);

  // 2. 计算哈希
  const sourcesWithHash = await Promise.all(
    sources.map(async (s) => ({
      ...s,
      hash: await computeFileHash(s.path),
    }))
  );

  // 3. 压缩上下文（如果启用）
  const context = options.compression !== 'off'
    ? await compressContext(sourcesWithHash, options.compression)
    : await extractFullContext(sourcesWithHash);

  // 4. 生成验证签名
  const verification = {
    total_hash: computeTotalHash(sourcesWithHash, context),
  };

  return {
    version: '1.0',
    change: changeName,
    phase: toPhase,
    timestamp: new Date().toISOString(),
    sources: sourcesWithHash,
    context,
    verification,
  };
}
```

### 7.4 Clean Code 检查模块（华为标准）

#### 7.4.1 华为 Clean Code 核心原则

华为 Clean Code 标准基于《华为代码规范》和 Clean Code 理念，涵盖六大维度：

```
┌─────────────────────────────────────────────────────────────────────┐
│                 华为 Clean Code 六大维度                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. 命名规范          - 类名 PascalCase，函数/变量 camelCase         │
│     Naming             - 常量 UPPER_SNAKE_CASE                       │
│                       - 命名要有意义，避免缩写                         │
│                                                                      │
│  2. 函数设计        - 单一职责，函数长度 ≤50 行                       │
│     Functions          - 参数数量 ≤5 个                               │
│                       - 圈复杂度 ≤10                                  │
│                                                                      │
│  3. 代码结构       - 类长度 ≤500 行                                   │
│     Structure          - 文件长度 ≤1000 行                            │
│                       - 嵌套深度 ≤4                                   │
│                                                                      │
│  4. 注释规范        - 关键函数必须有注释                              │
│     Comments           - 注释要解释"为什么"而非"是什么"               │
│                       - 避免无意义注释                                │
│                                                                      │
│  5. 错误处理        - 所有异常必须处理                                │
│     Error Handling     - 错误信息要清晰                               │
│                       - 避免空 catch                                  │
│                                                                      │
│  6. 安全规范          - 无硬编码密码/密钥                             │
│     Security           - 输入验证                                    │
│                       - 输出编码                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 7.4.2 Clean Code 模板配置

**.driv/templates/clean-code/config.yaml**：

```yaml
version: "1.0"

templates:
  default: clean-code/huawei-default.yaml
  type_mapping:
    backend: clean-code/huawei-backend.yaml
    frontend: clean-code/huawei-frontend.yaml
    api: clean-code/huawei-api.yaml

profiles:
  strict:      # 严格模式
    score_threshold: 90
    max_iterations: 10
  normal:      # 正常模式（默认）
    score_threshold: 80
    max_iterations: 5
  relaxed:     # 宽松模式
    score_threshold: 70
    max_iterations: 3
```

**.driv/templates/clean-code/huawei-default.yaml**（华为默认模板）：

```yaml
name: huawei-default
version: 1.0
description: 华为 Clean Code 默认检查模板

categories:
  naming:
    weight: 15
    rules:
      - id: class-naming
        name: 类命名规范
        severity: critical
        pattern: "class PascalCase"
      - id: function-naming
        name: 函数命名规范
        severity: critical
        pattern: "function camelCase"
      - id: constant-naming
        name: 常量命名规范
        severity: warning
        pattern: "const UPPER_SNAKE_CASE"

  functions:
    weight: 25
    rules:
      - id: function-length
        name: 函数长度
        severity: critical
        threshold: 50
      - id: parameter-count
        name: 参数数量
        severity: warning
        threshold: 5
      - id: cyclomatic-complexity
        name: 圈复杂度
        severity: critical
        threshold: 10

  structure:
    weight: 20
    rules:
      - id: class-length
        name: 类长度
        severity: warning
        threshold: 500
      - id: nesting-depth
        name: 嵌套深度
        severity: critical
        threshold: 4

  comments:
    weight: 15
    rules:
      - id: public-api-comment
        name: 公开 API 注释
        severity: critical
        require: public_functions

  error_handling:
    weight: 15
    rules:
      - id: no-empty-catch
        name: 禁止空 catch
        severity: critical
      - id: error-message
        name: 错误信息
        severity: warning

  security:
    weight: 20
    rules:
      - id: no-hardcoded-secret
        name: 禁止硬编码密钥
        severity: critical
      - id: input-validation
        name: 输入验证
        severity: critical

scoring:
  passing_threshold: 80
  critical_block_threshold: 60

optimization:
  max_iterations: 5
  auto_fix_enabled: true
  block_on_critical: true
```

#### 7.4.3 循环优化机制

```
Build 完成
    ↓
加载 Clean Code 模板
    ↓
执行六大维度检查
    ↓
计算质量分数 (0-100)
    ↓
  ┌─────────┐
  │ Score ≥ 80? │
  └─────────┘
    │         │
  Yes        No
    │         │
    ↓         ↓
  通过    进入循环优化
            ↓
        ┌─────────────┐
        │ Iteration ≤ 5? │
        └─────────────┘
            │         │
         Yes         No
            │         │
            ↓         ↓
        AI自动修复   生成报告
            ↓         人工介入
        重新检查
            ↓
        Score ≥ 80?
            │
      ┌─────┴─────┐
      │           │
    Yes          No
      │           │
      ↓           ↓
   优化通过    继续循环
   生成报告
```

#### 7.4.4 Clean Code 检查脚本

```bash
#!/bin/bash
# driv-cleancode.sh - 华为 Clean Code 检查脚本

# 参数解析
CODE_PATH="${1:-.}"
TEMPLATE="${2:-default}"
MAX_ITERATIONS=5

# 循环优化
iteration=0
score=0
passed=false

while [[ $iteration -lt $MAX_ITERATIONS && $passed == false ]]; do
  iteration=$((iteration + 1))
  
  # 执行六大维度检查
  check_naming
  check_functions
  check_structure
  check_comments
  check_error_handling
  check_security
  
  # 计算分数
  score=$(calculate_score)
  
  # 判断是否通过
  if [[ $score -ge 80 ]]; then
    passed=true
  else
    # AI 自动修复
    auto_fix_issues
  fi
done

# 生成报告
generate_report "$iteration" "$score" "$passed"
```

***

## 八、OpenCode 集成方案

### 8.1 命令系统设计

```markdown
# driv.md (OpenCode 主命令)

---
description: 企业研发研发流程 AI 辅助开发工具。从需求到归档，五阶段自动化流水线。
---

## 使用方式

`/driv [描述]` - 自动检测当前阶段并继续
`/driv open [描述]` - 创建新变更
`/driv design` - 进入设计阶段
`/driv build` - 进入构建阶段
`/driv verify` - 进入验证阶段
`/driv archive` - 归档当前变更

## 工作流类型

- **full**: 完整五阶段流程（唯一工作流类型）
- 每个变更都必须经过完整的 clarify → design → build → verify → archive 流程
- 深度设计不可跳过，确保每个变更都经过充分的思考和评审

## 企业研发流程集成

自动集成企业研发 IPD 流程：
- 需求评审 (open → design)
- 技术评审 (design → build)
- 代码评审 (build → verify)
```

### 6.2 Skill 文件结构

```text
.driv-skills/
├── driv/
│   ├── SKILL.md                      # 主入口
│   ├── reference/
│   │   ├── auto-transition.md        # 自动流转规则
│   │   ├── driv-yaml-fields.md     # 字段参考
│   │   ├── context-recovery.md       # 上下文恢复
│   │   ├── debug-gate.md             # 调试门禁
│   │   ├── decision-point.md         # 决策点协议
│   │   ├── dirty-worktree.md         # 脏工作区处理
│   │   ├── file-structure.md         # 文件结构
│   │   ├── huawei-review-process.md  # 企业研发评审流程
│   │   ├── clean-code-standards.md   # Clean Code 标准
│   │   └── subagent-dispatch.md      # 子代理调度
│   ├── rules/
│   │   ├── driv-phase-guard.md      # 阶段守护规则
│   │   └── driv-review-check.md    # 评审检查规则
│   └── scripts/
│       ├── driv-env.sh             # 环境变量
│       ├── driv-state.sh           # 状态管理
│       ├── driv-guard.sh           # 守护检查
│       ├── driv-handoff.sh         # 交接包生成
│       ├── driv-archive.sh         # 归档脚本
│       ├── driv-review.sh          # 评审脚本
│       └── driv-validate.sh        # 验证脚本
├── driv-clarify/
│   └── SKILL.md
├── driv-design/
│   └── SKILL.md
├── driv-build/
│   └── SKILL.md
├── driv-verify/
│   └── SKILL.md
└── driv-archive/
    └── SKILL.md
```

### 6.3 OpenCode 命令映射

```typescript
// 为 OpenCode 平台生成命令文件
function generateOpenCodeCommands(skills: string[]): void {
  for (const skill of skills) {
    const commandContent = `---
description: 运行 ${skill} 企业研发研发流程
---

等效 Skill: \`${skill}\`
命令名称: \`/${skill}\`

使用以下调用参数作为此工作流的用户输入：

\`\`\`text
$ARGUMENTS
\`\`\`

${loadSkillContent(skill)}
`;
    writeFile(`commands/${skill}.md`, commandContent);
  }
}
```

***

## 九、核心脚本实现

### 9.1 状态管理脚本 (driv-state.sh)

```bash
#!/bin/bash
# driv-state.sh - 状态文件管理脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/driv-env.sh"

COMMAND=${1:-}
CHANGE_NAME=${2:-}
FIELD=${3:-}
VALUE=${4:-}

case "$COMMAND" in
  check)
    # 检查阶段状态
    check_phase "$CHANGE_NAME" "$FIELD"
    ;;

  get)
    # 获取字段值
    get_field "$CHANGE_NAME" "$FIELD"
    ;;

  set)
    # 设置字段值
    set_field "$CHANGE_NAME" "$FIELD" "$VALUE"
    ;;

  transition)
    # 阶段转换
    transition_phase "$CHANGE_NAME" "$FIELD"
    ;;

  scale)
    # 规模评估
    assess_scale "$CHANGE_NAME"
    ;;

  *)
    echo "Usage: driv-state.sh {check|get|set|transition|scale} <change-name> [field] [value]"
    exit 1
    ;;
esac

# 检查阶段状态
check_phase() {
  local name=$1
  local phase=$2
  local state_file="openspec/changes/$name/.driv.yaml"

  if [[ ! -f "$state_file" ]]; then
    echo "ERROR: State file not found: $state_file"
    exit 1
  fi

  # 验证阶段前置条件
  case "$phase" in
    open)
      check_open_conditions "$name"
      ;;
    design)
      check_design_conditions "$name"
      ;;
    build)
      check_build_conditions "$name"
      ;;
    verify)
      check_verify_conditions "$name"
      ;;
    archive)
      check_archive_conditions "$name"
      ;;
  esac
}

# 获取字段值
get_field() {
  local name=$1
  local field=$2
  local state_file="openspec/changes/$name/.driv.yaml"

  if [[ ! -f "$state_file" ]]; then
    echo "ERROR: State file not found"
    exit 1
  fi

  # 使用 yq 或简单 grep 获取字段
  if command -v yq &> /dev/null; then
    yq ".$field" "$state_file"
  else
    grep "^$field:" "$state_file" | awk '{print $2}'
  fi
}

# 设置字段值
set_field() {
  local name=$1
  local field=$2
  local value=$3
  local state_file="openspec/changes/$name/.driv.yaml"

  # 验证字段有效性
  validate_field "$field"

  # 更新字段
  if command -v yq &> /dev/null; then
    yq -i ".$field = \"$value\"" "$state_file"
  else
    sed -i "s/^$field:.*/$field: $value/" "$state_file"
  fi
}

# 企业研发扩展：检查需求评审
check_requirement_review() {
  local name=$1
  local state_file="openspec/changes/$name/.driv.yaml"

  # 获取企业研发流程配置
  local require_review=$(get_project_config 'gates.requirement_review.enabled')

  if [[ "$require_review" == "true" ]]; then
    local review_status=$(get_field "$name" "hw_process.requirement_review")
    if [[ "$review_status" != "passed" ]]; then
      echo "ERROR: Requirement review not passed"
      exit 1
    fi
  fi
}

# 企业研发扩展：检查技术评审
check_technical_review() {
  local name=$1
  local state_file="openspec/changes/$name/.driv.yaml"

  local require_review=$(get_project_config 'gates.technical_review.enabled')

  if [[ "$require_review" == "true" ]]; then
    local review_status=$(get_field "$name" "hw_process.technical_review")
    if [[ "$review_status" != "passed" ]]; then
      echo "ERROR: Technical review not passed"
      exit 1
    fi
  fi
}
```

### 9.2 评审脚本 (driv-review\.sh)

```bash
#!/bin/bash
# driv-review.sh - 企业研发评审流程脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/driv-env.sh"

COMMAND=${1:-}
CHANGE_NAME=${2:-}
REVIEW_TYPE=${3:-}

case "$COMMAND" in
  create)
    create_review "$CHANGE_NAME" "$REVIEW_TYPE"
    ;;

  submit)
    submit_review "$CHANGE_NAME" "$REVIEW_TYPE"
    ;;

  check)
    check_review_status "$CHANGE_NAME" "$REVIEW_TYPE"
    ;;

  list)
    list_reviews "$CHANGE_NAME"
    ;;

  *)
    echo "Usage: driv-review.sh {create|submit|check|list} <change-name> [review-type]"
    exit 1
    ;;
esac

# 创建评审文档
create_review() {
  local name=$1
  local type=$2
  local review_dir="openspec/changes/$name/reviews"
  local template_dir=".driv/review-templates"

  mkdir -p "$review_dir"

  local template_file="$template_dir/${type}-review.md"
  local output_file="$review_dir/${type}-review.md"

  if [[ -f "$template_file" ]]; then
    # 使用模板创建评审文档
    cp "$template_file" "$output_file"

    # 替换变量
    sed -i "s/{{CHANGE_NAME}}/$name/g" "$output_file"
    sed -i "s/{{DATE}}/$(date +%Y-%m-%d)/g" "$output_file"
    sed -i "s/{{REVIEWER}}/$(git config user.name)/g" "$output_file"

    echo "Created: $output_file"
  else
    echo "ERROR: Template not found: $template_file"
    exit 1
  fi
}

# 提交评审
submit_review() {
  local name=$1
  local type=$2
  local state_file="openspec/changes/$name/.driv.yaml"
  local review_file="openspec/changes/$name/reviews/${type}-review.md"

  # 检查评审文档存在
  if [[ ! -f "$review_file" ]]; then
    echo "ERROR: Review document not found: $review_file"
    exit 1
  fi

  # 执行检查项
  echo "Executing review checklist..."

  # 更新状态
  set_field "$name" "hw_process.${type}_review" "passed"
  set_field "$name" "hw_process.${type}_review_at" "$(date -Iseconds)"

  echo "Review submitted successfully"
}

# 检查评审状态
check_review_status() {
  local name=$1
  local type=$2
  local state_file="openspec/changes/$name/.driv.yaml"

  local status=$(get_field "$name" "hw_process.${type}_review")
  local review_at=$(get_field "$name" "hw_process.${type}_review_at")

  echo "Review Status: $status"
  if [[ -n "$review_at" ]]; then
    echo "Reviewed at: $review_at"
  fi
}
```

### 9.3 Clean Code 检查脚本

```bash
#!/bin/bash
# driv-cleancode.sh - Clean Code 质量检查脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/driv-env.sh"

COMMAND=${1:-}
CHANGE_NAME=${2:-}

case "$COMMAND" in
  check)
    run_clean_code_check "$CHANGE_NAME"
    ;;

  report)
    generate_clean_code_report "$CHANGE_NAME"
    ;;

  *)
    echo "Usage: driv-cleancode.sh {check|report} <change-name>"
    exit 1
    ;;
esac

# 执行 Clean Code 检查
run_clean_code_check() {
  local name=$1
  local plan_file=$(get_field "$name" "plan")
  local base_ref=$(get_field "$name" "base_ref")

  echo "=== Clean Code Quality Check ==="
  echo "Change: $name"
  echo "Base Ref: $base_ref"
  echo ""

  # 获取变更文件
  local changed_files=$(git diff --name-only "$base_ref"...HEAD)

  local issues=0
  local warnings=0
  local suggestions=0

  for file in $changed_files; do
    if [[ "$file" =~ \.(ts|js|py|java|go|rs)$ ]]; then
      echo "Checking: $file"

      # 函数长度检查
      check_function_length "$file"

      # 圈复杂度检查
      check_cyclomatic_complexity "$file"

      # 命名规范检查
      check_naming_convention "$file"

      # 注释质量检查
      check_comment_quality "$file"
    fi
  done

  echo ""
  echo "=== Summary ==="
  echo "Issues: $issues"
  echo "Warnings: $warnings"
  echo "Suggestions: $suggestions"
}

# 检查函数长度
check_function_length() {
  local file=$1
  local max_lines=50

  # 简单实现：检查函数是否超过指定行数
  # 实际实现需要根据语言解析器
  echo "  - Function length check (max: $max_lines lines)"
}

# 检查圈复杂度
check_cyclomatic_complexity() {
  local file=$1
  local max_complexity=10

  echo "  - Cyclomatic complexity check (max: $max_complexity)"
}

# 生成 Clean Code 报告
generate_clean_code_report() {
  local name=$1
  local report_dir="openspec/changes/$name/reports"
  local report_file="$report_dir/clean-code-report.md"

  mkdir -p "$report_dir"

  cat > "$report_file" << EOF
# Clean Code 质量报告

**变更**: $name
**日期**: $(date +%Y-%m-%d)
**检查者**: $(git config user.name)

## 检查结果

### 函数长度
- 状态: 通过
- 最大行数: 50

### 圈复杂度
- 状态: 通过
- 最大值: 10

### 命名规范
- 状态: 通过
- 不符合规范数量: 0

### 注释质量
- 状态: 通过
- 缺失注释: 0

## 建议

[根据检查结果提供建议]

## 结论

质量检查通过，符合 Clean Code 标准。
EOF

  echo "Report generated: $report_file"
}
```

***

## 十、配置系统设计

### 10.1 项目配置文件 (.driv/config.yaml)

```yaml
# 企业研发研发流程配置
version: "1.0"

# 工作流配置
workflow:
  name: full  # 只有完整流程
  description: 完整五阶段流程，确保每个变更都经过充分的设计和评审
  phases: [clarify, design, build, verify, archive]
  mandatory:
    - 所有变更必须经过完整流程
    - 深度设计不可跳过（必须执行 brainstorming）
    - TDD 模式默认启用

# 评审门禁配置
gates:
  requirement_review:
    enabled: true
    phase: clarify
    trigger: before_design
    required_approvals: 1
    auto_check:
      - proposal_exists
      - tasks_defined
      - scope_clear
    template: reviews/requirement-review.md

  technical_review:
    enabled: true
    phase: design
    trigger: before_build
    required_approvals: 1
    auto_check:
      - design_doc_exists
      - architecture_valid
      - interfaces_defined
    template: reviews/technical-review.md

  code_review:
    enabled: true
    phase: build
    trigger: before_verify
    required_approvals: 1
    auto_check:
      - code_committed
      - tests_passed
      - clean_code_passed
    template: reviews/code-review.md

# Clean Code 配置
clean_code:
  enabled: true
  checks:
    - id: naming-convention
      enabled: true
      severity: warning
    - id: function-length
      enabled: true
      severity: suggestion
      max_lines: 50
    - id: cyclomatic-complexity
      enabled: true
      severity: warning
      max_complexity: 10
    - id: code-duplication
      enabled: true
      severity: suggestion
      min_lines: 6
    - id: comment-quality
      enabled: true
      severity: suggestion

# 上下文压缩配置
context_compression: off  # off | beta | full

# 自动流转配置
auto_transition: true

# OpenSpec 集成
openspec:
  enabled: true
  workflows:
    - propose
    - explore
    - new
    - continue
    - apply
    - ff
    - sync
    - archive
    - bulk-archive
    - verify
    - onboard

# Superpowers 集成
superpowers:
  enabled: true
  features:
    - brainstorming
    - writing-plans
    - tdd
    - closing

# OpenCode 平台配置
opencode:
  commands_dir: .driv-commands
  skills_dir: .driv-skills
  hooks_enabled: true
```

### 10.2 评审模板 (review-templates/requirement-review\.md)

```markdown
# 需求评审报告

## 基本信息

| 项目 | 内容 |
|------|------|
| 变更名称 | {{CHANGE_NAME}} |
| 评审日期 | {{DATE}} |
| 评审人 | {{REVIEWER}} |
| 评审类型 | 需求评审 |

## 评审检查项

### 1. 需求描述
- [ ] 需求描述清晰完整
- [ ] 用户故事格式正确
- [ ] 验收标准明确
- [ ] 范围边界清晰

### 2. 可行性分析
- [ ] 技术可行性已评估
- [ ] 资源需求已明确
- [ ] 风险已识别
- [ ] 缓解措施已制定

### 3. 影响范围
- [ ] 涉及模块已识别
- [ ] 接口变更已确认
- [ ] 数据变更已确认
- [ ] 兼容性影响已评估

## 评审结果

| 检查项 | 结果 | 备注 |
|--------|------|------|
| 需求清晰度 | □ 通过 □ 不通过 | |
| 可行性 | □ 通过 □ 不通过 | |
| 风险控制 | □ 通过 □ 不通过 | |
| 文档完整性 | □ 通过 □ 不通过 | |

## 问题清单

| 序号 | 问题描述 | 严重程度 | 状态 | 备注 |
|------|----------|----------|------|------|
| 1 | | □ 高 □ 中 □ 低 | □ 待处理 □ 已解决 | |

## 评审结论

□ 通过
□ 有条件通过（需解决上述问题）
□ 不通过

## 签字确认

评审人签字: ________________ 日期: ________________
```

***

## 十一、实施路线图

### 11.1 阶段划分

```
Phase 1: 核心框架 (2周)
├── 状态机模块
├── 阶段守护模块
├── 基础脚本
└── OpenCode 命令集成

Phase 2: 企业研发流程集成 (2周)
├── 评审门禁系统
├── 评审模板系统
├── 评审脚本
└── Clean Code 检查器

Phase 3: 高级功能 (2周)
├── 上下文交接模块
├── 上下文压缩
├── 子代理调度
└── 自动流转

Phase 4: 测试与优化 (2周)
├── 单元测试
├── 集成测试
├── 文档完善
└── 性能优化
```

### 10.2 技术选型

| 组件     | 技术选型              | 理由                    |
| ------ | ----------------- | --------------------- |
| 运行时    | Node.js 20+       | 与 comet 项目一致，生态成熟     |
| 语言     | TypeScript        | 类型安全，开发体验好            |
| 配置管理   | YAML              | 可读性强，支持注释             |
| 脚本     | Bash + TypeScript | Bash 用于脚本执行，TS 用于复杂逻辑 |
| 状态存储   | YAML 文件           | 简单可靠，版本控制友好           |
| Git 操作 | simple-git        | 成熟的 Git 操作库           |
| 测试框架   | Vitest            | 与 comet 一致            |

***

## 十二、总结

本设计方案基于 comet 项目的优秀实践，针对企业研发研发流程进行深度适配，主要特点：

1. **流程完整性**：覆盖从需求到归档的全生命周期
2. **企业研发流程对接**：无缝集成 IPD 流程的评审节点
3. **Clean Code 实践**：内置代码质量检查
4. **OpenCode 原生支持**：提供完整的命令系统
5. **状态可恢复**：支持中断后继续
6. **自动化程度高**：减少人工干预，提高效率

通过本方案的实施，可以显著提升开发效率和代码质量，同时符合企业研发的研发规范要求。
