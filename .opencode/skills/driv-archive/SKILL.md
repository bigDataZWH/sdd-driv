---
name: driv-archive
description: 启动 Archive 阶段 - 验证前置条件、归档工件、合并 Delta Spec、更新知识库
---

启动 Archive 阶段：验证归档前置条件（verify 完成、change 存在、未归档、验证报告存在），创建归档目录，复制 proposal/design/tasks/specs/reviews/reports/handoff，合并 Delta Spec，更新知识库和状态文件，失败时自动回滚。

**前置条件**: Verify 阶段已完成（phases.verify.status == completed）且验证通过。

**Input**: Verify 阶段完成后的变更上下文（verification report、所有变更工件）。

## Steps

1. **验证前置条件** — 检查：verify 已完成且通过（phases.verify.status == completed、verifyResult == passed）、change 存在、未归档、`reports/verification-report.md` 存在
2. **创建归档目录** — 生成 `openspec/archive/YYYY-MM-DD-<name>/` 目录结构
3. **复制工件** — 复制 proposal.md、design.md、tasks.md、specs/、reviews/、reports/ 到归档目录
4. **合并 Delta Spec** — 对主 spec 执行 append/update/supersede 合并策略，写入 `openspec/archive/YYYY-MM-DD-<name>/delta-spec.md`
5. **更新知识库** — 更新归档索引和 `.driv.yaml` archive 状态
6. **回滚保障** — 任意复制步骤失败时清理已创建目录和文件，恢复到归档前状态

## Output

- **阻塞原因**：
  - Verify 阶段未完成（phases.verify.status != completed）
  - 验证未通过（verifyResult != passed）
  - change 名称未指定或不存在
  - 该 change 已归档（phases.archive.status == archived）
  - 验证报告缺失（reports/verification-report.md 不存在）
  - 磁盘空间不足
- **报告路径**：
  - `openspec/archive/YYYY-MM-DD-<name>/`（归档目录，包含全部工件副本）
  - `openspec/archive/YYYY-MM-DD-<name>/delta-spec.md`（Delta Spec 合并结果）
- **状态更新**：phases.archive（status/archivedAt/archivePath/artifacts）
- **回滚**：失败时自动清理已创建文件，保证无残留

---

Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```
