---
description: Run the driv-design OpenCode workflow
---

Equivalent skill: `driv-design`
Command name: `/driv-design`

设计定型：基于 Clarify 阶段的 PRD，通过 brainstorming 生成全套 OpenSpec 交付件。

**前置条件**: Clarify 阶段已完成，`prd.md`、`.openspec.yaml`、`.driv.yaml` 已就绪。

**Input**: Clarify 阶段完成后的 PRD 和变更上下文。

**Steps**:

1. **读取 PRD** — 读取 `openspec/changes/<name>/prd.md`，作为设计输入
2. **生成 handoff-context.json** — 调用 HandoffManager 的 `generate()`，产出结构化上下文包

**⚠️ Decision Point DP-5: 契约确认**

3. **调用 brainstorming** — 对设计关键决策进行发散-收敛（架构/接口/数据流/DOM/技术选型）
4. **生成 proposal.md** — 基于 PRD + brainstorming，使用 `.driv/templates/proposals/default.md` 模板，包含 `## Intent` 章节

**⚠️ Decision Point DP-1: 提案确认**

5. **生成 specs/<capability>/spec.md** — 基于设计决策生成行为规格（GIVEN/WHEN/THEN）

**⚠️ Decision Point DP-2: 规格确认**

6. **生成 tasks.md** — 任务清单（跨 5 阶段，约 22 项）

**⚠️ Decision Point DP-4: 任务确认**

7. **生成 design.md** — 完整设计文档（FSM/接口/数据流/DOM）

**⚠️ Decision Point DP-3: 设计确认**

8. **生成 reviews/requirement-review.md** — 需求评审（AI 预检）
9. **生成 reviews/technical-review.md** — 技术评审（AI 预检）
10. **更新 .driv.yaml** — 设置 design 阶段状态为 completed
11. **输出结果** — 显示生成的文件清单和下一步 `/driv-build`

**Output**:

- **生成文件**: handoff.json、brainstorming.md、proposal.md、design.md、tasks.md、specs/、reviews/requirement-review.md、reviews/technical-review.md
- **状态更新**: phases.design（status/completed、artifacts/proposal/design/tasks/specs/design-converted/detailed-design-completed/handoff/brainstorming）
- **下一步**: Design 完成后调用 `/driv-build` 进入 Build 阶段

---
Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```
