# Design: Driv 运行时协议

## 架构

6 个协议各自独立，通过 PhaseGuard 或 CLI 入口有机组合：

1. context-recovery.ts ← 被 /driv-* 技能入口调用
2. dirty-worktree.ts ← 被 build/verify/archive guard checkEntry 调用
3. debug-gate.ts ← 被 VerifyService 失败路径调用
4. decision-point.ts ← 被 build/verify/archive 命令调用
5. auto-transition ← 通过 PhaseGuard.applyTransition 集成

## 类型改动

ChangeState 新增：
- `autoTransition: boolean` (默认 false)

新增接口：
- `RecoveryState: { change, phase, tasksProgress, handoffValid }`
- `DirtyWorktreeResult: { dirty, userChanges, changeChanges, unknownChanges }`
- `DebugGateResult: { enforced, reason }`
- `DecisionResult: { confirmed, choice, timestamp }`

## 测试策略

- 每个协议模块独立单元测试
- 集成测试验证协议间编排
