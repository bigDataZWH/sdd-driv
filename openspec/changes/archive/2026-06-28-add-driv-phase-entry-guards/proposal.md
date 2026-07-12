## Why

当前 PhaseGuard.checkEntry 全部直接通过，起不到门禁作用。Archive artifact 类型混用（true/'true'），handoff hash 未接入 guard。需要补齐这些门禁使阶段转换可靠可验证。

## What Changes

- 实现 per-phase checkEntry（design/build/verify/archive）
- PhaseGuard 接入 CLI/skills 入口
- 统一 archive artifact 值规范
- handoff hash 验证接入 build/archive entry guard

## Capabilities

### New Capabilities
- phase-entry-guards: per-phase entry validation

### Modified Capabilities
- （无）
