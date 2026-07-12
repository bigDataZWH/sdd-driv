# Driv - Clarify 阶段生成完整 OpenSpec 交付件

## Overview
- **Summary**: 将当前在 Design 阶段完成的 OpenSpec 产物创建（specs 目录和设计文档转换）移至 Clarify 阶段完成；Design 阶段仅负责对已有交付件进行详细设计细化。
- **Purpose**: 实现企业研发流程要求：在 Clarify 阶段输出完整的开发设计文档和 OpenSpec 产物，Design 阶段专注于详细设计工作。
- **Target Users**: 企业研发团队使用 Driv 工作流进行变更管理时。

## Goals
- 在 Clarify 阶段生成完整的 OpenSpec 交付件（proposal.md、design.md、specs/、tasks.md）
- 在 Clarify 阶段完成设计文档到 OpenSpec 规格的转换
- Design 阶段仅对已有的 OpenSpec 交付件进行详细设计细化
- 更新阶段守卫规则以反映新的阶段职责划分

## Non-Goals (Out of Scope)
- 修改 OpenSpec 或 Superpowers 的核心功能
- 修改 Clean Code 检查规则
- 修改评审系统的核心逻辑

## Background & Context
当前架构：
- Clarify 阶段：创建 proposal.md 和 design.md
- Design 阶段：创建 specs/ 目录、将设计文档转换为 OpenSpec 格式、生成 handoff 包、完成技术评审

用户要求的新架构：
- Clarify 阶段：创建 proposal.md、design.md、specs/ 目录、tasks.md、完成设计文档转换为 OpenSpec 格式


- Design 阶段：基于已有的 OpenSpec 交付件进行详细设计细化、生成 handoff 包、完成技术评审

## Functional Requirements
- **FR-1**: Clarify 阶段退出时必须包含完整的 OpenSpec 交付件（proposal.md、design.md、specs/ 目录、tasks.md）
- **FR-2**: Clarify 阶段退出时必须完成设计文档到 OpenSpec 规格的转换（design-converted 状态为 true）
- **FR-3**: Design 阶段退出时不再要求创建 specs 和转换设计文档，改为要求完成详细设计细化（detailed-design-completed 状态为 true）
- **FR-4**: 状态机默认状态需反映新的阶段职责划分

## Non-Functional Requirements
- **NFR-1**: 阶段转换必须保持严格顺序（Clarify → Design → Build → Verify → Archive）
- **NFR-2**: 向后兼容性：现有项目应能平滑迁移到新架构

## Constraints
- **Technical**: TypeScript 语言，Node.js 20+
- **Dependencies**: 依赖现有的 DesignToSpecConverter、PhaseGuard、StateMachine 模块

## Assumptions
- 用户理解 Clarify 阶段生成完整交付件的含义：包括 proposal.md、design.md、specs/ 目录、tasks.md 以及设计文档转换
- Design 阶段的 handoff 和技术评审仍然需要完成，作为详细设计的产出

## Acceptance Criteria

### AC-1: Clarify 阶段退出要求完整 OpenSpec 交付件
- **Given**: 项目处于 Clarify 阶段，用户尝试退出到 Design 阶段
- **When**: PhaseGuard.checkExit('clarify', state) 被调用
- **Then**: 验证 state.openspec.proposal、state.openspec.design、state.openspec.specs（非空数组）、state.openspec.tasks 均已设置，且 state.phases.clarify.artifacts['design-converted'] === 'true'
- **Verification**: `programmatic`

### AC-2: Design 阶段退出要求详细设计完成
- **Given**: 项目处于 Design 阶段，用户尝试退出到 Build 阶段
- **When**: PhaseGuard.checkExit('design', state) 被调用
- **Then**: 验证 state.phases.design.artifacts['detailed-design-completed'] === 'true'，且 handoff 和技术评审已完成（保持原有检查），不再检查 specs 和 design-converted
- **Verification**: `programmatic`

### AC-3: 默认状态反映新的阶段职责
- **Given**: 使用 createDefaultState 创建新的变更状态
- **When**: 检查 clarify 和 design 阶段的 artifacts
- **Then**: clarify.artifacts 包含 proposal、design、tasks、specs 和 design-converted；design.artifacts 包含 detailed-design-completed
- **Verification**: `programmatic`

### AC-4: 状态机支持新的阶段职责方法
- **Given**: 需要更新状态以反映阶段进展
- **When**: 调用状态机方法
- **Then**: 支持在 Clarify 阶段设置 specs 和 design-converted，支持在 Design 阶段设置 detailed-design-completed
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要新增 setDetailedDesignCompleted 方法到 StateMachine？
- [ ] Design 阶段是否需要保留 design-converted 状态？
- [ ] tasks.md 是否必须在 Clarify 阶段创建？