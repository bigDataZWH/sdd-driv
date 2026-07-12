## 1. Verify 硬化

- [x] 1.1 增强 scale 判断（git diff + spec scope）
- [x] 1.2 命令解析支持引号分组
- [ ] 1.3 支持项目级验证配置

## 2. Clean Code 落盘

- [x] 2.1 verify 生成 clean-code-report.md
- [x] 2.2 verify 生成 clean-code-issues.json

## 3. 分支处理闭环

- [ ] 3.1 支持 retain/squash/rebase/merge/PR-ready
- [ ] 3.2 写入 branch_status 到 state

## 4. Archive 硬化

- [ ] 4.1 优先使用 openspec archive
- [x] 4.2 补充复制 Driv 工件（handoff）
- [ ] 4.3 主 spec 防污染检查

## 5. 测试

- [x] 5.1 scale 判断测试（含 spec 维度）
- [x] 5.2 命令解析测试（引号分组）
- [x] 5.3 Clean Code 落盘测试
- [ ] 5.4 分支处理测试
- [x] 5.5 全量测试通过
