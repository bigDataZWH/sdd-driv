# Driv CLI 命令优化计划

## 项目调研结论

通过对比 `comet-master` 和 `driv` 两个项目的 CLI 实现，识别出以下主要差距和优化机会：

### 当前问题

1. **`review` 命令未实现** - 仅显示占位符消息
2. **`doctor` 命令返回值不一致** - 返回 `DoctorResult[]` 但 CLI 调用方式有问题
3. **`init` 命令缺少交互** - 直接使用默认值，用户体验差
4. **`uninstall` 使用基础 readline** - 与项目其他部分风格不一致
5. **缺少 CodeGraph 集成** - Comet 有完整支持，Driv 完全缺失
6. **Superpowers 集成未完成** - 始终返回 'skipped'
7. **缺少多平台支持** - 仅支持 OpenCode 平台
8. **错误处理不完善** - 缺少统一的错误处理和用户友好提示

## 文件和模块修改

### 1. `src/cli/index.ts`
- 修复 `doctorCheck` 函数调用方式
- 完善 `review` 命令实现或移除

### 2. `src/commands/init.ts`
- 添加交互式提示（使用 @inquirer/prompts）
- 完善 OpenSpec 和 Superpowers 集成
- 添加 CodeGraph 安装选项

### 3. `src/commands/uninstall.ts`
- 替换 readline 为 @inquirer/prompts

### 4. `src/commands/doctor.ts`
- 统一返回值接口

### 5. `src/commands/update.ts`
- 添加 CodeGraph 支持

### 6. `src/core/`
- 添加 platforms.ts（多平台支持）
- 添加 openspec.ts（OpenSpec 安装）
- 添加 superpowers.ts（Superpowers 安装）
- 添加 codegraph.ts（CodeGraph 安装）

## 优化步骤

### 步骤 1：统一依赖和基础模块
- 在 `package.json` 中添加 `@inquirer/prompts` 依赖
- 创建 `src/core/platforms.ts` 定义平台配置
- 创建 `src/core/detect.ts` 平台检测逻辑

### 步骤 2：完善 uninstall 命令
- 使用 @inquirer/prompts 替换 readline
- 优化用户交互体验

### 步骤 3：完善 init 命令
- 添加交互式选择 scope、语言、平台
- 完善 OpenSpec 和 Superpowers 安装流程
- 添加 CodeGraph 安装选项

### 步骤 4：完善 doctor 命令
- 修复返回值问题
- 添加更多检测项（CodeGraph、Superpowers）

### 步骤 5：完善 update 命令
- 添加 npm 包自更新功能
- 添加 CodeGraph 更新选项

### 步骤 6：处理 review 命令
- 完善 review 命令实现或移除占位符

## 潜在依赖和注意事项

### 新增依赖
- `@inquirer/prompts` - 交互式命令行提示

### 需要适配的模块
- `src/core/skills.ts` - 支持多平台技能安装
- `src/core/assets.ts` - 支持多平台资源同步

### 风险处理
- 保持向后兼容性，所有新功能通过选项控制
- 错误处理确保不会中断现有工作流
- 测试覆盖所有新增功能

## 验证计划

1. **单元测试** - 为新增模块编写测试
2. **集成测试** - 测试命令间的交互
3. **端到端测试** - 测试完整的 init -> status -> doctor -> uninstall 流程
4. **兼容性测试** - 确保现有项目不受影响

## 预期效果

优化完成后，Driv 的 CLI 命令将具备以下特性：

- ✅ 丰富的交互式用户体验
- ✅ 完整的 OpenSpec + Superpowers 集成
- ✅ CodeGraph 支持
- ✅ 多平台支持
- ✅ 统一的错误处理
- ✅ 完善的 review 命令
- ✅ 与 Comet 功能对齐