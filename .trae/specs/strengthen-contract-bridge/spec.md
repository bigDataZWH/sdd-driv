# 强化契约桥接（Strengthen Contract Bridge）Spec

## Why

Driv 当前的 OpenSpec→Superpowers 桥接层停留在"文件级 + YAML 字段级"检测：`PhaseGuard.validateHandoffHash()` 恒返回 `true`、`DecisionPoint.require()` 永远返回 `confirmed: true` 且全代码库无调用方、`DebugGate.enforce()` 返回值在 verify-service.ts L225 被丢弃。三个占位符让"内容级状态检测、意图锁、Decision Point、Bug 侧路径"这四项强契约能力空转。HandoffManager 已具备 SHA-256 哈希基础设施（HashUtils + validate()），但 PhaseGuard 不消费它。本 spec 将这四项能力从占位骨架激活为真实执行逻辑，把 Driv 从"带哈希基础设施的 Comet"升级为"强契约桥接"工作流。

## What Changes

### 支柱 1：激活内容级状态检测
- 将 `PhaseGuard.validateHandoffHash()` 从 `return true` 改为调用 `HandoffManager.validate()` 重新计算 sources 哈希并比对
- build entry 检查在哈希不匹配时返回 `error` 级失败（当前为 `warning`），并输出变更文件名
- 将 `DirtyWorktreeChecker` 占位（恒返回 `dirty: false`）替换为真实 git diff 检测

### 支柱 2：引入意图锁（Intent Lock）
- 在 `HandoffPackage.context` 中新增 `intent: string` 字段（一句话锁定本次变更核心意图）
- 在 `HandoffPackage.context` 中新增 `acceptanceCriteria: string[]` 字段（结构化验收标准）
- `HandoffManager.buildContext()` 从 proposal.md 的 `## Intent` / `## 目标` 章节抽取 intent
- `HandoffManager.buildContext()` 从 tasks.md 抽取结构化验收标准
- build entry 校验当前 design.md 是否仍包含 intent 关键词
- 更新 Clarify SKILL.md 要求 proposal.md 包含 `## Intent` 章节

### 支柱 3：激活 Decision Point（8 个确认点）
- 将 `DecisionPoint.require()` 从占位（永远 `confirmed: true`）改为真实暂停机制
- 在 8 个关键节点接入 DP 调用：DP-0 需求确认、DP-1 提案确认、DP-2 规格确认、DP-3 设计确认、DP-4 任务确认、DP-5 契约确认、DP-6 批次确认、DP-7 收尾确认
- 更新 SKILL.md 文件文档化 DP 暂停行为（AI 必须暂停等待用户确认）

### 支柱 4：激活 Bug-Investigator 侧路径
- 修复 `verify-service.ts` L224-226 丢弃 `DebugGate.enforce()` 返回值的问题
- `DebugGate.enforce()` 返回 `enforced: true` 时，verify 流程暂停并提示切换到 investigate 子流程
- investigate 完成后才能恢复 verify

## Impact

- **Affected specs**: 无既有 spec 受影响（这是新增能力）
- **Affected code**:
  - `src/core/phase-guard.ts` — validateHandoffHash、DirtyWorktreeChecker、build entry
  - `src/core/handoff-manager.ts` — CompressedContext 结构、buildContext、generate
  - `src/core/decision-point.ts` — require 方法重写
  - `src/core/debug-gate.ts` — enforce 方法重写
  - `src/core/verify-service.ts` — 消费 enforce 返回值
  - `src/core/build-orchestrator.ts` — DP-5 契约确认接入
  - `src/core/types.ts` — CompressedContext 类型扩展（若类型在此定义）
  - `.opencode/skills/driv-clarify/SKILL.md` — Intent 章节要求、DP-0/1/2/4
  - `.opencode/skills/driv-design/SKILL.md` — DP-3/DP-5 接入
  - `.opencode/skills/driv-build/SKILL.md` — DP-6 接入
  - `.opencode/skills/driv-verify/SKILL.md` — DP-7 接入、DebugGate 侧路径
  - `.opencode/commands/driv-*.md` — 对应命令文档同步

## ADDED Requirements

### Requirement: 内容级 Handoff 哈希校验
The system SHALL validate handoff package integrity by recomputing SHA-256 hashes of all source files at build entry, and SHALL block build phase transition when any source file hash mismatches the handoff package.

#### Scenario: 规划文档在 handoff 签署后被修改
- **WHEN** handoff 包已生成，但 proposal.md/design.md/tasks.md 中任一文件内容随后被修改
- **AND** 用户尝试进入 build 阶段
- **THEN** PhaseGuard.checkBuildEntry 返回 `error` 级失败（非 warning）
- **AND** 失败信息包含哪个文件哈希不匹配
- **AND** build 阶段被阻止，直到 handoff 重新生成

#### Scenario: handoff 哈希全部匹配
- **WHEN** handoff 包已生成且所有源文件未被修改
- **AND** 用户尝试进入 build 阶段
- **THEN** hash 校验通过，build entry 检查继续

### Requirement: 脏工作区检测
The system SHALL detect uncommitted changes in the git worktree at build entry and SHALL report them as failures.

#### Scenario: 工作区有未提交变更
- **WHEN** git worktree 存在未提交变更
- **AND** 用户尝试进入 build 阶段
- **THEN** PhaseGuard 返回 `warning` 级失败，提示提交或 stash 变更

### Requirement: 意图锁（Intent Lock）
The system SHALL capture a one-sentence intent statement from proposal.md during handoff generation, store it in `handoff.context.intent`, and SHALL validate at build entry that the current design.md still aligns with this intent.

#### Scenario: proposal.md 包含 Intent 章节
- **WHEN** HandoffManager.generate() 执行
- **AND** proposal.md 包含 `## Intent` 或 `## 目标` 章节
- **THEN** handoff.context.intent 被填充为该章节的一句话摘要

#### Scenario: proposal.md 缺少 Intent 章节
- **WHEN** HandoffManager.generate() 执行
- **AND** proposal.md 不包含 `## Intent` 或 `## 目标` 章节
- **THEN** handoff.context.intent 为空字符串
- **AND** Clarify 阶段 SKILL.md 要求 AI 必须在 proposal.md 中写入 Intent 章节

#### Scenario: design.md 偏离意图
- **WHEN** build entry 检查执行
- **AND** handoff.context.intent 非空
- **AND** design.md 内容不包含 intent 的关键词
- **THEN** PhaseGuard 返回 `warning` 级失败，提示设计可能偏离原始意图

### Requirement: 结构化验收标准（Acceptance Criteria）
The system SHALL extract acceptance criteria from tasks.md during handoff generation and store them in `handoff.context.acceptanceCriteria`.

#### Scenario: tasks.md 包含验收标准
- **WHEN** HandoffManager.generate() 执行
- **AND** tasks.md 的 task 条目包含验收标准描述
- **THEN** handoff.context.acceptanceCriteria 被填充为字符串数组

### Requirement: Decision Point 暂停机制
The system SHALL provide 8 Decision Points (DP-0 through DP-7) that pause workflow progression and require user confirmation before proceeding.

#### Scenario: DP 触发时暂停
- **WHEN** 工作流到达任一 DP 节点
- **THEN** DecisionPoint.require() 被调用
- **AND** 工作流暂停，等待用户确认
- **AND** 用户未确认前不进入下一阶段

#### Scenario: 用户拒绝确认
- **WHEN** DecisionPoint.require() 返回 `confirmed: false`
- **THEN** 工作流不进入下一阶段
- **AND** 返回当前阶段供用户修改

### Requirement: Bug-Investigator 侧路径
The system SHALL block verify phase completion on failure and SHALL require investigate sub-flow before resuming.

#### Scenario: verify 失败触发 DebugGate
- **WHEN** verify 阶段结果为 `fail`
- **THEN** DebugGate.enforce() 返回 `enforced: true`
- **AND** verify-service.ts 消费该返回值，暂停 verify 流程
- **AND** 提示用户使用 investigate 子流程进行系统化调试

#### Scenario: investigate 完成后恢复
- **WHEN** investigate 子流程完成
- **THEN** 用户可重新触发 verify 流程

## MODIFIED Requirements

### Requirement: PhaseGuard build entry 检查
PhaseGuard.checkBuildEntry SHALL call HandoffManager.validate() to recompute source file hashes and SHALL treat hash mismatch as `error` level failure (previously `warning` and always passed due to placeholder returning true).

### Requirement: HandoffManager.buildContext
HandoffManager.buildContext SHALL extract intent from proposal.md `## Intent`/`## 目标` section and acceptance criteria from tasks.md, in addition to existing summary/decisions/constraints/tasks/reviews extraction.

### Requirement: DecisionPoint.require
DecisionPoint.require SHALL NOT return `confirmed: true` by default. It SHALL pause and require real user confirmation (via AskUserQuestion in platform mode, or printed prompt + wait in CLI mode).

### Requirement: DebugGate.enforce
DebugGate.enforce return value SHALL be consumed by verify-service.ts. When `enforced: true`, verify flow SHALL pause and switch to investigate sub-flow.

## REMOVED Requirements
无移除项。
