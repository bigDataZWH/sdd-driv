# Driv CLI 完善 - 验证检查清单

- [x] Checkpoint 1: OpenSpec 技能名称修复 — 代码中引用的技能名称与包内实际文件一致
- [x] Checkpoint 2: Superpowers 安装功能 — `initCommand` 正确调用 `installSuperpowersForPlatforms` 并返回安装状态
- [x] Checkpoint 3: 规则和钩子管理 — `init` 命令支持规则和钩子安装
- [x] Checkpoint 4: 多平台选择 — CLI 不再硬编码 `['opencode']`，支持自动检测和多选
- [x] Checkpoint 5: 工作目录创建 — 项目级安装自动创建 `docs/superpowers/specs/` 和 `docs/superpowers/plans/`
- [x] Checkpoint 6: Doctor 命令增强 — 添加脚本检查
- [x] Checkpoint 7: CodeGraph 安装修复 — 使用正确的 cwd，避免根目录写入权限问题
- [x] Checkpoint 8: 测试覆盖 — 新增测试用例覆盖所有功能改进，测试覆盖率 ≥ 80%
- [x] Checkpoint 9: 构建验证 — `npm run build` 成功完成
- [x] Checkpoint 10: 测试验证 — `npm run test` 所有测试通过