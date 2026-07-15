---
description: Run the driv-build OpenCode workflow
---

Equivalent skill: `driv-build`
Command name: `/driv-build`

Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```

实现阶段：检查 design 完成和技术评审通过，创建 implementation plan，使用 TDD 模式执行实现，输出源码文件。

**前置条件**: Design 阶段已完成（phases.design.status == completed），技术评审已通过。

**Input**: Design 阶段完成后的变更上下文（handoff context、design.md、tasks.md、技术评审证据）。

**核心流程**:

1. **前置检查** — 确认 design 完成和技术评审通过
2. **创建实现计划** — 生成详细的实施计划
3. **TDD 模式执行** — 使用 Test-Driven Development 模式逐步实现
4. **产出源码** — 输出前端/后端源码文件

**Steps**:

1. **检查前置条件** — 确认 phases.design.status == completed 且 hwProcess.technicalReview == passed，若未通过则阻塞
2. **选择执行模式** — 配置 buildMode、tddMode、isolation：
   - buildMode: executing-plans（默认）
   - tddMode: tdd（默认，强制使用 TDD 模式）
   - isolation: inline（默认）
3. **创建 implementation plan** — 使用 writing-plans 技能生成实施计划，引用 OpenSpec `proposal.md`、`design.md`、`specs/`、`tasks.md`，输出到 `docs/superpowers/plans/YYYY-MM-DD-<name>.md`
4. **TDD 流程执行** — 按照 TDD 模式进行开发：
   - 编写测试用例（红色）
   - 编写实现代码（绿色）
   - 重构优化（重构）

**⚠️ Decision Point DP-6: 批次确认**
- 每个 task batch 执行前后暂停工作流，向用户展示当前产出件
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

5. **输出源码文件** — 根据 design.md 的技术栈决策生成源码，不预定义固定文件名：
   - 前端项目：按框架约定（React→`src/App.tsx`，Vue→`src/App.vue`，原生→`index.html`/`styles.css`/`app.js`）
   - 后端项目：按语言约定（Node→`src/index.ts`，Python→`src/main.py`，Go→`cmd/main.go`）
   - CLI 工具：`bin/cli.js` + `src/`
6. **更新 .driv.yaml** — 设置 build 阶段状态为 completed
7. **更新 tasks.md** — 勾选 B1-B7 构建阶段任务
8. **输出结果** — 显示生成的文件清单和下一步 `/driv-verify`

**Output**:

- **生成文件**:
  - `docs/superpowers/plans/YYYY-MM-DD-<name>.md` — 实现计划
  - 源码文件 — 路径由 design.md 的技术栈决策驱动
- **修改文件**:
  - `.driv.yaml` — build.status=completed
  - `tasks.md` — B1-B7 勾选
- **状态更新**: phases.build（status/completed、buildMode/tddMode/isolation）
- **下一步**: Build 完成后调用 `/driv-verify` 进入 Verify 阶段

---
Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```
