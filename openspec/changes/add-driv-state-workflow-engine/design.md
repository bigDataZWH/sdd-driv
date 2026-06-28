## Context

Driv 完整方案要求 OpenSpec 管理 WHAT，Superpowers 管理 HOW，OpenCode 提供入口。当前只有 OpenSpec/OpenCode 初始化层，缺少支撑五阶段流程的状态模型、阶段守护和交接包。三份设计文档明确要求每个变更使用 `openspec/changes/<name>/.driv.yaml` 保存生命周期状态，并通过 StateMachine、PhaseGuard、HandoffManager、ContextCompression 和基础设施层实现可恢复工作流。

该 change 是后续模板系统、评审质量门禁、Build/Verify/Archive 流程的基础依赖。

## Goals / Non-Goals

**Goals:**

- 实现 `clarify | design | build | verify | archive` 五阶段状态模型，workflow 固定为 `full`。
- 创建 `.driv.yaml` 状态文件结构，记录 OpenSpec 工件、Superpowers plan、阶段状态、评审状态、构建/验证/归档状态、Git 引用和上下文压缩策略。
- 实现 StateMachine：初始化状态、读取状态、更新字段、阶段转换、状态验证、规模评估。
- 实现 PhaseGuard：阶段入口检查、阶段出口检查、评审门禁检查和转换执行。
- 实现 HandoffManager：收集源文件、计算 hash、提取摘要、生成 `design-context.json` 和 `design-context.md`。
- 实现基础设施工具：FileSystem、YamlParser、HashUtils、Logger、ScriptExec。
- 修正单一真相源：Design 阶段检查 `openspec/changes/<name>/design.md`，而不是 `docs/superpowers/specs/*-design.md`。

**Non-Goals:**

- 不实现 ReviewSystem 的评审模板与人工提交流程。
- 不实现 Clean Code 检查规则。
- 不实现 Build/Verify/Archive 的完整业务编排。
- 不修改 OpenSpec CLI 内部状态模型。

## Decisions

### Decision 1: `.driv.yaml` 放在 OpenSpec change 内

状态文件路径固定为 `openspec/changes/<name>/.driv.yaml`。这样每个变更的状态与 OpenSpec 工件同目录，归档时可整体移动，避免 `.driv/changes/<name>/state.yaml` 与 OpenSpec 目录漂移。

状态结构保留设计文档字段：

```yaml
change: feature-user-auth
workflow: full
phase: build
created_at: 2026-06-28
openspec:
  change_dir: openspec/changes/feature-user-auth
  proposal: openspec/changes/feature-user-auth/proposal.md
  design: openspec/changes/feature-user-auth/design.md
  tasks: openspec/changes/feature-user-auth/tasks.md
  specs:
    - openspec/changes/feature-user-auth/specs/auth/spec.md
superpowers:
  plan: docs/superpowers/plans/2026-06-28-user-auth.md
phases:
  clarify:
    status: completed
    artifacts:
      proposal: openspec/changes/feature-user-auth/proposal.md
  design:
    status: completed
    artifacts:
      design: openspec/changes/feature-user-auth/design.md
      tasks: openspec/changes/feature-user-auth/tasks.md
      decisions: openspec/changes/feature-user-auth/tasks.md
build_mode: subagent-driven-development
tdd_mode: tdd
isolation: branch
verify_mode: light
verify_result: pending
hw_process:
  requirement_review: pending
  technical_review: pending
  code_review: pending
base_ref: null
head_ref: null
context_compression: off
archived: false
verified_at: null
```

### Decision 2: 状态机只接受完整流程

`Workflow = 'full'`，阶段类型为 `clarify | design | build | verify | archive`。不提供跳过流程的轻量模式，保持与实施指南“每个变更都必须经过完整流程”一致。

核心接口：

```typescript
export interface StateMachine {
  initChange(name: string, workflow: Workflow): Promise<void>;
  getState(name: string): Promise<ChangeState>;
  setField(name: string, field: string, value: unknown): Promise<void>;
  transition(name: string, targetPhase: Phase): Promise<void>;
  validate(name: string, phase: Phase): Promise<boolean>;
  assessScale(name: string): Promise<ScaleAssessment>;
}
```

### Decision 3: 阶段守护通过规则表实现

PhaseGuard 使用规则表描述入口和出口检查。检查结果返回 `GuardResult`，失败项包含 check、expected、actual、severity、message。

关键规则：

- Clarify exit：`proposal_exists`、`proposal_complete`、`tasks_exists`、`tasks_defined`、`requirement_review_passed`
- Design exit：`design_doc_exists`、`design_doc_complete`、`handoff_valid`、`technical_review_passed`
- Build exit：`plan_exists`、`build_mode_set`、`tdd_mode_set`、`isolation_set`、`code_committed`、`tests_passed`、`clean_code_passed`、`code_review_passed`
- Verify exit：`verify_passed`、`branch_handled`、`verification_report_exists`
- Archive exit：`change_moved_to_archive`、`spec_merged`、`knowledge_updated`

### Decision 4: Handoff 包保存在 change 内部

交接包路径为 `openspec/changes/<name>/.driv/handoff/<phase>-context.json` 和 `<phase>-context.md`。HandoffManager 收集 proposal、design、tasks、spec、review 文件，计算每个文件 hash，并生成总 hash。

结构：

```typescript
export interface HandoffPackage {
  version: string;
  change: string;
  phase: Phase;
  timestamp: string;
  sources: SourceFile[];
  context: CompressedContext;
  verification: VerificationInfo;
}
```

`CompressedContext` 保留 summary、decisions、constraints、tasks、reviews。上下文压缩策略包括 `off`、`beta`、`full`：

- `off`：完整加载源工件。
- `beta`：结构化投影，保留关键内容，默认最大 4000 tokens。
- `full`：摘要优先，默认最大 2000 tokens。

### Decision 5: 基础设施层独立于业务模块

FileSystem、YamlParser、HashUtils、Logger、ScriptExec、PathResolver 独立放在 `src/utils`，所有核心模块通过这些工具访问文件、YAML、hash 和外部命令。这样后续 ReviewSystem、ArchiveService 和 tests 可以 mock 基础设施。

## Risks / Trade-offs

- 状态文件与 OpenSpec 状态可能不一致 → 每次阶段转换前读取 OpenSpec artifactPaths 并同步状态文件中的 artifact 路径。
- 文档原设计中存在 `design-doc.md` 与单一真相源冲突 → 实现时统一改为 `openspec/changes/<name>/design.md`。
- Handoff 摘要提取可能不完整 → 第一版使用结构化提取和全文引用路径，避免丢失真实工件。
- Windows 路径差异 → PathResolver 统一 normalize，测试覆盖反斜杠和带空格路径。

## Migration Plan

1. 新增基础设施工具和类型定义。
2. 新增 StateMachine，初始化 `.driv.yaml`。
3. 新增 PhaseGuard 规则表和检查函数。
4. 新增 HandoffManager 和 ContextCompression。
5. 用单元测试覆盖状态初始化、字段更新、阶段转换、guard 失败、handoff hash。
6. 后续 changes 接入 PhaseGuard 和 StateMachine。

## Open Questions

- 是否允许人工 override 阶段门禁？默认不允许；后续可通过 `--force` 仅在 archive 中支持。
- 是否需要兼容旧 `.driv/changes/<name>/state.yaml`？当前没有旧实现，默认不兼容。
