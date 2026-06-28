## Context

Driv 完整方案将企业研发流程映射到五阶段工作流：需求评审阻塞 Clarify→Design，技术评审阻塞 Design→Build，代码评审阻塞 Build→Verify。Build 阶段还要求执行华为 Clean Code 六大维度检查，并生成质量报告。本 change 基于状态引擎和模板系统实现评审与质量门禁。

## Goals / Non-Goals

**Goals:**

- 实现 ReviewSystem：创建评审文档、提交评审、检查状态、执行检查项、列出评审。
- 支持 requirement、technical、code 三类评审。
- 将评审状态写入 `.driv.yaml.hw_process`。
- 使用模板系统生成 `openspec/changes/<name>/reviews/requirement-review.md`、`technical-review.md`、`code-review.md`。
- 实现 CleanCodeChecker 和内置规则：命名规范、函数长度、参数数量、圈复杂度、重复代码、注释质量、错误处理、安全规范。
- 生成 `clean-code-report.md`、`clean-code-issues.json`、`clean-code-fix-history.json`。
- 将 Clean Code 检查结果接入 PhaseGuard 的 Build exit 条件。

**Non-Goals:**

- 不实现 AI 自动修复循环的全部智能修复，只保留最多 5 轮的状态与报告结构。
- 不实现完整安全扫描器，只提供硬编码密钥和输入校验等基础规则。
- 不实现多人审批系统，第一版 `required_approvals` 固定支持至少 1 个通过结论。

## Decisions

### Decision 1: ReviewSystem 管理三类评审

核心接口保留设计文档定义：

```typescript
export interface ReviewSystem {
  createReview(name: string, type: ReviewType): Promise<string>;
  submitReview(name: string, type: ReviewType): Promise<void>;
  checkStatus(name: string, type: ReviewType): Promise<ReviewStatus>;
  executeChecklist(name: string, type: ReviewType): Promise<ChecklistResult>;
  listReviews(name: string): Promise<ReviewInfo[]>;
}
```

`ReviewType = 'requirement' | 'technical' | 'code'`，`ReviewStatus = 'pending' | 'passed' | 'failed'`。

### Decision 2: 评审配置写入 `.driv/config.yaml`

默认配置：

```yaml
gates:
  requirement_review:
    phase: clarify
    trigger: before_design
    required_approvals: 1
    checklist:
      - 需求描述清晰完整
      - 验收标准明确
      - 范围边界清晰
      - 风险识别充分
    template: reviews/requirement-review.md
  technical_review:
    phase: design
    trigger: before_build
    required_approvals: 1
    checklist:
      - 技术方案可行性
      - 架构设计合理性
      - 接口设计完整性
      - 性能考虑充分
      - 安全考虑充分
    template: reviews/technical-review.md
  code_review:
    phase: build
    trigger: before_verify
    required_approvals: 1
    checklist:
      - 代码符合规范
      - 单元测试覆盖
      - 无安全漏洞
      - 注释文档完整
```

### Decision 3: 自动检查和人工检查分离

每个检查项包含 `auto_check`。自动检查可由系统执行，例如 proposal 文件存在、tasks 文件存在、单元测试通过。人工项保留在 review markdown 中，由用户填写结论。

默认检查项保留技术架构文档内容：

- requirement：需求描述、用户故事、验收标准、范围边界、技术可行性、风险、proposal 存在、tasks 存在。
- technical：技术方案、架构、接口、性能、安全、design 存在、设计结构完整。
- code：代码规范、单元测试覆盖、无安全漏洞、注释文档、代码已提交、测试通过、Clean Code 通过、安全扫描通过。

### Decision 4: Clean Code 按六大维度评分

评分维度保留实施指南和设计文档：

| 维度 | 权重 | 规则 | 阈值 |
|---|---:|---|---|
| 命名规范 | 15% | 类 PascalCase，函数/变量 camelCase，常量 UPPER_SNAKE_CASE | 无固定阈值 |
| 函数设计 | 25% | 函数长度、参数数量、圈复杂度 | ≤50 行，≤5 参数，≤10 复杂度 |
| 代码结构 | 20% | 类长度、嵌套深度 | ≤500 行，≤4 层 |
| 注释规范 | 15% | 公开 API 注释、复杂逻辑注释 | 无固定阈值 |
| 错误处理 | 15% | 禁止空 catch，错误信息明确 | critical 必须修复 |
| 安全规范 | 20% | 无硬编码密钥、输入验证 | critical 必须修复 |

通过条件：总分 ≥80 且 critical 问题全部修复。

### Decision 5: 质量报告写入 OpenSpec change

报告路径：

```text
openspec/changes/<name>/reports/
├── clean-code-report.md
├── clean-code-issues.json
└── clean-code-fix-history.json
```

这样质量证据与 OpenSpec change 一起归档。

## Risks / Trade-offs

- 自动代码质量检查可能误报 → 规则结果标注 severity，非 critical 可作为 warning/suggestion。
- 评审需要人工填写 → PhaseGuard 只读取最终结论字段，未填写则保持 pending。
- 覆盖率统计依赖项目测试工具 → 第一版允许从外部测试命令输出或配置读取，不强制固定测试框架。

## Migration Plan

1. 接入状态引擎和模板系统。
2. 实现 ReviewSystem 和默认 checklist。
3. 实现 review markdown 生成和提交状态解析。
4. 实现 CleanCodeChecker 内置规则。
5. 实现报告生成。
6. 更新 PhaseGuard 对评审和 Clean Code 的检查。
7. 添加 review、cleancode 单元测试与集成测试。

## Open Questions

- 代码覆盖率阈值是否固定 80%？默认按文档固定 80%，可后续配置化。
