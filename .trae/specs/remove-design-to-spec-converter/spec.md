# 移除 design-to-spec-converter，由 OpenSpec 原生生成 spec Spec

## Why

当前 `design-to-spec-converter.ts` 是一个孤儿模块：在 `src/` 中无任何文件 import 它，仅被 SKILL.md 文档引用。其产物质量低（大量"待从设计文档中提取"占位符），且与 Clarify 阶段 AI 直接生成 specs 的步骤重复（第 6 步生成 spec，第 10 步又调用 converter 转换，产出冲突）。移除该转换器，由 OpenSpec 原生 `openspec instructions specs` 机制或 AI 直接生成 spec 初稿，可消除冗余、提升 spec 质量、减少维护负担。

## What Changes

- **BREAKING**: 移除 `src/core/design-to-spec-converter.ts` 文件及其 `dist/` 编译产物
- 移除 `StateMachine.setDesignConverted()` 方法
- 移除 `ChangeState.phases.clarify.artifacts['design-converted']` 字段
- 将 Clarify 退出门禁中的 `design-converted` 检查替换为 `specs-generated` 检查（校验 `state.openspec.specs` 为非空数组即可，不再校验"转换"动作）
- 更新 `createDefaultState()` 移除 `design-converted` 字段，保留 `specs` 字段
- 更新 SKILL.md（driv-clarify）和 command 文档（driv-clarify.md）：移除第 10 步"完成设计文档转换"，强化第 6 步"生成 specs"为直接由 AI 基于 OpenSpec 模板生成
- 更新相关测试：移除 `setDesignConverted` 测试，调整 `design-converted` 相关断言

## Impact

- Affected specs: clarify-openspec-deliverables（`design-converted` 概念被移除）
- Affected code:
  - `src/core/design-to-spec-converter.ts`（删除）
  - `src/core/state-machine.ts`（移除 `setDesignConverted` 方法）
  - `src/core/types.ts`（移除 `design-converted` 默认字段）
  - `src/core/phase-guard.ts`（替换 `design-converted` 检查为 `specs` 非空检查）
  - `.opencode/skills/driv-clarify/SKILL.md`（移除第 10 步，强化第 6 步）
  - `.opencode/commands/driv-clarify.md`（同上）
  - `test/state-machine.test.ts`、`test/phase-guard.test.ts`、`test/review-system.test.ts`（调整断言）

## ADDED Requirements

### Requirement: Clarify 阶段由 AI 直接生成 spec 初稿

Clarify 阶段 SHALL 由 AI 直接基于 OpenSpec 模板生成 spec 初稿，而非通过 `design-to-spec-converter` 从 design.md 机械转换。spec 内容 SHALL 包含真实的行为场景描述，而非占位符。

#### Scenario: AI 直接生成 spec
- **WHEN** Clarify 阶段执行第 6 步"生成 specs"
- **THEN** AI 基于 OpenSpec 模板或 `openspec instructions specs` 输出，生成包含行为场景的 spec.md
- **AND** 生成的 spec.md 写入 `openspec/changes/<name>/specs/<capability>/spec.md`
- **AND** 调用 `StateMachine.setSpecsPaths()` 记录 spec 路径数组到 `state.openspec.specs`

#### Scenario: 不再调用 design-to-spec-converter
- **WHEN** Clarify 阶段完成 spec 生成
- **THEN** 不再调用 `design-to-spec-converter` 进行转换
- **AND** 不再调用 `StateMachine.setDesignConverted()` 方法

## MODIFIED Requirements

### Requirement: Clarify 阶段退出门禁

Clarify 阶段退出时 SHALL 校验 `state.openspec.specs` 为非空数组（至少包含一个 spec 路径），不再校验 `design-converted` 状态。

#### Scenario: specs 非空即通过
- **WHEN** `PhaseGuard.checkExit('clarify', state)` 被调用
- **AND** `state.openspec.specs` 为非空数组
- **AND** `state.openspec.proposal`、`state.openspec.design`、`state.openspec.tasks` 均已设置
- **AND** `state.phases.clarify.status === 'completed'`
- **THEN** 校验通过

#### Scenario: specs 为空数组时失败
- **WHEN** `PhaseGuard.checkExit('clarify', state)` 被调用
- **AND** `state.openspec.specs` 为空数组
- **THEN** 校验失败，返回 `specs_not_empty` 失败项

### Requirement: createDefaultState 默认状态

`createDefaultState(changeName)` SHALL 不再在 `clarify.artifacts` 中包含 `design-converted` 字段，保留 `specs` 字段。

#### Scenario: 默认状态不含 design-converted
- **WHEN** 调用 `createDefaultState('test')`
- **THEN** `state.phases.clarify.artifacts` 不包含 `design-converted` 键
- **AND** `state.phases.clarify.artifacts` 包含 `specs` 键
- **AND** `state.openspec.specs` 为空数组 `[]`

## REMOVED Requirements

### Requirement: design-to-spec-converter 转换器

**Reason**: 转换器是孤儿模块（无代码引用），产物为占位符，与 AI 直接生成 spec 重复
**Migration**:
- 删除 `src/core/design-to-spec-converter.ts` 和 `dist/core/design-to-spec-converter.*`
- 移除 `StateMachine.setDesignConverted()` 方法
- 移除 `state.phases.clarify.artifacts['design-converted']` 字段
- SKILL.md 移除"完成设计文档转换"步骤
- Clarify 退出门禁移除 `design-converted` 检查，保留 `specs` 非空检查
