# Design: Driv 阶段入口守卫

## Entry Guard 规则

| Phase | entry 检查项 |
|-------|-------------|
| design | phase==design, clarify completed, proposal exists, requirement review passed |
| build | phase==build, design completed, design doc exists, technical review passed, handoff hash valid |
| verify | phase==verify, build completed, code committed, tests pass, code review passed |
| archive | phase==archive, verify completed, verify == pass, branch handled |

## Artifact 值规范

所有 artifact 值统一为字符串：
- `'true'` / `'passed'` / `'<path>'` / `''`（空串表示不存在）
- 检查时统一使用 truthy string 比较

## Handoff Hash 接入

- build entry guard 前验证 handoff hash 未漂移
- hash 漂移时：warning 级别 failure，允许用户选择继续或重生成
