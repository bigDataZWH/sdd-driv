# Driv CLI 完善 - 产品需求文档

## Overview
- **Summary**: 完善 Driv CLI 工具，修复已知问题并补充缺失功能，使其与 Comet 功能对齐，同时添加全面的测试用例确保稳定性。
- **Purpose**: 解决 Driv CLI 当前存在的功能缺失问题（OpenSpec 技能名称不匹配、Superpowers 安装缺失、规则/钩子管理缺失等），提升产品质量和用户体验。
- **Target Users**: 企业研发团队、个人开发者使用 Driv 进行 OpenSpec + Superpowers 工作流管理。

## Goals
- 修复 OpenSpec 技能名称不匹配问题，确保 `driv init` 正确识别和安装 OpenSpec 技能
- 添加 Superpowers 安装功能，在 `driv init` 中支持交互式安装选项
- 添加规则（Rules）和钩子（Hooks）管理功能，支持安装、更新、卸载全生命周期
- 改进平台选择策略，移除硬编码限制，支持多平台选择
- 添加工作目录自动创建功能（`docs/superpowers/specs/` 和 `docs/superpowers/plans/`）
- 完善 `driv doctor` 命令，添加脚本检查和规则/钩子检查
- 补充全面的测试用例，覆盖所有核心功能

## Non-Goals (Out of Scope)
- 不修改现有的工作流引擎核心逻辑（state-machine.ts、phase-guard.ts）
- 不添加新的 CLI 命令（除了现有命令的增强）
- 不修改 Clean Code Checker 的评估维度
- 不修改 Review System 的三级审查逻辑

## Background & Context
- Driv 是一个集成 OpenSpec 和 Superpowers 的工作流管理工具，当前版本 v0.1.0
- 通过与 Comet（v0.3.8）对比，发现 Driv 存在多个功能缺失：
  - OpenSpec 技能名称不匹配（`openspec-apply` vs `openspec-apply-change`）
  - Superpowers 安装函数存在但未被调用
  - 缺少规则和钩子管理功能
  - 平台选择硬编码为 `['opencode']`
  - 缺少工作目录自动创建
  - 测试覆盖不完整

## Functional Requirements
- **FR-1**: `driv init` 命令应正确识别和安装 OpenSpec 技能，技能名称与包内实际文件一致
- **FR-2**: `driv init` 命令应支持交互式安装 Superpowers 技能，并返回正确的安装状态
- **FR-3**: `driv init/update/uninstall` 命令应支持规则和钩子的安装、更新、卸载
- **FR-4**: `driv init` 命令应支持多平台选择，移除硬编码的平台限制
- **FR-5**: `driv init` 命令在项目级安装时应自动创建 `docs/superpowers/specs/` 和 `docs/superpowers/plans/` 工作目录
- **FR-6**: `driv doctor` 命令应检查脚本存在性和规则/钩子完整性
- **FR-7**: CodeGraph 安装应避免根目录写入，使用用户目录或项目目录作为 cwd

## Non-Functional Requirements
- **NFR-1**: 所有新增功能必须有对应的单元测试，测试覆盖率 ≥ 80%
- **NFR-2**: CLI 命令执行时间 ≤ 30 秒（不包括网络下载时间）
- **NFR-3**: 支持 Windows、macOS、Linux 三大平台
- **NFR-4**: 错误信息清晰友好，提供明确的修复建议

## Constraints
- **Technical**: Node.js ≥ 20，TypeScript，commander.js，@inquirer/prompts
- **Dependencies**: 与现有项目依赖兼容，不引入新的重量级依赖
- **Backward Compatibility**: 所有修改必须向后兼容，不破坏现有用户的工作目录结构

## Assumptions
- 用户已安装 Node.js ≥ 20
- 用户熟悉基本的 CLI 操作
- OpenSpec 和 Superpowers 技能可通过 `npx skills add` 命令安装

## Acceptance Criteria

### AC-1: OpenSpec 技能名称修复
- **Given**: 用户执行 `driv init` 命令
- **When**: 安装 OpenSpec 技能时
- **Then**: 应使用正确的技能名称（`openspec-propose`, `openspec-explore`, `openspec-apply-change`, `openspec-archive-change`），并成功复制对应文件
- **Verification**: `programmatic`
- **Notes**: 验证包内 `.opencode/skills/` 目录下的技能名称与代码引用一致

### AC-2: Superpowers 安装功能
- **Given**: 用户在交互式模式下执行 `driv init` 命令
- **When**: 系统提示是否安装 Superpowers 时选择 Yes
- **Then**: 应调用 `installSuperpowersForPlatforms` 函数安装 Superpowers，并在输出中显示安装状态
- **Verification**: `programmatic`
- **Notes**: 在非交互式模式下（`--yes` 或 `--json`）应跳过安装提示

### AC-3: 规则和钩子管理
- **Given**: 用户执行 `driv init` 命令
- **When**: 安装 Driv 技能时
- **Then**: 应同时安装规则文件（对于支持规则的平台）和钩子（对于支持钩子的平台）
- **Verification**: `programmatic`
- **Notes**: 规则和钩子的安装状态应在输出中显示

### AC-4: 多平台选择
- **Given**: 用户在交互式模式下执行 `driv init` 命令
- **When**: 系统提示选择平台时
- **Then**: 用户应能选择多个平台（如 OpenCode、Trae、Claude 等），而非仅默认的 opencode
- **Verification**: `human-judgment`
- **Notes**: 测试时验证 CLI 中不再硬编码 `['opencode']`

### AC-5: 工作目录创建
- **Given**: 用户以项目级模式执行 `driv init` 命令
- **When**: 初始化完成后
- **Then**: 项目目录下应存在 `docs/superpowers/specs/` 和 `docs/superpowers/plans/` 目录
- **Verification**: `programmatic`

### AC-6: Doctor 命令增强
- **Given**: 用户执行 `driv doctor` 命令
- **When**: 检查系统状态时
- **Then**: 应检查脚本存在性、规则完整性、钩子完整性，并在结果中显示
- **Verification**: `programmatic`

### AC-7: CodeGraph 安装权限问题修复
- **Given**: 用户在 Windows 系统上执行 `driv init` 命令
- **When**: 选择安装 CodeGraph 时
- **Then**: 应使用用户目录或项目目录作为 cwd，避免在根目录创建文件导致权限错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要支持规则和钩子的单独管理命令（如 `driv rules install`）？
- [ ] 是否需要添加更多平台的规则和钩子支持？
- [ ] 是否需要添加技能升级检测功能？

## Quality Checklist
- [x] 每个目标至少有一个验收标准
- [x] 每个验收标准都有验证类型
- [x] 非目标已明确声明
- [x] 约束条件真实且完整
- [x] 没有需求相互矛盾
- [x] 模糊的用户语言已澄清或标记