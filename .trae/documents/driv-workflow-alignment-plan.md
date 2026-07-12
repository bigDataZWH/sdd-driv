# Driv 工作流对齐计划

## 需求概述

根据用户描述的完整执行流程，需要对齐各阶段的功能定位：

| 阶段 | 核心职责 |
|------|---------|
| **/driv** | 状态巡检，读取 .driv.yaml 和 openspec/changes/，无 change 时建议启动 /driv-clarify |
| **/driv-clarify** | 需求澄清，通过 openspec-explore 多轮对话，分析存量功能，生成完整 OpenSpec 交付件 |
| **/driv-design** | 设计定型，通过 brainstorming 多轮对话，逐个完善并让用户确认各产物 |
| **/driv-build** | 实现阶段，使用 TDD 模式落地代码实现 |
| **/driv-verify** | 验证阶段，场景验证 + Clean Code + verification-report |
| **/driv-archive** | 归档阶段，归档 + 合并 delta spec |

## 关键问题

当前 `driv-clarify SKILL.md` 与 `phase-guard.ts` 存在矛盾：
- `phase-guard.ts` 的 `checkClarifyExit` 要求：proposal、design、specs、tasks、design-converted 必须全部就绪
- `driv-clarify SKILL.md` 硬性边界规定：只允许生成 proposal.md 和 .openspec.yaml

这导致 Clarify 阶段永远无法通过门禁检查。

## 修改方案

### 1. 修改 driv SKILL.md

增强状态巡检功能：
- 读取 `.driv.yaml` 和 `openspec/changes/`
- 无 active change 时，输出"建议启动 /driv-clarify"
- 有 active change 时，显示当前阶段、阻塞原因和推荐下一步

### 2. 修改 driv-clarify SKILL.md

扩展 Clarify 阶段，支持多轮对话：
- **前置探索**：调用 openspec-explore 进行多轮对话
- **存量分析**：提示用户提供代码仓地址，进行存量功能分析
- **方案输出**：结合用户输入生成完整方案
- **产物生成**：
  - proposal.md（功能提案，包含验收标准）
  - tasks.md（任务清单，跨 5 阶段）
  - specs/<name>.md（能力规格，行为场景）
  - reviews/requirement-review.md（需求评审，AI 预检）
  - .driv.yaml（初始化状态文件）

### 3. 修改 driv-design SKILL.md

聚焦详细设计，支持逐个产物确认：
- **handoff 生成**：生成 handoff-context.json 结构化上下文包
- **brainstorming 多轮对话**：对设计决策进行发散-收敛，记录决策理由
- **逐个产物完善**：依次完善 design.md、更新 tasks.md、准备技术评审
- **用户确认**：每个产物完善后让用户确认
- **技术评审**：生成 reviews/technical-review.md
- **状态更新**：修改 .driv.yaml（design 阶段状态、tasks.md D1-D5 勾选）

### 4. 修改 driv-build SKILL.md

强制 TDD 模式：
- 默认 buildMode: executing-plans
- 默认 tddMode: tdd
- 生成实现计划 docs/superpowers/plans/
- 输出源码文件（index.html、styles.css、app.js）

### 5. 更新命令文档

同步更新以下命令文档：
- `.opencode/commands/driv.md`
- `.opencode/commands/driv-clarify.md`
- `.opencode/commands/driv-design.md`
- `.opencode/commands/driv-build.md`

## 文件清单

| 文件路径 | 修改类型 |
|---------|---------|
| `.opencode/skills/driv/SKILL.md` | 修改 |
| `.opencode/commands/driv.md` | 修改 |
| `.opencode/skills/driv-clarify/SKILL.md` | 修改 |
| `.opencode/commands/driv-clarify.md` | 修改 |
| `.opencode/skills/driv-design/SKILL.md` | 修改 |
| `.opencode/commands/driv-design.md` | 修改 |
| `.opencode/skills/driv-build/SKILL.md` | 修改 |
| `.opencode/commands/driv-build.md` | 修改 |

## 风险评估

- **低风险**：仅修改 SKILL.md 和命令文档，不涉及核心代码逻辑
- **验证方式**：检查文档内容是否与 phase-guard.ts 的门禁要求一致
