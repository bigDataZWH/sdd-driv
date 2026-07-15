---
name: driv-design
description: 设计定型 - 基于 PRD 生成全套 OpenSpec 交付件与详细技术设计
---

设计定型：基于 Clarify 阶段的 PRD，通过 brainstorming 进行设计决策发散-收敛，依次生成 proposal → specs → tasks → design.md，最终完成技术评审并签署 handoff 契约。

**前置条件**: Clarify 阶段已完成，`prd.md`、`.openspec.yaml`、`.driv.yaml` 已就绪，`phases.clarify.status = completed`。

**Input**: Clarify 阶段产出的 PRD（产品需求文档）。

**核心链路**: `PRD → brainstorming → proposal → specs → tasks → design.md → technical-review → handoff`

**Steps**:

1. **加载 PRD** — 读取 `openspec/changes/<name>/prd.md`，提取以下关键信息作为后续设计的输入：
   - 业务目标与量化指标（SMART）
   - 功能需求清单（FR，带 P0/P1/P2 优先级）
   - 非功能需求（性能/安全/可用性/可维护性/兼容性）
   - 约束与依赖
   - 验收标准（Given-When-Then）

2. **调用 brainstorming** — 加载 brainstorming skill 对设计关键决策进行发散-收敛，**必须覆盖以下维度**：
   - 架构模式选择（FSM/事件驱动/分层/微服务等）
   - 模块划分与职责边界
   - 接口设计（REST/GraphQL/RPC，签名与错误码）
   - 数据模型设计（实体、关系、索引）
   - 状态机设计（若涉及流程编排）
   - 技术选型确认（框架、存储、中间件）
   - 性能优化策略（缓存、批处理、异步）
   - 安全设计（认证、授权、加密）
   - 记录每个决策的**备选方案**与**选择理由**

3. **生成 proposal.md** — 基于 PRD 和 brainstorming 输出，**必须读取 `.driv/templates/proposals/default.md` 模板**作为结构骨架。proposal.md 是 OpenSpec 的核心提案文档，必须包含：
   - `## Intent` — 一句话锁定本次变更核心意图（作为 Intent Lock，Build 阶段会校验）
   - `## Why` — 变更背景与业务价值
   - `## What Changes` — 变更内容清单
   - `## Impact` — 影响范围分析
   - PhaseGuard 的 `checkDesignEntry` 会校验 `openspec.prd`，`checkDesignExit` 会校验 `openspec.proposal` 已设置

**⚠️ Decision Point DP-1: 提案确认**
- 暂停工作流，向用户展示 proposal.md
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

4. **生成 specs/** — 将 proposal 中的能力转化为 OpenSpec delta spec：
   - 在 `openspec/changes/<name>/specs/<capability>/spec.md` 中定义每个能力
   - 采用 `## ADDED Requirements` / `## MODIFIED Requirements` / `## SUPERSEDE` 标记变更类型
   - 需求条目使用 EARS 语法（`WHEN <trigger> THE SYSTEM SHALL <response>`）
   - 支持在 frontmatter 设置 `driv_merge: append|update|supersede` 控制 Archive 合并策略
   - PhaseGuard 的 `checkDesignExit` 会校验 `openspec.specs` 数组非空

**⚠️ Decision Point DP-2: 规格确认**
- 暂停工作流，向用户展示 specs/
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

5. **生成 tasks.md** — 根据设计决策拆分具体实现任务：
   - 按 Design 阶段（D1-D5）和 Build 阶段（B1-B7）划分任务
   - 每个任务包含验收条件、依赖关系、预估工作量
   - 标注 P0/P1/P2 优先级，确保 P0 任务先执行
   - PhaseGuard 的 `checkDesignExit` 会校验 `openspec.tasks` 已设置

**⚠️ Decision Point DP-4: 任务确认**
- 暂停工作流，向用户展示 tasks.md
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

6. **生成 design.md** — 将 brainstorming 输出和详细设计写入 `openspec/changes/<name>/design.md`，**必须读取 `.driv/templates/designs/default.md` 模板**作为结构骨架。design.md 必须包含以下华为规范章节：
   - `## 方案概述` — 基本信息、方案简介、变更范围
   - `## 总体架构设计` — 架构原则、系统架构图、模块划分、技术选型
   - `## 详细设计` — 核心流程、接口设计、数据模型、状态设计
   - `## 决策记录` — 关键决策与备选方案（**双语标题：`## 决策记录` / `## Decisions` 均可**，HandoffManager 会自动识别）
   - `## 约束` — 技术约束与限制条件（**双语标题：`## 约束` / `## Constraints` 均可**）
   - design.md 还应包含 **PRD 验收标准反向追溯表**：每个 FR 对应 design.md 的哪个章节实现

**⚠️ Decision Point DP-3: 设计确认**
- 暂停工作流，向用户展示 design.md
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

7. **设置 design-converted 状态** — design.md 定稿后，调用 `stateMachine.setDesignConverted(changeName, true)` 标记设计转换完成。PhaseGuard 的 `checkDesignExit` 会校验 `phases.design.artifacts['design-converted'] === 'true'`

8. **准备技术评审** — 收集 design.md、proposal.md、specs/、tasks.md、brainstorming 记录作为技术评审证据，使用 ReviewSystem 创建技术评审

9. **生成 reviews/technical-review.md** — 技术评审（AI 预检），检查：
   - 架构合理性
   - 接口一致性
   - 数据模型完整性
   - 非功能需求可达性
   - 风险识别充分性
   - PhaseGuard 的 `checkDesignExit` 会校验 `hwProcess.technicalReview === 'passed'`

10. **用户确认技术评审** — 展示技术评审结果，让用户确认是否通过。通过后调用 `stateMachine.setField(name, 'hwProcess.technicalReview', 'passed')`

11. **生成 handoff 契约** — 调用 HandoffManager 的 `generate()`，传入 compression 策略（**可选值：`off`/`beta`/`full`**，默认 `off`），产出结构化上下文包：
    - 输出到 `openspec/changes/<name>/.driv/handoff/handoff.json` 与 `handoff.md`
    - 包含 proposal/design/tasks/specs/reviews 摘要与 SHA-256 校验
    - **Handoff 包由 HandoffManager 脚本生成，agent 不得自行编写摘要**
    - PhaseGuard 的 `checkDesignExit` 会校验 `phases.design.artifacts.handoff` 已设置

**⚠️ Decision Point DP-5: 契约确认**
- 暂停工作流，向用户展示 handoff 包
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

12. **更新 .driv.yaml** — 设置 design 阶段状态为 completed，记录 `detailed-design-completed`、`brainstorming` 路径

13. **输出结果** — 显示生成的文件清单和下一步 `/driv-build`

**Decision Points 顺序**: DP-1（提案）→ DP-2（规格）→ DP-4（任务）→ DP-3（设计）→ 技术评审 → DP-5（契约）

**Output**:

- **生成文件**:
  - `openspec/changes/<name>/brainstorming.md` — 设计决策发散-收敛记录
  - `openspec/changes/<name>/proposal.md` — OpenSpec 提案（含 Intent Lock）
  - `openspec/changes/<name>/specs/<capability>/spec.md` — OpenSpec delta specs
  - `openspec/changes/<name>/tasks.md` — 实现任务清单（D1-D5 + B1-B7）
  - `openspec/changes/<name>/design.md` — 华为规范技术设计文档
  - `openspec/changes/<name>/reviews/technical-review.md` — 技术评审（AI 预检）
  - `openspec/changes/<name>/.driv/handoff/handoff.json` — 结构化上下文包
  - `openspec/changes/<name>/.driv/handoff/handoff.md` — 可读上下文包
- **修改文件**:
  - `.driv.yaml` — design 阶段状态、design-converted、brainstorming 路径、handoff 路径
- **状态更新**: phases.design（status/completed、artifacts/proposal/design/tasks/specs/design-converted/detailed-design-completed/brainstorming/handoff）
- **下一步**: Design 完成后调用 `/driv-build` 进入 Build 阶段

---
Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```
