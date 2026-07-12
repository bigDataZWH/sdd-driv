## Why

当前 HandoffManager.generate() 接收 compressor 参数但固定传 'off'，导致 contextCompression 配置不生效。handoff 的 context 中 decisions/tasks/reviews 全部为空数组，缺少实际内容。需要修复 compression 生效并增强 handoff 内容。

## What Changes

- 从 ChangeState.contextCompression 读取压缩策略传递给 compressor
- 在 buildContext 中填充 decisions/tasks/reviews 内容
- 增加 spec delta 摘要纳入

## Capabilities

### New Capabilities
- handoff-context-compression: 上下文压缩按配置生效

### Modified Capabilities
- （无）
