---
description: Run the driv-hotfix OpenCode workflow
---

Equivalent skill: `driv-hotfix`
Command name: `/driv-hotfix`

Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```

---
name: driv-hotfix
description: 快捷修复流程 - 跳过 clarify/design，直接 build → verify → archive
---

紧急修复流程：跳过提案和设计阶段，直接进入 Build → Verify → Archive。

**适用场景**：紧急 bug 修复、hotfix、回滚。

## Steps

1. **检查工作区** — 确认当前分支可提交；若 dirty 则暂存（stash）
2. **创建 change** — 运行 `openspec init hotfix-<desc>` 跳过 proposal/design
3. **直接 Build** — 实现修复，提交代码
4. **Verify** — 运行测试、clean code 检查
5. **Archive** — 归档变更

## Output

- 修复分支名、变更摘要
- 验证报告路径
- 归档路径
