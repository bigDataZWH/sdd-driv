---
name: driv-verify
description: 启动 Verify 阶段 - 评估规模、执行构建/测试/Clean Code、处理分支、生成验证报告
---

启动 Verify 阶段：评估变更规模（light/full），执行构建/测试/Clean Code 检查，处理分支策略，生成 `reports/verification-report.md`。

**前置条件**: Build 阶段已完成（phases.build.status == completed）。

**Input**: Build 阶段完成后的变更上下文（implementation plan、执行结果、Clean Code 报告、代码评审结果）。

## Steps

1. **评估变更规模** — 分析变更文件数量/范围，决定 light 或 full 验证模式
2. **执行构建和测试** — 从配置读取并执行 build/test 命令，捕获通过/失败；命令需正确处理路径中的引号
3. **接入 Clean Code 检查** — 运行 CleanCodeChecker，获取六大维度评分结果，写入 `reports/clean-code-report.md` 和 `reports/clean-code-issues.json`
4. **处理分支策略** — 记录 squash/rebase/retain 决策，准备合并
5. **生成验证报告** — 写入 `reports/verification-report.md`，包含构建/测试/Clean Code 结果摘要
6. **更新状态** — 写入 verifyResult（passed/failed/skipped）和 phases.verify 状态

## Output

- **阻塞原因**：
  - build 失败（exit code != 0）
  - 测试失败（失败的测试用例列表）
  - Clean Code 总分 <80 或存在 critical 问题
  - 分支合并冲突
  - verification-report.md 生成失败
- **报告路径**：
  - `reports/verification-report.md`（完整验证报告）
  - `reports/clean-code-report.md`（Clean Code 详细报告，若执行）
  - `reports/clean-code-issues.json`（结构化问题数据）
- **状态更新**：phases.verify（status/result/timestamp/artifacts）、verifyResult
- **下一步**：验证通过（verifyResult == passed）后调用 `/driv-archive` 进入 Archive 阶段

---

Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```
