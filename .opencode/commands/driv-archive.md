---
description: Run the driv-archive OpenCode workflow
---

Equivalent skill: `driv-archive`
Command name: `/driv-archive`

Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```

启动 Archive 阶段：验证归档前置条件（verify 完成、change 存在、未归档、验证报告存在），创建归档目录，复制全部工件，合并 Delta Spec，更新知识库和状态文件，失败时自动回滚。

**前置条件**: Verify 阶段已完成且通过（`.driv.yaml.phases.verify.status == completed`、`.driv.yaml.verifyResult == passed`）。

**Input**: Verify 阶段完成后的变更上下文（verification report、所有变更工件）。

## Steps

1. **验证前置条件** — 检查 verify 完成/change 存在/未归档/报告存在
2. **创建归档目录** — `openspec/archive/YYYY-MM-DD-<name>/`
3. **复制工件** — proposal/design/tasks/specs/reviews/reports/handoff
4. **合并 Delta Spec** — 写入 `delta-spec.md`
5. **备份与冲突处理** — 主 spec 备份、写入前校验
6. **更新知识库** — 归档索引和 `.driv.yaml` 状态
7. **回滚保障** — 失败时自动清理残留

## Output

- **阻塞原因**：verify 未完成/未通过/change 已归档/报告缺失
- **报告路径**：`openspec/archive/YYYY-MM-DD-<name>/`、`delta-spec.md`
- **状态更新**：`.driv.yaml.phases.archive`（status/archivedAt/archivePath/artifacts）
- **回滚**：失败时自动清理

---

Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```
