# 变更提案：driv 质量优化全集

## Intent

一句话锁定：修复 driv 全部 P0-P3 待优化点（45 项），覆盖状态机死锁、门禁失效、回滚不完整、CleanCodeChecker 误报、配置链路断裂、平台抽象泄漏等问题。

## Why

全面代码审计发现 driv 存在三类根本性缺陷：(1) 状态机 transition() 和 PhaseGuardImpl 在生产中未接入，阶段状态永不推进；(2) ArchiveService 回滚不完整，归档失败留下脏状态；(3) CleanCodeChecker 权重超 100% 且多类误报。此外还有 40+ 项 P1-P3 问题影响功能正确性和健壮性。

## What Changes

### P0 严重修复（7 项）

1. **P0-1/2/3 状态机接入**：transition() 支持跨阶段 catch-up（标记中间阶段为 completed）；VerifyService/ArchiveService 入口调用 transition()；SKILL.md 补充 transition 指令
2. **P0-4 ArchiveService 回滚**：catch 块调用完整 rollback()；mergeDeltaSpec 成功后延迟删 .backup 到 archive 全流程成功后
3. **P0-5 package.json files**：加入 `assets/`
4. **P0-6 CleanCodeChecker 权重**：调整为合计 100
5. **P0-7 hooks 脚本路径**：installDrivSkills 时复制 scripts/*.sh

### P1 高优先级修复（13 项）

6. **P1-1 技能名统一**：uninstall/init openspec 技能名提取为常量
7. **P1-2 平台参数**：installDrivSkills 接受 platform 参数，用 getPlatformSkillsDir
8. **P1-3 doctor 多平台**：遍历 PLATFORMS 检查 skills
9. **P1-4 TTY 检测**：isInteractive 加入 process.stdin.isTTY
10. **P1-5/6 VerifyService 配置**：configCache 按 changeName 缓存；接线 skipLightChecks；读取 state.verifyMode；coverage 文件缺失返回 skipped
11. **P1-7 HandoffManager hash**：stable-stringify 递归排序；新增文件检测；totalHash 写入 state 作锚点
12. **P1-8 PhaseGuard 对称**：统一入口/出口校验原则
13. **P1-9 CleanCodeChecker 误报**：箭头函数识别、const 区分作用域、嵌套深度 AST 化、空 catch 去重、复杂度清洗字符串
14. **P1-10 manifest 一致**：buildDefaultManifest 同步 assets/manifest.json 内容
15. **P1-11 DirtyWorktree type**：解析 git status XY 状态码
16. **P1-12 Review birthtime**：改用 frontmatter created_at 字段
17. **P1-13 offline npmPack**：用 mtime 排序替代字典序

### P2 中优先级修复（16 项）

18-33. 涵盖：catch 吞错加日志、assessScale 抽取统一、BuildOrchestrator 命名冲突、硬编码配置化、types 类型强化、死字段清理、openspec 路径单源、PLATFORMS 字段补齐、opencode hooks、.opencode 路径常量化、TemplateManager 四缺陷、PlaceholderParser 正则、copyDir glob、FileSystem 沙箱、CLI 错误处理统一、offline statSync

### P3 低优先级修复（18 项）

34-51. 涵盖：缓存竞态、命令解析、时间戳精度、Schema 校验、YAML 解析统一、Logger 级别、硬编码 secret 白名单、重复代码检测阈值等

## Impact

- **核心工作流**：state-machine.ts、phase-guard.ts、archive-service.ts、verify-service.ts、build-orchestrator.ts
- **质量保障**：clean-code-checker.ts、handoff-manager.ts、dirty-worktree.ts、review-system.ts
- **命令层**：init.ts、uninstall.ts、doctor.ts、update.ts、cli/index.ts
- **工具层**：file-system.ts、placeholder-parser.ts、template-manager.ts、offline.ts、manifest.ts、platforms.ts、types.ts
- **配置**：package.json、.driv/config.yaml

## 验收标准

- 所有现有测试通过（除既有的 dispatch-assets Windows 路径问题）
- 新增测试覆盖 P0/P1 关键修复点
- npm run typecheck 不引入新的类型错误
