## Context

Driv 完整方案的后半段是 Build、Verify、Archive 闭环。实施指南定义了 Build 阶段创建 Superpowers plan、选择执行模式/TDD/隔离、执行编码、Clean Code、代码评审；Verify 阶段评估规模、执行验证、处理分支、生成报告；Archive 阶段复制工件、合并 Delta Spec、更新知识库和状态。本 change 在前置状态引擎、模板系统、评审门禁之上实现该闭环。

## Goals / Non-Goals

**Goals:**

- 实现 BuildOrchestrator：检查技术评审、创建 Superpowers plan、设置执行模式、TDD 模式和隔离策略。
- 支持执行模式：`subagent-driven-development` 推荐，`direct` 仅保留兼容。
- 支持 TDD 模式：`tdd` 推荐，`direct` 仅保留兼容。
- 支持隔离策略：`branch` 推荐，`worktree` 可选。
- 实现 VerifyService：评估 light/full、运行构建/测试/Clean Code/分支检查、生成 `verification-report.md`。
- 实现 GitOps：status、commit 检查、branch、merge、squash、rebase、retain、changed files、head sha。
- 实现 ArchiveService：验证前置条件、创建归档目录、复制文件、合并 Delta Spec、更新知识库、更新状态、处理错误与回滚。
- 实现 OpenCode 命令或技能入口：`/driv-build`、`/driv-verify`、`/driv-archive`。

**Non-Goals:**

- 不实现真实 AI 编码子代理内部逻辑，只编排 Superpowers 和 OpenCode 可调用流程。
- 不强制自动合并用户分支；分支处理策略需要显式确认或配置。
- 不实现复杂语义 spec merge，第一版按 append/update/supersede 和冲突文件处理。

## Decisions

### Decision 1: Build 阶段以 Superpowers plan 作为 HOW 产物

Build 阶段创建 `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`，但该 plan 必须引用 OpenSpec artifacts，不复制 design 内容。状态写入：

```yaml
phases:
  build:
    status: in_progress
    artifacts:
      plan: docs/superpowers/plans/2026-06-28-user-auth.md
    mode:
      build_mode: subagent-driven-development
      tdd_mode: tdd
      isolation: branch
```

Build 流程：技术评审通过 → `/driv-build` → 创建 plan → 选择执行模式 → 选择 TDD → 选择隔离 → 执行编码 → Clean Code → 代码评审。

### Decision 2: Verify 按规模选择验证策略

规模评估：

- `light`：少于 3 个 tasks 且少于 4 个文件。
- `full`：3 个及以上 tasks 或 4 个及以上文件。

Verify 检查：构建成功、测试通过、Clean Code 通过、分支已处理、验证报告生成。

报告路径：`openspec/changes/<name>/reports/verification-report.md`。

### Decision 3: 分支处理策略显式建模

支持策略：

- `merge`：合并到主分支，适合小改动。
- `squash`：Squash 合并，适合中等改动。
- `rebase`：保持线性历史。
- `retain`：保留独立分支继续开发。

GitOps 接口保留技术架构文档：

```typescript
export interface GitOps {
  init(): Promise<void>;
  status(): Promise<GitStatus>;
  commit(message: string): Promise<string>;
  createBranch(name: string): Promise<void>;
  checkoutBranch(name: string): Promise<void>;
  mergeBranch(name: string): Promise<void>;
  log(options: LogOptions): Promise<Commit[]>;
  getHeadSha(): Promise<string>;
  getChangedFiles(baseRef: string, headRef: string): Promise<string[]>;
}
```

### Decision 4: Archive 复制完整 OpenSpec 证据链

归档目录：`openspec/archive/YYYY-MM-DD-<name>/`。

复制内容：proposal、design、tasks、specs、reviews、reports。合并 Delta Spec 到 `openspec/specs/<capability>/spec.md`。

归档步骤：

1. 验证 verify 阶段完成。
2. 检查变更存在且未归档。
3. 检查验证报告存在。
4. 创建归档目录。
5. 复制工件。
6. 合并 Delta Spec。
7. 更新知识库索引和 capability summary。
8. 更新 `.driv.yaml` archive 状态。
9. 清理临时文件。

### Decision 5: Spec 合并失败不破坏主 Spec

合并策略：append、update、supersede。出现冲突时保留原主 Spec，创建 conflict 文件并阻止 archive 完成。文件复制失败时删除已创建归档目录；状态更新失败时保留归档文件并提示手动修复。

## Risks / Trade-offs

- 自动分支操作风险高 → 默认要求显式策略，retain 可作为安全默认。
- 不同项目测试命令不一致 → VerifyService 从配置读取 build/test 命令；缺失时提示用户配置。
- Delta Spec merge 可能损坏主 spec → 写入前创建备份，冲突时不覆盖。
- Superpowers plan 可能与 OpenSpec design 漂移 → plan 只引用 OpenSpec 路径，并在 handoff 中记录 artifact hash。

## Migration Plan

1. 实现 GitOps 和 VerifyService 基础检查。
2. 实现 BuildOrchestrator 与 plan 生成。
3. 接入 CleanCodeChecker 和 ReviewSystem 状态。
4. 实现 ArchiveService 文件复制与 spec merge。
5. 创建命令/技能入口。
6. 添加单元测试和端到端 dry-run 测试。

## Open Questions

- 默认分支处理策略是否使用 retain？建议第一版默认 retain，用户显式选择 merge/squash/rebase。
