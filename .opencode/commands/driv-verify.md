---
description: Run the driv-verify OpenCode workflow
---

Equivalent skill: `driv-verify`
Command name: `/driv-verify`

Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```

启动 Verify 阶段：评估变更规模（light/full），执行构建/测试/Clean Code 检查，处理分支策略，生成 `verification-report.md`。

**前置条件**: Build 阶段已完成（`.driv.yaml.phases.build.status == completed`）。

**Input**: Build 阶段完成后的变更上下文（implementation plan、执行结果、Clean Code 报告、代码评审结果）。

## Steps

1. **评估变更规模** — 分析变更文件数量/范围，决定 light 或 full 验证模式
2. **执行构建和测试** — 从配置读取并执行 build/test 命令，捕获通过/失败
3. **接入 Clean Code 检查** — 运行 CleanCodeChecker，获取六大维度评分结果
4. **检查 branchStatus** — 记录 debug-gate 标记和分支状态
5. **处理分支策略** — 记录 squash/rebase/retain 决策
6. **生成验证报告** — 写入 `reports/verification-report.md`
7. **更新状态** — 写入 `.driv.yaml.verifyResult` 和 `phases.verify`

**⚠️ Decision Point DP-7: 收尾确认**
- 暂停工作流，向用户展示当前产出件
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

## Output验证失败处理（DebugGate 侧路径）

- 当 verify 结果为 fail 时，DebugGate.enforce() 触发
- 禁止猜测式修复（禁止直接修改代码后重试）
- 必须进入 investigate 子流程：
  1. 复现问题
  2. 定位根因（使用 brainstorming/investigate 技能）
  3. 修复根因
  4. 重新验证
- investigate 完成后方可重新触发 verify

## Output

- **阻塞原因**：build 失败 / 测试失败 / Clean Code 分低 / 合并冲突
- **报告路径**：`reports/verification-report.md`、`clean-code-report.md`、`clean-code-issues.json`
- **状态更新**：`.driv.yaml.phases.verify`、`.driv.yaml.verifyResult`
- **下一步**：验证通过后调用 `/driv-archive`

---

Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```
