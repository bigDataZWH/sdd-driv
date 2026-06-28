# 技术架构详细设计

## 一、核心模块架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLI 命令层                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │   init  │ │  status │ │  doctor │ │  update │ │ review  │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
├─────────────────────────────────────────────────────────────────────┤
│                          Skill 技能层                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ clarify │ │  design │ │  build  │ │  verify │ │ archive │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
├─────────────────────────────────────────────────────────────────────┤
│                          核心引擎层                                 │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐            │
│  │  StateMachine │ │  PhaseGuard   │ │  HandoffMgr   │            │
│  │  状态机       │ │  阶段守护     │ │  交接管理     │            │
│  └───────────────┘ └───────────────┘ └───────────────┘            │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐            │
│  │  ReviewSystem │ │  CleanCode    │ │  ContextCmpr  │            │
│  │  评审系统     │ │  代码质量     │ │  上下文压缩   │            │
│  └───────────────┘ └───────────────┘ └───────────────┘            │
├─────────────────────────────────────────────────────────────────────┤
│                          集成适配层                                 │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐            │
│  │  OpenSpecAPI  │ │  Superpowers  │ │  OpenCodeAPI  │            │
│  │  OpenSpec接口 │ │  Superpowers  │ │  OpenCode接口 │            │
│  └───────────────┘ └───────────────┘ └───────────────┘            │
├─────────────────────────────────────────────────────────────────────┤
│                          基础设施层                                 │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐            │
│  │  FileSystem   │ │  GitOps       │ │  ScriptExec   │            │
│  │  文件系统     │ │  Git操作      │ │  脚本执行     │            │
│  └───────────────┘ └───────────────┘ └───────────────┘            │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐            │
│  │  YamlParser   │ │  HashUtils    │ │  Logger       │            │
│  │  YAML解析     │ │  哈希工具     │ │  日志系统     │            │
│  └───────────────┘ └───────────────┘ └───────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 模块依赖关系

```
CLI 命令层
    ↓
Skill 技能层 ←──┐
    ↓           │
核心引擎层      │
    ↓           │
集成适配层 ─────┘
    ↓
基础设施层
```

---

## 二、核心模块详细设计

### 2.1 状态机模块 (StateMachine)

**职责**：管理变更的生命周期状态

**核心接口**：

```typescript
// src/core/state-machine.ts

export interface StateMachine {
  // 初始化变更状态
  initChange(name: string, workflow: Workflow): Promise<void>;

  // 获取当前状态
  getState(name: string): Promise<ChangeState>;

  // 更新字段
  setField(name: string, field: string, value: unknown): Promise<void>;

  // 阶段转换
  transition(name: string, targetPhase: Phase): Promise<void>;

  // 状态验证
  validate(name: string, phase: Phase): Promise<boolean>;

  // 规模评估
  assessScale(name: string): Promise<ScaleAssessment>;
}

export type Phase = 'clarify' | 'design' | 'build' | 'verify' | 'archive';
export type Workflow = 'full';  // 只有完整流程

export interface ChangeState {
  change: string;
  workflow: Workflow;  // 固定为 'full'
  phase: Phase;
  created_at: string;

  phases: Record<Phase, PhaseState>;

  build_mode?: BuildMode;
  tdd_mode?: TddMode;
  isolation?: IsolationMode;
  verify_mode?: VerifyMode;
  verify_result?: VerifyResult;

  hw_process: HuaweiProcessState;

  archived: boolean;
}

export interface PhaseState {
  status: 'pending' | 'in_progress' | 'completed';
  started_at?: string;
  completed_at?: string;
  artifacts: Record<string, string>;
}

export interface HuaweiProcessState {
  requirement_review: ReviewStatus;
  requirement_review_at?: string;
  technical_review: ReviewStatus;
  technical_review_at?: string;
  code_review: ReviewStatus;
  code_review_at?: string;
  test_report?: string;
}

export type ReviewStatus = 'pending' | 'passed' | 'failed';
export type BuildMode = 'subagent-driven-development';  // 推荐：子代理驱动开发
export type TddMode = 'tdd';  // 默认：TDD 模式
export type IsolationMode = 'branch' | 'worktree';
export type VerifyMode = 'light' | 'full';
export type VerifyResult = 'pending' | 'pass' | 'fail';
```

**状态转换规则**：

```typescript
// 状态转换表
const TRANSITIONS: TransitionRule[] = [
  {
    from: 'clarify',
    to: 'design',
    preconditions: [
      { type: 'file_exists', path: 'proposal.md' },
      { type: 'file_exists', path: 'tasks.md' },
      { type: 'review_passed', review: 'requirement' },
    ],
    postconditions: [
      { type: 'update_phase', phase: 'design' },
      { type: 'create_handoff', phase: 'design' },
    ],
  },
  {
    from: 'design',
    to: 'build',
    preconditions: [
      { type: 'file_exists', path: 'design-doc.md' },
      { type: 'file_exists', path: 'plan.md' },
      { type: 'review_passed', review: 'technical' },
      { type: 'handoff_valid', phase: 'design' },
    ],
    postconditions: [
      { type: 'update_phase', phase: 'build' },
      { type: 'set_build_mode', mode: 'pending' },
    ],
  },
  {
    from: 'build',
    to: 'verify',
    preconditions: [
      { type: 'code_committed' },
      { type: 'tests_passed' },
      { type: 'clean_code_passed' },
      { type: 'review_passed', review: 'code' },
      { type: 'build_mode_set' },
      { type: 'tdd_mode_set' },
    ],
    postconditions: [
      { type: 'update_phase', phase: 'verify' },
      { type: 'set_verify_mode', mode: 'pending' },
    ],
  },
  {
    from: 'verify',
    to: 'archive',
    preconditions: [
      { type: 'verify_passed' },
      { type: 'branch_handled' },
      { type: 'verification_report_exists' },
    ],
    postconditions: [
      { type: 'update_phase', phase: 'archive' },
      { type: 'mark_archived', value: true },
    ],
  },
];
```

### 2.2 阶段守护模块 (PhaseGuard)

**职责**：验证阶段退出条件，防止状态漂移

**核心接口**：

```typescript
// src/core/phase-guard.ts

export interface PhaseGuard {
  // 检查阶段前置条件
  checkEntry(name: string, phase: Phase): Promise<GuardResult>;

  // 检查阶段退出条件
  checkExit(name: string, phase: Phase): Promise<GuardResult>;

  // 执行阶段转换
  applyTransition(name: string, phase: Phase): Promise<void>;

  // 验证企业研发评审门禁
  checkReviewGate(name: string, reviewType: ReviewType): Promise<GuardResult>;
}

export interface GuardResult {
  passed: boolean;
  failures: GuardFailure[];
}

export interface GuardFailure {
  check: string;
  expected: string;
  actual: string;
  severity: 'critical' | 'warning';
  message: string;
}

export type ReviewType = 'requirement' | 'technical' | 'code';
```

**检查规则实现**：

```typescript
// 阶段守护检查规则
const PHASE_GUARD_RULES: GuardRule[] = [
  // Open 阶段检查
  {
    phase: 'clarify',
    type: 'entry',
    checks: [
      { name: 'state_file_exists', critical: true },
      { name: 'openspec_yaml_exists', critical: true },
    ],
  },
  {
    phase: 'clarify',
    type: 'exit',
    checks: [
      { name: 'proposal_exists', critical: true },
      { name: 'proposal_complete', critical: true },
      { name: 'tasks_exists', critical: true },
      { name: 'tasks_defined', critical: true },
      { name: 'requirement_review_passed', critical: true }, // 企业研发扩展
    ],
  },

  // Design 阶段检查
  {
    phase: 'design',
    type: 'entry',
    checks: [
      { name: 'previous_phase_complete', phase: 'clarify', critical: true },
    ],
  },
  {
    phase: 'design',
    type: 'exit',
    checks: [
      { name: 'design_doc_exists', critical: true },
      { name: 'design_doc_complete', critical: true },
      { name: 'handoff_valid', critical: true },
      { name: 'technical_review_passed', critical: true }, // 企业研发扩展
    ],
  },

  // Build 阶段检查
  {
    phase: 'build',
    type: 'entry',
    checks: [
      { name: 'previous_phase_complete', phase: 'design', critical: true },
    ],
  },
  {
    phase: 'build',
    type: 'exit',
    checks: [
      { name: 'plan_exists', critical: true },
      { name: 'build_mode_set', critical: true },
      { name: 'tdd_mode_set', critical: true },
      { name: 'isolation_set', critical: true },
      { name: 'code_committed', critical: true },
      { name: 'tests_passed', critical: true },
      { name: 'clean_code_passed', critical: false }, // 企业研发扩展
      { name: 'code_review_passed', critical: true }, // 企业研发扩展
    ],
  },

  // Verify 阶段检查
  {
    phase: 'verify',
    type: 'entry',
    checks: [
      { name: 'previous_phase_complete', phase: 'build', critical: true },
    ],
  },
  {
    phase: 'verify',
    type: 'exit',
    checks: [
      { name: 'verify_passed', critical: true },
      { name: 'branch_handled', critical: true },
      { name: 'verification_report_exists', critical: true },
    ],
  },

  // Archive 阶段检查
  {
    phase: 'archive',
    type: 'entry',
    checks: [
      { name: 'previous_phase_complete', phase: 'verify', critical: true },
    ],
  },
  {
    phase: 'archive',
    type: 'exit',
    checks: [
      { name: 'change_moved_to_archive', critical: true },
      { name: 'spec_merged', critical: true },
      { name: 'knowledge_updated', critical: false },
    ],
  },
];
```

### 2.3 交接管理模块 (HandoffManager)

**职责**：生成阶段交接包，压缩上下文

**核心接口**：

```typescript
// src/core/handoff-manager.ts

export interface HandoffManager {
  // 生成交接包
  generate(name: string, fromPhase: Phase, toPhase: Phase): Promise<HandoffPackage>;

  // 验证交接包有效性
  validate(name: string, phase: Phase): Promise<boolean>;

  // 加载交接上下文
  loadContext(name: string, phase: Phase): Promise<string>;
}

export interface HandoffPackage {
  version: string;
  change: string;
  phase: Phase;
  timestamp: string;

  sources: SourceFile[];

  context: CompressedContext;

  verification: VerificationInfo;
}

export interface SourceFile {
  path: string;
  hash: string;
  role: 'proposal' | 'design' | 'tasks' | 'spec' | 'review';
  excerpt?: string;
}

export interface CompressedContext {
  summary: string;
  decisions: Decision[];
  constraints: Constraint[];
  tasks: TaskSummary[];
  reviews: ReviewSummary[];
}

export interface Decision {
  id: string;
  title: string;
  rationale: string;
  alternatives: string[];
}

export interface Constraint {
  id: string;
  type: 'technical' | 'business' | 'process';
  description: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  dependencies: string[];
}

export interface ReviewSummary {
  type: ReviewType;
  status: ReviewStatus;
  key_findings: string[];
}
```

**交接包生成逻辑**：

```typescript
// 交接包生成流程
async function generateHandoffPackage(
  name: string,
  fromPhase: Phase,
  toPhase: Phase,
): Promise<HandoffPackage> {
  // 1. 收集源文件
  const sources = await collectSourceFiles(name, fromPhase);

  // 2. 计算文件哈希
  const sourcesWithHash = await Promise.all(
    sources.map(async (s) => ({
      ...s,
      hash: await computeFileHash(s.path),
    })),
  );

  // 3. 提取关键内容
  const context = await extractContext(name, fromPhase, toPhase);

  // 4. 计算总哈希
  const totalHash = computeTotalHash(sourcesWithHash, context);

  // 5. 生成交接包
  const handoff = {
    version: '1.0',
    change: name,
    phase: toPhase,
    timestamp: new Date().toISOString(),
    sources: sourcesWithHash,
    context,
    verification: { total_hash: totalHash },
  };

  // 6. 保存交接包
  await saveHandoffPackage(name, handoff);

  return handoff;
}

// 收集源文件
async function collectSourceFiles(
  name: string,
  phase: Phase,
): Promise<SourceFile[]> {
  const files: SourceFile[] = [];

  // 根据 phase 收集不同文件
  switch (phase) {
    case 'clarify':
      files.push(
        { path: `openspec/changes/${name}/proposal.md`, role: 'proposal' },
        { path: `openspec/changes/${name}/tasks.md`, role: 'tasks' },
        { path: `openspec/changes/${name}/design.md`, role: 'design' },
      );
      break;

    case 'design':
      files.push(
        { path: `docs/superpowers/specs/${name}-design.md`, role: 'design' },
        { path: `openspec/changes/${name}/tasks.md`, role: 'tasks' },
      );
      break;

    case 'build':
      files.push(
        { path: `docs/superpowers/plans/${name}.md`, role: 'tasks' },
      );
      break;
  }

  // 企业研发扩展：添加评审文件
  files.push(
    { path: `openspec/changes/${name}/reviews/requirement-review.md`, role: 'review' },
    { path: `openspec/changes/${name}/reviews/technical-review.md`, role: 'review' },
  );

  return files;
}

// 提取关键内容
async function extractContext(
  name: string,
  fromPhase: Phase,
  toPhase: Phase,
): Promise<CompressedContext> {
  // 根据 phase 提取不同内容
  const proposal = await readFile(`openspec/changes/${name}/proposal.md`);
  const tasks = await readFile(`openspec/changes/${name}/tasks.md`);

  // 提取决策点
  const decisions = extractDecisions(proposal);

  // 提取约束
  const constraints = extractConstraints(proposal);

  // 提取任务摘要
  const taskSummary = extractTaskSummary(tasks);

  // 企业研发扩展：提取评审摘要
  const reviews = await extractReviewSummary(name);

  return {
    summary: generateSummary(proposal),
    decisions,
    constraints,
    tasks: taskSummary,
    reviews,
  };
}
```

### 2.4 评审系统模块 (ReviewSystem)

**职责**：管理企业研发评审流程

**核心接口**：

```typescript
// src/core/review-system.ts

export interface ReviewSystem {
  // 创建评审文档
  createReview(name: string, type: ReviewType): Promise<string>;

  // 提交评审
  submitReview(name: string, type: ReviewType): Promise<void>;

  // 检查评审状态
  checkStatus(name: string, type: ReviewType): Promise<ReviewStatus>;

  // 执行评审检查项
  executeChecklist(name: string, type: ReviewType): Promise<ChecklistResult>;

  // 列出所有评审
  listReviews(name: string): Promise<ReviewInfo[]>;
}

export interface ReviewInfo {
  type: ReviewType;
  status: ReviewStatus;
  created_at: string;
  reviewed_at?: string;
  reviewer?: string;
  findings: ReviewFinding[];
}

export interface ReviewFinding {
  id: string;
  description: string;
  severity: 'critical' | 'important' | 'suggestion';
  status: 'pending' | 'accepted' | 'fixed';
  resolution?: string;
}

export interface ChecklistResult {
  passed: boolean;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  name: string;
  passed: boolean;
  auto_check: boolean;
  notes?: string;
}
```

**评审检查项配置**：

```typescript
// 评审检查项配置
const REVIEW_CHECKLISTS: Record<ReviewType, ChecklistConfig> = {
  requirement: {
    items: [
      { id: 'req-001', name: '需求描述清晰完整', auto_check: false },
      { id: 'req-002', name: '用户故事格式正确', auto_check: false },
      { id: 'req-003', name: '验收标准明确', auto_check: false },
      { id: 'req-004', name: '范围边界清晰', auto_check: false },
      { id: 'req-005', name: '技术可行性已评估', auto_check: false },
      { id: 'req-006', name: '风险已识别', auto_check: false },
      { id: 'req-auto-001', name: 'proposal.md 存在', auto_check: true },
      { id: 'req-auto-002', name: 'tasks.md 存在', auto_check: true },
    ],
  },

  technical: {
    items: [
      { id: 'tech-001', name: '技术方案可行性', auto_check: false },
      { id: 'tech-002', name: '架构设计合理性', auto_check: false },
      { id: 'tech-003', name: '接口设计完整性', auto_check: false },
      { id: 'tech-004', name: '性能考虑充分', auto_check: false },
      { id: 'tech-005', name: '安全考虑充分', auto_check: false },
      { id: 'tech-auto-001', name: 'design-doc.md 存在', auto_check: true },
      { id: 'tech-auto-002', name: '设计文档结构完整', auto_check: true },
    ],
  },

  code: {
    items: [
      { id: 'code-001', name: '代码符合规范', auto_check: false },
      { id: 'code-002', name: '单元测试覆盖', auto_check: false },
      { id: 'code-003', name: '无安全漏洞', auto_check: false },
      { id: 'code-004', name: '注释文档完整', auto_check: false },
      { id: 'code-auto-001', name: '代码已提交', auto_check: true },
      { id: 'code-auto-002', name: '单元测试通过', auto_check: true },
      { id: 'code-auto-003', name: 'Clean Code 检查通过', auto_check: true },
      { id: 'code-auto-004', name: '安全扫描通过', auto_check: true },
    ],
  },
};
```

### 2.5 Clean Code 模块 (CleanCodeChecker)

**职责**：代码质量检查

**核心接口**：

```typescript
// src/core/clean-code.ts

export interface CleanCodeChecker {
  // 执行检查
  check(name: string): Promise<CleanCodeResult>;

  // 生成报告
  generateReport(name: string): Promise<string>;

  // 自定义规则
  addRule(rule: CleanCodeRule): void;

  // 获取规则列表
  getRules(): CleanCodeRule[];
}

export interface CleanCodeResult {
  passed: boolean;
  issues: CodeIssue[];
  summary: ResultSummary;
}

export interface CodeIssue {
  rule_id: string;
  file: string;
  line?: number;
  severity: 'critical' | 'warning' | 'suggestion';
  message: string;
  fix?: string;
}

export interface ResultSummary {
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  by_severity: Record<string, number>;
}

export interface CleanCodeRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'warning' | 'suggestion';
  enabled: boolean;
  check: (code: string, context: RuleContext) => Issue[];
}
```

**内置规则**：

```typescript
// 内置 Clean Code 规则
const BUILTIN_RULES: CleanCodeRule[] = [
  {
    id: 'naming-convention',
    name: '命名规范检查',
    description: '检查变量、函数、类的命名是否符合规范',
    severity: 'warning',
    enabled: true,
    check: (code, ctx) => {
      const issues: Issue[] = [];
      // 实现命名规范检查
      // 类名：PascalCase
      // 函数名：camelCase
      // 常量：UPPER_SNAKE_CASE
      // 变量：camelCase
      return issues;
    },
  },

  {
    id: 'function-length',
    name: '函数长度检查',
    description: '检查函数是否过长（建议不超过50行）',
    severity: 'suggestion',
    enabled: true,
    check: (code, ctx) => {
      const issues: Issue[] = [];
      // 实现函数长度检查
      return issues;
    },
  },

  {
    id: 'cyclomatic-complexity',
    name: '圈复杂度检查',
    description: '检查代码圈复杂度（建议不超过10）',
    severity: 'warning',
    enabled: true,
    check: (code, ctx) => {
      const issues: Issue[] = [];
      // 实现圈复杂度检查
      return issues;
    },
  },

  {
    id: 'code-duplication',
    name: '代码重复检查',
    description: '检查重复代码块',
    severity: 'suggestion',
    enabled: true,
    check: (code, ctx) => {
      const issues: Issue[] = [];
      // 实现代码重复检查
      return issues;
    },
  },

  {
    id: 'comment-quality',
    name: '注释质量检查',
    description: '检查注释是否充分且有意义',
    severity: 'suggestion',
    enabled: true,
    check: (code, ctx) => {
      const issues: Issue[] = [];
      // 实现注释质量检查
      return issues;
    },
  },
];
```

---

## 三、集成适配层设计

### 3.1 OpenSpec 集成

```typescript
// src/adapters/openspec.ts

export interface OpenSpecAdapter {
  // 初始化 OpenSpec
  init(path: string): Promise<void>;

  // 创建变更
  createChange(name: string, description: string): Promise<string>;

  // 获取活跃变更
  getActiveChanges(): Promise<string[]>;

  // 归档变更
  archiveChange(name: string): Promise<void>;

  // 同步状态
  syncStatus(name: string): Promise<void>;
}
```

### 3.2 Superpowers 集成

```typescript
// src/adapters/superpowers.ts

export interface SuperpowersAdapter {
  // 调用 brainstorming 技能
  invokeBrainstorming(context: BrainstormingContext): Promise<string>;

  // 调用 writing-plans 技能
  invokeWritingPlans(context: PlanningContext): Promise<string>;

  // 调用 tdd 技能
  invokeTdd(context: TddContext): Promise<string>;

  // 调用 closing 技能
  invokeClosing(context: ClosingContext): Promise<string>;
}
```

### 3.3 OpenCode 集成

```typescript
// src/adapters/opencode.ts

export interface OpenCodeAdapter {
  // 获取平台配置
  getPlatformConfig(): Promise<OpenCodeConfig>;

  // 创建命令
  createCommand(name: string, content: string): Promise<void>;

  // 创建 Skill
  createSkill(name: string, content: string): Promise<void>;

  // 调用子代理
  dispatchSubagent(task: SubagentTask): Promise<string>;

  // 获取可用工具
  getAvailableTools(): Promise<string[]>;
}

export interface OpenCodeConfig {
  skills_dir: string;
  commands_dir: string;
  hooks_enabled: boolean;
  subagent_available: boolean;
}
```

---

## 四、模板配置系统设计

### 4.1 模板管理器模块 (TemplateManager)

**职责**：管理模板的加载、选择、继承和占位符替换

**核心接口**：

```typescript
// src/core/template-manager.ts

export interface TemplateManager {
  loadTemplate(type: TemplateType, name: string): Promise<string>;
  
  selectTemplate(type: TemplateType, changeType?: string): Promise<string>;
  
  applyTemplate(type: TemplateType, name: string, data: Record<string, string>): Promise<string>;
  
  listTemplates(type?: TemplateType): Promise<TemplateInfo[]>;
  
  validateTemplate(type: TemplateType, name: string): Promise<ValidationResult>;
  
  getInheritanceChain(type: TemplateType, name: string): Promise<string[]>;
}

export type TemplateType = 'proposal' | 'design' | 'spec' | 'review';

export interface TemplateInfo {
  name: string;
  type: TemplateType;
  path: string;
  extends?: string;
  description?: string;
  placeholders: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  code: string;
  message: string;
  line?: number;
}
```

### 4.2 模板选择策略

```typescript
// 模板选择策略：项目级自定义 > 变更类型 > 默认模板
async function selectTemplate(
  type: TemplateType,
  changeType?: string,
): Promise<string> {
  const config = await loadTemplateConfig();
  
  // 1. 检查项目级自定义模板
  const customPath = await findCustomTemplate(type, changeType);
  if (customPath) return customPath;
  
  // 2. 根据变更类型选择模板
  if (changeType && config[type].type_mapping[changeType]) {
    return config[type].type_mapping[changeType];
  }
  
  // 3. 使用默认模板
  return config[type].default;
}
```

### 4.3 模板继承处理器

```typescript
// src/core/template-inheritance.ts

export interface InheritanceRule {
  child: string;
  parent: string;
  strategy: 'extend' | 'override' | 'merge';
  sections: {
    extend?: string[];
    override?: string[];
    merge?: string[];
    add?: string[];
  };
}

export class TemplateInheritance {
  private rules: InheritanceRule[];
  
  constructor(rules: InheritanceRule[]) {
    this.rules = rules;
  }
  
  async process(childPath: string): Promise<string> {
    const rule = this.findRule(childPath);
    if (!rule) {
      return await readFile(childPath);
    }
    
    const parentContent = await readFile(rule.parent);
    const childContent = await readFile(childPath);
    
    return this.mergeTemplates(parentContent, childContent, rule);
  }
  
  private mergeTemplates(
    parent: string,
    child: string,
    rule: InheritanceRule,
  ): string {
    // 解析 Markdown 结构
    const parentSections = parseMarkdownSections(parent);
    const childSections = parseMarkdownSections(child);
    
    let result = '';
    
    for (const [sectionId, parentContent] of Object.entries(parentSections)) {
      if (rule.sections.override?.includes(sectionId)) {
        result += childSections[sectionId] || parentContent;
      } else if (rule.sections.merge?.includes(sectionId)) {
        result += this.mergeSection(parentContent, childSections[sectionId]);
      } else {
        result += parentContent;
      }
    }
    
    for (const sectionId of rule.sections.add || []) {
      if (childSections[sectionId] && !parentSections[sectionId]) {
        result += childSections[sectionId];
      }
    }
    
    return result;
  }
}
```

### 4.4 占位符解析器

```typescript
// src/core/placeholder-parser.ts

export interface Placeholder {
  name: string;
  defaultValue?: string;
  isMultiLine: boolean;
}

export class PlaceholderParser {
  private readonly regex = /\{\{([a-z_0-9]+)(:([^}]+))?\}\}/gs;
  
  parse(template: string): Placeholder[] {
    const placeholders: Placeholder[] = [];
    let match;
    
    while ((match = this.regex.exec(template)) !== null) {
      placeholders.push({
        name: match[1],
        defaultValue: match[3],
        isMultiLine: match[3]?.includes('\n') || false,
      });
    }
    
    return placeholders;
  }
  
  replace(
    template: string,
    values: Record<string, string>,
  ): string {
    return template.replace(this.regex, (_match, name, _colon, defaultValue) => {
      return values[name] || defaultValue || `{{${name}}}`;
    });
  }
}
```

### 4.5 模板配置加载

```typescript
// src/core/template-config.ts

export interface TemplateConfig {
  version: string;
  proposals: TemplateCategoryConfig;
  designs: TemplateCategoryConfig;
  specs: TemplateCategoryConfig;
  reviews: Record<string, string>;
  inheritance: InheritanceConfig;
  placeholders: PlaceholderConfig;
  project_override: ProjectOverrideConfig;
}

export interface TemplateCategoryConfig {
  default: string;
  type_mapping: Record<string, string>;
}

export interface InheritanceConfig {
  enabled: boolean;
  rules: InheritanceRule[];
}

export interface PlaceholderConfig {
  system: string[];
  user: string[];
  optional: string[];
}

export interface ProjectOverrideConfig {
  enabled: boolean;
  search_paths: string[];
}

export async function loadTemplateConfig(): Promise<TemplateConfig> {
  const configPath = '.driv/templates/config.yaml';
  
  if (!(await exists(configPath))) {
    return getDefaultConfig();
  }
  
  return parseYaml(await readFile(configPath));
}
```

---

## 五、基础设施层设计

### 5.1 文件系统模块

```typescript
// src/utils/file-system.ts

export interface FileSystem {
  // 文件存在检查
  exists(path: string): Promise<boolean>;

  // 读取文件
  read(path: string): Promise<string>;

  // 写入文件
  write(path: string, content: string): Promise<void>;

  // 复制文件
  copy(src: string, dest: string): Promise<void>;

  // 创建目录
  mkdir(path: string): Promise<void>;

  // 删除文件/目录
  remove(path: string): Promise<void>;

  // 列出目录
  list(path: string): Promise<string[]>;
}
```

### 4.2 Git 操作模块

```typescript
// src/utils/git-ops.ts

export interface GitOps {
  // 初始化仓库
  init(): Promise<void>;

  // 获取当前状态
  status(): Promise<GitStatus>;

  // 提交变更
  commit(message: string): Promise<string>;

  // 创建分支
  createBranch(name: string): Promise<void>;

  // 切换分支
  checkoutBranch(name: string): Promise<void>;

  // 合并分支
  mergeBranch(name: string): Promise<void>;

  // 获取提交历史
  log(options: LogOptions): Promise<Commit[]>;

  // 获取当前提交 SHA
  getHeadSha(): Promise<string>;

  // 获取变更文件列表
  getChangedFiles(baseRef: string, headRef: string): Promise<string[]>;
}

export interface GitStatus {
  is_clean: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  current_branch: string;
}
```

### 4.3 YAML 解析模块

```typescript
// src/utils/yaml-parser.ts

export interface YamlParser {
  // 解析 YAML 文件
  parse(path: string): Promise<unknown>;

  // 解析 YAML 字符串
  parseString(content: string): unknown;

  // 写入 YAML 文件
  write(path: string, data: unknown): Promise<void>;

  // 更新字段
  updateField(path: string, field: string, value: unknown): Promise<void>;

  // 获取字段
  getField(path: string, field: string): Promise<unknown>;
}
```

### 4.4 哈希工具模块

```typescript
// src/utils/hash-utils.ts

export interface HashUtils {
  // 计算文件哈希
  computeFileHash(path: string): Promise<string>;

  // 计算字符串哈希
  computeStringHash(content: string): string;

  // 计算对象哈希
  computeObjectHash(obj: unknown): string;

  // 验证哈希
  verifyHash(content: string, expectedHash: string): boolean;
}
```

---

## 五、脚本系统设计

### 5.1 脚本架构

```
scripts/
├── driv-env.sh          # 环境变量配置
├── driv-state.sh        # 状态管理脚本
├── driv-guard.sh        # 阶段守护脚本
├── driv-handoff.sh      # 交接包生成脚本
├── driv-archive.sh      # 归档脚本
├── driv-review.sh       # 评审脚本
├── driv-cleancode.sh    # Clean Code 检查脚本
└── driv-validate.sh     # 验证脚本
```

### 5.2 环境变量脚本 (driv-env.sh)

```bash
#!/bin/bash
# driv-env.sh - 环境变量配置

# 查找脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 设置环境变量
export HW_DEV_SCRIPTS_DIR="$SCRIPT_DIR"
export HW_DEV_BASH="${HW_DEV_BASH:-bash}"

# 查找项目根目录
HW_DEV_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [[ -z "$HW_DEV_ROOT" ]]; then
  HW_DEV_ROOT="$(pwd)"
fi
export HW_DEV_ROOT

# OpenSpec 目录
export HW_DEV_OPENSPEC_DIR="$HW_DEV_ROOT/openspec"
export HW_DEV_CHANGES_DIR="$HW_DEV_OPENSPEC_DIR/changes"
export HW_DEV_ARCHIVE_DIR="$HW_DEV_OPENSPEC_DIR/archive"

# Superpowers 目录
export HW_DEV_SUPERPOWERS_DIR="$HW_DEV_ROOT/docs/superpowers"
export HW_DEV_SPECS_DIR="$HW_DEV_SUPERPOWERS_DIR/specs"
export HW_DEV_PLANS_DIR="$HW_DEV_SUPERPOWERS_DIR/plans"

# 企业研发研发目录
export HW_DEV_CONFIG_DIR="$HW_DEV_ROOT/.driv"
export HW_DEV_REVIEW_TEMPLATES="$HW_DEV_CONFIG_DIR/review-templates"

# 辅助函数
get_state_file() {
  local name=$1
  echo "$HW_DEV_CHANGES_DIR/$name/.driv.yaml"
}

get_openspec_file() {
  local name=$1
  echo "$HW_DEV_CHANGES_DIR/$name/.openspec.yaml"
}

get_proposal_file() {
  local name=$1
  echo "$HW_DEV_CHANGES_DIR/$name/proposal.md"
}

get_tasks_file() {
  local name=$1
  echo "$HW_DEV_CHANGES_DIR/$name/tasks.md"
}

get_design_doc_dir() {
  local name=$1
  echo "$HW_DEV_SPECS_DIR"
}

get_plan_file_dir() {
  local name=$1
  echo "$HW_DEV_PLANS_DIR"
}
```

---

## 六、测试策略

### 6.1 测试层次

```
测试金字塔
    ┌───────────┐
    │   E2E     │  ← 端到端测试（完整流程）
    ├───────────┤
    │ Integration│  ← 集成测试（模块交互）
    ├───────────┤
    │    Unit    │  ← 单元测试（函数/类）
    └───────────┘
```

### 6.2 单元测试示例

```typescript
// test/unit/state-machine.test.ts

import { describe, it, expect } from 'vitest';
import { StateMachine } from '../../src/core/state-machine';

describe('StateMachine', () => {
  it('should initialize change state', async () => {
    const sm = new StateMachine();
    await sm.initChange('test-change', 'full');

    const state = await sm.getState('test-change');
    expect(state.change).toBe('test-change');
    expect(state.workflow).toBe('full');
    expect(state.phase).toBe('clarify');

  });

  it('should transition phase', async () => {
    const sm = new StateMachine();
    await sm.initChange('test-change', 'full');

    // 模拟 Clarify 阶段完成
    await sm.setField('test-change', 'phases.clarify.status', 'completed');

    // 转换到 Design 阶段
    await sm.transition('test-change', 'design');

    const state = await sm.getState('test-change');
    expect(state.phase).toBe('design');
  });

  it('should validate state', async () => {
    const sm = new StateMachine();
    await sm.initChange('test-change', 'full');

    const valid = await sm.validate('test-change', 'clarify');
    expect(valid).toBe(true);
  });
});
```

### 6.3 集成测试示例

```typescript
// test/integration/workflow.test.ts

import { describe, it, expect } from 'vitest';
import { WorkflowEngine } from '../../src/core/workflow-engine';

describe('Workflow Integration', () => {
  it('should execute full workflow', async () => {
    const engine = new WorkflowEngine();

    // 执行完整工作流
    const result = await engine.execute({
      change: 'integration-test',
      workflow: 'full',
      description: 'Integration test workflow',
    });

    expect(result.success).toBe(true);
    expect(result.phase).toBe('archive');
    expect(result.archived).toBe(true);
  });
});
```

---

## 七、性能优化

### 7.1 上下文压缩策略

```typescript
// 上下文压缩配置
const COMPRESSION_STRATEGIES = {
  off: {
    description: '不压缩',
    load_full: true,
  },

  beta: {
    description: '结构化投影',
    extract_key_content: true,
    preserve_structure: true,
    max_tokens: 4000,
  },

  full: {
    description: '完全压缩',
    summarize_only: true,
    max_tokens: 2000,
  },
};
```

### 7.2 并行执行

```typescript
// 并行任务执行
async function executeTasksParallel(tasks: Task[]): Promise<TaskResult[]> {
  const results = await Promise.all(
    tasks.map(task => executeTask(task))
  );
  return results;
}
```

---

## 八、安全考虑

### 8.1 输入验证

```typescript
// 输入验证器
function validateInput(input: unknown): boolean {
  // 验证变更名称
  if (typeof input.change !== 'string') return false;
  if (!/^[a-z0-9-]+$/.test(input.change)) return false;

  // 验证工作流类型（只有 full）
  if (input.workflow !== 'full') return false;

  return true;
}
```

### 8.2 文件操作安全

```typescript
// 安全文件操作
async function safeWrite(path: string, content: string): Promise<void> {
  // 验证路径
  if (!isSafePath(path)) {
    throw new Error('Unsafe path detected');
  }

  // 验证内容大小
  if (content.length > MAX_FILE_SIZE) {
    throw new Error('File size exceeds limit');
  }

  await writeFile(path, content);
}
```

---

本技术架构文档详细描述了系统的核心模块、接口设计、数据结构和实现策略，为后续开发提供了清晰的技术蓝图。