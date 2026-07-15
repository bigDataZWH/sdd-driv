---
name: driv-design
description: 设计定型 - 通过 brainstorming 多轮对话，逐个完善并确认各产物
---

设计定型：基于 Clarify 阶段的 OpenSpec 交付件，通过 brainstorming 多轮对话进行设计决策的发散-收敛，逐个完善并让用户确认各产物。

**前置条件**: Clarify 阶段已完成，`proposal.md`、`tasks.md`、`specs/`、`reviews/requirement-review.md`、`.openspec.yaml`、`.driv.yaml` 已就绪。

**Input**: Clarify 阶段完成后的变更上下文（所有 OpenSpec 交付件）。

**核心流程**:

1. **handoff 生成** — 生成结构化上下文包
2. **brainstorming 多轮对话** — 对设计决策进行发散-收敛
3. **逐个产物完善** — 依次完善 design.md、更新 tasks.md、准备技术评审
4. **用户确认** — 每个产物完善后让用户确认

**Steps**:

1. **生成 handoff-context.json** — 调用 HandoffManager 的 `generate()`，传入 compression 策略（默认 `concise`），产出结构化的上下文包，包含 proposal/design/tasks/reviews 摘要。**Handoff 包由 HandoffManager 脚本生成，agent 不得自行编写摘要。** 输出到 `openspec/changes/<name>/.driv/handoff/handoff.json` 与 `handoff.md`

**⚠️ Decision Point DP-5: 契约确认**
- 暂停工作流，向用户展示当前产出件
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

2. **调用 brainstorming** — 加载 brainstorming skill 作为流程约束，对设计关键决策进行发散-收敛，记录决策理由：
   - 架构选择（FSM/状态机设计）
   - 接口设计
   - 数据流设计
   - DOM 结构设计
   - 技术选型确认
   - 性能优化策略
3. **生成 design.md** — 将 brainstorming 输出和 handoff 摘要写入 `openspec/changes/<name>/design.md`，在 Clarify 阶段初稿基础上**完善**（补充 FSM/接口/数据流/DOM 等详细设计要素），非重新生成。design.md 在 Clarify 阶段为初稿（用于转 specs/），在 Design 阶段为定稿。

**⚠️ Decision Point DP-3: 设计确认**
- 暂停工作流，向用户展示当前产出件
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

4. **用户确认 design.md** — 展示生成的设计文档，让用户确认是否满意，如有修改需求进行迭代
5. **更新 tasks.md** — 根据设计决策拆分具体实现任务，勾选 D1-D5 设计阶段任务
6. **用户确认 tasks.md** — 展示更新后的任务清单，让用户确认是否完整
7. **准备技术评审** — 收集 design.md、handoff 上下文、brainstorming 记录，作为技术评审证据，使用 ReviewSystem 创建技术评审
8. **生成 reviews/technical-review.md** — 技术评审（AI 预检）
9. **用户确认技术评审** — 展示技术评审结果，让用户确认是否通过
10. **更新 .driv.yaml** — 设置 design 阶段状态为 completed，记录 detailed-design-completed
11. **输出结果** — 显示生成的文件清单和下一步 `/driv-build`

**Output**:

- **生成文件**:
  - `openspec/changes/<name>/.driv/handoff/handoff.json` — 结构化上下文包（由 HandoffManager 脚本生成）
  - `openspec/changes/<name>/.driv/handoff/handoff.md` — 可读上下文包
  - `openspec/changes/<name>/brainstorming.md` — 设计决策发散-收敛记录
  - `openspec/changes/<name>/design.md` — 完整设计文档（FSM/接口/数据流/DOM）
  - `openspec/changes/<name>/reviews/technical-review.md` — 技术评审（AI 预检）
- **修改文件**:
  - `.driv.yaml` — design 阶段状态、tasks.md D1-D5 勾选、superpowers.brainstorming 路径
- **状态更新**: phases.design（status/completed、artifacts/handoff/detailed-design-completed/brainstorming、superpowers.brainstorming）
- **下一步**: Design 完成后调用 `/driv-build` 进入 Build 阶段

---
Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```
