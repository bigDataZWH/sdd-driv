## Why

当前 Driv 缺少 Comet 的 6 个运行时协议（非功能保障）：.driv.yaml 字段对齐、会话中断后的状态恢复、脏工作区检查、调试门禁、用户决策点、阶段自动衔接。缺少这些协议导致 Driv 在生产性变更流程中缺乏安全网和自动化衔接。

## What Changes

- 新增 5 个协议模块：context-recovery、dirty-worktree、debug-gate、decision-point、auto-transition
- 在 ChangeState 新增 autoTransition 字段
- 修改 phase-guard.ts 应用 autoTransition 逻辑

## Capabilities

### New Capabilities
- runtime-protocols: 6 个 Comet 运行时协议的 Driv 实现

### Modified Capabilities
- （无，纯新增核心协议能力）
