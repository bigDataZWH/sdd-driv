## 1. 评审配置与类型

- [ ] 1.1 定义 ReviewType、ReviewStatus、ReviewInfo、ReviewFinding、ChecklistResult、ChecklistItem 类型
- [ ] 1.2 创建默认 gates 配置，包含 requirement、technical、code 三类门禁
- [ ] 1.3 将评审配置接入 `.driv/config.yaml`
- [ ] 1.4 将评审状态读写接入 `.driv.yaml.hw_process`

## 2. ReviewSystem

- [ ] 2.1 实现 createReview，使用模板系统生成 review markdown
- [ ] 2.2 实现 executeChecklist，执行自动检查并保留人工检查项
- [ ] 2.3 实现 submitReview，解析最终结论并更新状态
- [ ] 2.4 实现 checkStatus 和 listReviews
- [ ] 2.5 将 requirement/technical/code review 检查接入 PhaseGuard

## 3. Clean Code 规则引擎

- [ ] 3.1 定义 CleanCodeChecker、CleanCodeResult、CodeIssue、CleanCodeRule 类型
- [ ] 3.2 实现规则注册、启用、禁用和执行流程
- [ ] 3.3 实现命名规范规则
- [ ] 3.4 实现函数长度、参数数量、圈复杂度规则
- [ ] 3.5 实现类长度、嵌套深度、重复代码规则
- [ ] 3.6 实现注释质量、空 catch、硬编码密钥规则

## 4. 评分与报告

- [ ] 4.1 实现六大维度权重评分：命名15、函数25、结构20、注释15、错误15、安全20
- [ ] 4.2 实现通过条件：总分 ≥80 且无 critical 问题
- [ ] 4.3 生成 `reports/clean-code-report.md`
- [ ] 4.4 生成 `reports/clean-code-issues.json`
- [ ] 4.5 生成 `reports/clean-code-fix-history.json`
- [ ] 4.6 将 clean_code 结果写入 `.driv.yaml.phases.build`

## 5. 命令入口

- [ ] 5.1 新增 `/driv-review` 命令或技能说明
- [ ] 5.2 新增 `/driv-cleancode` 命令或技能说明
- [ ] 5.3 确保命令输出阻塞原因和报告路径

## 6. 测试验证

- [ ] 6.1 添加 ReviewSystem 创建、提交、失败和状态测试
- [ ] 6.2 添加 checklist 自动检查测试
- [ ] 6.3 添加 Clean Code 各规则测试
- [ ] 6.4 添加评分和报告生成测试
- [ ] 6.5 添加 PhaseGuard 与 review/cleancode 集成测试
- [ ] 6.6 运行 lint、typecheck、test 并修复失败
