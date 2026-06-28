## 1. Build 编排

- [ ] 1.1 实现 BuildOrchestrator，检查 design 阶段完成和技术评审通过
- [ ] 1.2 实现 Superpowers plan 创建，路径为 `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`
- [ ] 1.3 plan 内容引用 OpenSpec proposal/design/specs/tasks 路径和 handoff hash
- [ ] 1.4 实现 build_mode、tdd_mode、isolation 选择和状态写入
- [ ] 1.5 实现 branch 与 worktree 隔离策略初始化

## 2. GitOps

- [ ] 2.1 实现 git status、getHeadSha、getChangedFiles
- [ ] 2.2 实现 createBranch、checkoutBranch、mergeBranch
- [ ] 2.3 实现 squash、rebase、retain 策略辅助函数
- [ ] 2.4 实现工作区脏状态检查和提示
- [ ] 2.5 添加 GitOps mock 测试和命令参数测试

## 3. VerifyService

- [ ] 3.1 实现规模评估 light/full
- [ ] 3.2 从配置读取 build/test 命令并执行
- [ ] 3.3 接入 CleanCodeChecker 结果
- [ ] 3.4 实现分支处理策略记录
- [ ] 3.5 生成 `reports/verification-report.md`
- [ ] 3.6 更新 `.driv.yaml.verify_result` 和 phases.verify 状态

## 4. ArchiveService

- [ ] 4.1 实现 archive preconditions：verify 完成、change 存在、未归档、验证报告存在
- [ ] 4.2 创建 `openspec/archive/YYYY-MM-DD-<name>/` 目录
- [ ] 4.3 复制 proposal、design、tasks、specs、reviews、reports
- [ ] 4.4 实现 Delta Spec append/update/supersede 合并
- [ ] 4.5 实现主 spec 备份、冲突文件和失败保护
- [ ] 4.6 更新 archive 状态和知识库索引
- [ ] 4.7 实现文件复制失败回滚

## 5. 命令与技能入口

- [ ] 5.1 新增 `/driv-build` 命令或技能，执行 Build 阶段流程
- [ ] 5.2 新增 `/driv-verify` 命令或技能，执行 Verify 阶段流程
- [ ] 5.3 新增 `/driv-archive` 命令或技能，执行 Archive 阶段流程
- [ ] 5.4 新增 `/driv` 状态入口，显示当前 change 和下一步

## 6. 测试验证

- [ ] 6.1 添加 BuildOrchestrator plan 生成和状态更新测试
- [ ] 6.2 添加 VerifyService light/full、失败、成功报告测试
- [ ] 6.3 添加 ArchiveService precondition、复制、merge、rollback 测试
- [ ] 6.4 添加 GitOps 分支策略测试
- [ ] 6.5 添加端到端 dry-run 流程测试
- [ ] 6.6 运行 lint、typecheck、test 并修复失败
