## 1. Compression 策略生效

- [x] 1.1 从 ChangeState.contextCompression 读取策略
- [x] 1.2 将策略传递给 ContextCompression.compress()
- [x] 1.3 更新 generate() 签名传入 state

## 2. Handoff 内容增强

- [x] 2.1 buildContext 读取 design.md 填充 decisions
- [x] 2.2 buildContext 读取 tasks.md 填充 tasks
- [x] 2.3 buildContext 读取 reviews/ 填充 reviews
- [ ] 2.4 追加 spec delta 摘要

## 3. 测试

- [x] 3.1 compression 策略生效测试
- [x] 3.2 context 内容填充测试
- [x] 3.3 全量测试通过
