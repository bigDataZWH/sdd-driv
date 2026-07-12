# Design: Driv Build 执行检查点

## Subagent Progress

```typescript
interface SubagentProgress {
  change: string;
  taskId: string;
  startedAt: string;
  redEvidence: string;   // 失败测试输出路径
  greenEvidence: string; // 通过测试输出路径
  reviewStatus: 'pending' | 'passed' | 'failed';
  fixRounds: number;
  completedAt?: string;
}
```

## Build Mode 对齐

| 当前值 | 对齐后值 | 对应技能 |
|--------|---------|---------|
| subagent-driven-development | subagent-driven-development | subagent-driven-development 技能 |
| sequential | executing-plans | executing-plans 技能 |
| manual | manual | 直接手动 |

新增 `subagentDispatch: 'confirmed'` 字段。

## TDD 约束

tdd / tdd-lite 模式下每个 task 写入 SubagentProgress 时必须包含：
- redEvidence: 失败测试日志
- greenEvidence: 通过测试日志

## Build Pause

plan 生成后若 buildPause: true，阻塞进入执行，等待用户确认。
