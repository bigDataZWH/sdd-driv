## Why

当前 Driv Build 阶段缺少执行过程中的检查点和约束。Subagent 执行没有进度检查点，TDD 约束不足，subagent 模式下主会话可以混改代码。需要补齐这些执行纪律使 Build 阶段可控可审计。

## What Changes

- 新增 subagent-progress 进度记录模块
- 对齐 build mode 值与实际技能名
- 增加 TDD 证据要求
- subagent 模式禁止主会话直接改代码
- 增加 build_pause 字段

## Capabilities

### New Capabilities
- build-execution-checkpoints: Build 阶段执行纪律

### Modified Capabilities
- （无）
