# Design: Handoff 上下文压缩

## Compression 生效

修改 HandoffManager.generate()：
```typescript
// 当前: compressor ? compressor.compress(context, 'off') : context;
// 改为:
const strategy = state.contextCompression as 'off' | 'beta' | 'full';
const compressed = compressor ? compressor.compress(context, strategy) : context;
```

Requires passing ChangeState (or at least contextCompression value) to generate().

## Context 增强

buildContext 改为完整读取：
- summary: 从前 500 字符 proposal → 合并 proposal + design 摘要
- decisions: 读取 design.md 中决策章节
- constraints: 读取设计约束章节
- tasks: 读取 tasks.md 中所有描述行
- reviews: 读取 reviews/ 目录下评审结论

## Spec Delta

在 context.constraints 末尾追加 spec delta 摘要行，如：
- "Modified: capability/foo (新增 Scenario X)"
