# Driv CLI 完善 - 实施计划

## [x] Task 1: 修复 OpenSpec 技能名称不匹配问题
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 `src/commands/init.ts` 中 OpenSpec 技能名称，将 `openspec-apply` 改为 `openspec-apply-change`，`openspec-archive` 改为 `openspec-archive-change`
  - 确保代码引用的技能名称与包内 `.opencode/skills/` 目录下的实际文件一致
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 测试 `installDrivSkills` 函数能正确复制所有 OpenSpec 技能文件
  - `programmatic` TR-1.2: 测试 `createOpenCodeCommands` 函数能为所有 OpenSpec 技能创建命令文件
- **Notes**: 包内实际技能名称为 `openspec-propose`, `openspec-explore`, `openspec-apply-change`, `openspec-archive-change`

## [x] Task 2: 添加 Superpowers 安装功能
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在 `src/commands/init.ts` 中导入并调用 `installSuperpowersForPlatforms` 函数
  - 在交互式模式下添加 Superpowers 安装提示
  - 更新返回结果和日志输出，正确显示 Superpowers 安装状态
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 测试交互式模式下能正确提示安装 Superpowers
  - `programmatic` TR-2.2: 测试非交互式模式下（`--yes`, `--json`）跳过 Superpowers 安装提示
  - `programmatic` TR-2.3: 测试 `initCommand` 返回结果中 `superpowers` 字段正确反映安装状态
- **Notes**: `installSuperpowersForPlatforms` 函数已在 `src/core/superpowers.ts` 中实现

## [ ] Task 3: 添加规则和钩子管理功能
- **Priority**: medium
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 在 `src/core/skills.ts` 中添加规则和钩子管理函数
  - 在 `src/commands/init.ts` 中集成规则和钩子安装逻辑
  - 在 `src/commands/update.ts` 中集成规则和钩子更新逻辑
  - 在 `src/commands/uninstall.ts` 中集成规则和钩子卸载逻辑
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 测试支持规则的平台（如 opencode）能正确安装规则文件
  - `programmatic` TR-3.2: 测试支持钩子的平台（如 claude）能正确安装钩子
  - `programmatic` TR-3.3: 测试 update 命令能更新规则和钩子
  - `programmatic` TR-3.4: 测试 uninstall 命令能移除规则和钩子
- **Notes**: 参考 Comet 的 `copyCometRulesForPlatform` 和 `installCometHooksForPlatform` 实现

## [x] Task 4: 改进平台选择策略
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 修改 `src/cli/index.ts`，移除硬编码的 `['opencode']` 平台限制
  - 让 `initCommand` 使用 `detectPlatforms` 自动检测平台，并允许用户选择多个平台
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: 测试 `driv init` 能检测并显示多个平台
  - `human-judgment` TR-4.2: 手动验证交互式模式下能选择多个平台
- **Notes**: 需要修改 `initCommand` 的参数签名，移除 `_platformIds` 参数

## [x] Task 5: 添加工作目录自动创建功能
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 在 `src/commands/init.ts` 中添加 `createWorkingDirs` 函数
  - 在项目级安装时自动创建 `docs/superpowers/specs/` 和 `docs/superpowers/plans/` 目录
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-5.1: 测试项目级安装时自动创建工作目录
  - `programmatic` TR-5.2: 测试全局安装时不创建工作目录
- **Notes**: 参考 Comet 的 `createWorkingDirs` 实现

## [x] Task 6: 完善 Doctor 命令
- **Priority**: medium
- **Depends On**: Task 3
- **Description**: 
  - 在 `src/commands/doctor.ts` 中添加脚本检查功能
  - 添加规则完整性检查
  - 添加钩子完整性检查
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-6.1: 测试脚本检查能正确检测脚本目录存在性
  - `programmatic` TR-6.2: 测试规则检查能正确检测规则文件完整性
  - `programmatic` TR-6.3: 测试钩子检查能正确检测钩子安装状态
- **Notes**: 参考 Comet 的 `checkScriptsPresent` 实现

## [x] Task 7: 修复 CodeGraph 安装权限问题
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 `src/commands/init.ts` 中 CodeGraph 安装逻辑，使用用户目录或项目目录作为 cwd
  - 修改 `src/commands/update.ts` 中 CodeGraph 安装逻辑，同样使用正确的 cwd
  - 添加错误处理和友好的错误提示
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `programmatic` TR-7.1: 测试 CodeGraph 安装使用正确的 cwd
  - `human-judgment` TR-7.2: 手动验证在 Windows 非管理员模式下安装不会报错
- **Notes**: 当前问题是 npm 尝试在项目所在根目录（如 D:\）创建文件，导致权限错误

## [x] Task 3: 添加规则和钩子管理功能
- **Priority**: high
- **Depends On**: Task 1-7
- **Description**: 
  - 为 `init.ts` 添加单元测试，覆盖 OpenSpec 技能名称修复、Superpowers 安装、多平台选择、工作目录创建
  - 为 `update.ts` 添加单元测试，覆盖规则和钩子更新、CodeGraph 安装
  - 为 `uninstall.ts` 添加单元测试，覆盖规则和钩子卸载
  - 为 `doctor.ts` 添加单元测试，覆盖脚本检查、规则检查、钩子检查
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- **Test Requirements**:
  - `programmatic` TR-8.1: 所有新增测试用例通过
  - `programmatic` TR-8.2: 测试覆盖率 ≥ 80%
- **Notes**: 使用 vitest 作为测试框架，遵循现有测试风格