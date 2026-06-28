## 1. 模板目录与默认配置

- [ ] 1.1 创建 `.driv/templates` 目录结构和默认模板清单
- [ ] 1.2 创建 proposals 默认模板与 feature、bugfix、refactor、config、docs 模板
- [ ] 1.3 创建设计模板 default、feature、architecture、interface、performance
- [ ] 1.4 创建 specs 默认模板 capability、api、component、service
- [ ] 1.5 创建 `.driv/templates/config.yaml` 默认配置

## 2. 占位符解析

- [ ] 2.1 实现 PlaceholderParser.parse，识别 `{{name}}` 与 `{{name:default}}`
- [ ] 2.2 实现 PlaceholderParser.replace，按输入值或默认值替换
- [ ] 2.3 保留未解析占位符用于验证
- [ ] 2.4 添加多行默认值与缺失值测试

## 3. 模板继承

- [ ] 3.1 实现 Markdown section 解析工具
- [ ] 3.2 实现 TemplateInheritance 的 extend 策略
- [ ] 3.3 实现 override、merge、add 策略
- [ ] 3.4 实现继承链解析和循环检测
- [ ] 3.5 添加模板继承单元测试

## 4. TemplateManager

- [ ] 4.1 实现 loadTemplate 和 listTemplates
- [ ] 4.2 实现 selectTemplate，按自定义、类型映射、默认模板顺序选择
- [ ] 4.3 实现 applyTemplate，组合继承和占位符替换
- [ ] 4.4 实现 validateTemplate，检查必需 section、占位符和继承引用
- [ ] 4.5 实现 getInheritanceChain

## 5. 企业评审模板

- [ ] 5.1 创建 requirement-review.md 模板，包含基本信息、检查项、关联文档、AI 检查、评审意见、结论、记录
- [ ] 5.2 创建 technical-review.md 模板，包含设计链接、架构检查、决策记录、任务完整性、结论
- [ ] 5.3 创建 code-review.md 模板，包含代码规范、测试覆盖、安全、注释、AI/人工复核、结论
- [ ] 5.4 添加模板快照或内容结构测试

## 6. 验证

- [ ] 6.1 添加 TemplateConfig 缺省和配置文件读取测试
- [ ] 6.2 添加 TemplateManager 端到端应用模板测试
- [ ] 6.3 运行 lint、typecheck、test 并修复失败
