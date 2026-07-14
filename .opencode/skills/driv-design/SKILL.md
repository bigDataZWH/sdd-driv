---
name: driv-design
description: 设计定型 - 基于 PRD 通过 brainstorming 生成全套 OpenSpec 交付件
---

设计定型：基于 Clarify 阶段的 PRD，通过 brainstorming 多轮对话进行设计决策的发散-收敛，生成全套 OpenSpec 交付件（proposal.md、design.md、tasks.md、specs/）并让用户逐个确认。

**前置条件**: Clarify 阶段已完成，`prd.md`、`.openspec.yaml`、`.driv.yaml` 已就绪。

**Input**: Clarify 阶段完成后的 PRD 和变更上下文。

**核心流程**:

1. **handoff 生成** — 基于 PRD 生成结构化上下文包
2. **brainstorming 多轮对话** — 对设计决策进行发散-收敛
3. **OpenSpec 交付件生成** — 基于 PRD + brainstorming 生成 proposal.md、specs/、tasks.md
4. **设计定稿** — 生成 design.md 定稿，完成技术评审
5. **用户确认** — 每个产物生成后让用户确认

**Steps**:

1. **读取 PRD** — 读取 `openspec/changes/<name>/prd.md`，作为设计输入

2. **生成 handoff-context.json** — 调用 HandoffManager 的 `generate()`，传入 compression 策略（默认 `concise`），产出结构化的上下文包，包含 PRD 摘要

**⚠️ Decision Point DP-5: 契约确认**
- 暂停工作流，向用户展示当前产出件
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

3. **调用 brainstorming** — 加载 brainstorming skill 作为流程约束，对设计关键决策进行发散-收敛，记录决策理由：
   - 架构选择（FSM/状态机设计）
   - 接口设计
   - 数据流设计
   - DOM 结构设计
   - 技术选型确认
   - 性能优化策略

4. **生成 proposal.md** — **必须读取 `.driv/templates/proposals/default.md` 模板作为结构骨架**，基于 PRD + brainstorming 结果生成，包含以下必填章节：
   - `## 背景与问题` — 当前问题与业务价值
   - `## 目标与非目标` — 明确范围内/范围外
   - `## 变更范围` — 受影响对象与代码范围
   - `## 验收标准` — 可验证的验收条件（至少 8 条）
   - **必须包含 `## Intent` 章节** — 一句话锁定本次变更核心意图。该意图将在 Design→Build 边界作为意图锁（Intent Lock）用于 design.md 对齐校验。

**⚠️ Decision Point DP-1: 提案确认**
- 暂停工作流，向用户展示当前产出件
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

5. **生成 specs/<capability>/spec.md** — 能力规格（行为场景描述），**必须参考 `.driv/templates/specs/default.md` 模板结构**，基于设计决策生成行为规格（GIVEN/WHEN/THEN）

**⚠️ Decision Point DP-2: 规格确认**
- 暂停工作流，向用户展示当前产出件
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

6. **生成 tasks.md** — 任务清单（跨 5 阶段，约 22 项），**建议参考 `.driv/templates/` 下的任务清单结构**，每项任务需可验证

**⚠️ Decision Point DP-4: 任务确认**
- 暂停工作流，向用户展示当前产出件
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

7. **生成 design.md** — 将 brainstorming 输出和 handoff 摘要写入 `openspec/changes/<name>/design.md`，包含架构、数据流、组件树等核心设计要素

**⚠️ Decision Point DP-3: 设计确认**
- 暂停工作流，向用户展示当前产出件
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

8. **生成 reviews/requirement-review.md** — 需求评审（AI 预检）
9. **生成 reviews/technical-review.md** — 技术评审（AI 预检）
10. **用户确认技术评审** — 展示技术评审结果，让用户确认是否通过
11. **更新 .driv.yaml** — 设置 design 阶段状态为 completed，记录 detailed-design-completed 和 design-converted
12. **输出结果** — 显示生成的文件清单和下一步 `/driv-build`

**Output**:

- **生成文件**:
  - `openspec/changes/<name>/.driv/handoff/handoff.json` — 结构化上下文包
  - `openspec/changes/<name>/.driv/handoff/handoff.md` — 可读上下文包
  - `openspec/changes/<name>/brainstorming.md` — 设计决策发散-收敛记录
  - `openspec/changes/<name>/proposal.md` — 变更提案（包含验收标准和 Intent Lock）
  - `openspec/changes/<name>/design.md` — 完整设计文档（FSM/接口/数据流/DOM）
  - `openspec/changes/<name>/tasks.md` — 任务清单（跨 5 阶段）
  - `openspec/changes/<name>/specs/<capability>/spec.md` — 能力规格（行为场景）
  - `openspec/changes/<name>/reviews/requirement-review.md` — 需求评审
  - `openspec/changes/<name>/reviews/technical-review.md` — 技术评审
- **修改文件**:
  - `.driv.yaml` — design 阶段状态、design-converted、detailed-design-completed、brainstorming 路径
- **状态更新**: phases.design（status/completed、artifacts/proposal/design/tasks/specs/design-converted/detailed-design-completed/handoff/brainstorming）
- **下一步**: Design 完成后调用 `/driv-build` 进入 Build 阶段

---
Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```
