## 1. 运行时协议基础

- [x] 1.1 在 ChangeState 新增 autoTransition 字段（boolean，默认 false）
- [x] 1.2 实现 context-recovery.ts：从 .driv.yaml/handoff/tasks 恢复 ChangeState
- [x] 1.3 实现 dirty-worktree.ts：git status 检查并分类改动
- [x] 1.4 实现 debug-gate.ts：强制调试流程
- [x] 1.5 实现 decision-point.ts：用户确认点

## 2. 协议集成

- [x] 2.1 将 dirty-worktree 接入 PhaseGuard.checkEntry for build/verify/archive
- [x] 2.2 将 debug-gate 接入 VerifyService 失败后路径
- [x] 2.3 将 decision-point 接入 build/verify/archive 命令流
- [x] 2.4 将 autoTransition 集成到 applyTransition

## 3. 测试

- [x] 3.1 context-recovery.test.ts
- [x] 3.2 dirty-worktree.test.ts
- [x] 3.3 debug-gate.test.ts
- [x] 3.4 decision-point.test.ts
- [x] 3.5 全量测试通过
