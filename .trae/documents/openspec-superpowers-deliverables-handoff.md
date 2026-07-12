# Driv 中 OpenSpec 与 Superpowers 交付件衔接梳理

## 摘要

通过对 driv 项目五阶段工作流（Clarify → Design → Build → Verify → Archive）的代码与 SKILL.md 文档进行对照调研，发现 OpenSpec 工件与 Superpowers 工件在衔接上存在 **8 处不一致或缺口**，核心问题集中在：plan 文件位置冲突、brainstorming 产物未纳入状态机、handoff 文件路径不一致、docs/superpowers/specs 目录闲置、design.md 跨阶段语义模糊、Superpowers 技能可用性未持久化、plan.md 内容仅为存根、phase-guard 未校验 Superpowers 工件。

本计划旨在梳理这些衔接问题并给出具体修复方案，使两套交付件在状态机层、文件系统层、SKILL.md 文档层三者达成一致。

---

## 当前状态分析

### 交付件流转全景（现状）

```
[Clarify]
  OpenSpec 产出: proposal.md, design.md, tasks.md, specs/, reviews/requirement-review.md
  转换器: design-to-spec-converter.ts → design.md 转 specs/
  状态: openspec.{proposal,design,tasks,specs}, clarify.artifacts['design-converted']
  Superpowers: 无

[Design]
  OpenSpec 产出: design.md（完善）, reviews/technical-review.md
  Handoff: HandoffManager.generate() → .driv/handoff/handoff.json + handoff.md
  Superpowers: brainstorming skill → brainstorming.md（SKILL.md 声明，但代码无写入）
  状态: design.artifacts['detailed-design-completed'], design.artifacts['handoff'], hwProcess.technicalReview
  ⚠️ brainstorming.md 未纳入 stateMachine 与 phase-guard

[Build]
  OpenSpec: plan.md 引用 proposal/design/tasks/specs 路径
  Superpowers: writing-plans skill（SKILL.md 声明输出到 docs/superpowers/plans/）, tdd skill
  代码: BuildOrchestrator.createPlan() → openspec/changes/<name>/plan.md + state.superpowers.plan
  ⚠️ 代码写入 openspec/changes/<name>/plan.md，SKILL.md 要求 docs/superpowers/plans/YYYY-MM-DD-<name>.md
  状态: buildMode, tddMode, isolation, superpowers.plan

[Verify]
  产出: reports/verification-report.md, reports/clean-code-report.md
  评审: ReviewSystem 三级（requirement/technical/code）
  Superpowers: 无

[Archive]
  归档: openspec/changes/archive/YYYY-MM-DD-<name>/
  合并: mergeDeltaSpec() → openspec/specs/<capability>/spec.md
  状态: archived, archive.artifacts['spec-merged']
```

### 关键文件清单

| 文件 | 职责 |
|---|---|
| `src/core/build-orchestrator.ts` | Build 编排，createPlan() 生成 plan.md |
| `src/core/handoff-manager.ts` | 生成 handoff.json/handoff.md |
| `src/core/design-to-spec-converter.ts` | design.md → specs/ 转换 |
| `src/core/state-machine.ts` | 状态字段写入 |
| `src/core/phase-guard.ts` | 阶段入口/退出校验 |
| `src/core/types.ts` | ChangeState 接口定义 |
| `src/core/path-resolver.ts` | 路径解析 |
| `src/commands/init.ts` | createWorkingDirs 创建 docs/superpowers/ |
| `.opencode/skills/driv-design/SKILL.md` | Design 阶段工作流定义 |
| `.opencode/skills/driv-build/SKILL.md` | Build 阶段工作流定义 |

---

## 发现的问题

### 问题 1：plan 文件位置冲突（严重）

- **代码**：`build-orchestrator.ts:39` 写入 `openspec/changes/${changeName}/plan.md`
- **SKILL.md**：`driv-build/SKILL.md:26,42` 要求输出到 `docs/superpowers/plans/YYYY-MM-DD-<name>.md`
- **状态**：`build-orchestrator.ts:46` 将 `openspec/changes/<name>/plan.md` 写入 `state.superpowers.plan`
- **影响**：AI 按 SKILL.md 执行会写到 docs/superpowers/plans/，但状态机记录的是 openspec/changes/ 路径，两者脱节，Verify/Archive 阶段无法定位实际 plan 文件

### 问题 2：brainstorming.md 未纳入状态机（严重）

- **SKILL.md**：`driv-design/SKILL.md:43` 声明产出 `openspec/changes/<name>/brainstorming.md`
- **类型**：`types.ts:83-85` 的 `ChangeState.superpowers` 只有 `plan?: string`，无 `brainstorming`
- **状态机**：`state-machine.ts` 无 `setBrainstormingPath()` 方法
- **门禁**：`phase-guard.ts:336-400` 的 `checkDesignExit()` 不校验 brainstorming.md
- **影响**：Design 阶段的核心 Superpowers 产物游离于状态机之外，无法追踪是否已生成

### 问题 3：handoff 文件路径不一致（中等）

- **代码**：`path-resolver.ts:26-28` → `openspec/changes/<name>/.driv/handoff/handoff.json`
- **SKILL.md**：`driv-design/SKILL.md:42` 声明 `openspec/changes/<name>/handoff-context.json`
- **影响**：文件名（handoff.json vs handoff-context.json）和目录（.driv/handoff/ vs 根目录）都不一致，AI 按 SKILL.md 执行会找不到 HandoffManager 生成的文件

### 问题 4：docs/superpowers/specs/ 目录闲置（中等）

- **init.ts:76**：`createWorkingDirs()` 创建 `docs/superpowers/specs/`
- **全局检索**：无任何代码读取或写入该目录
- **影响**：闲置目录造成用户困惑，且与 docs/superpowers/plans/ 的用途不对称（plans 在 SKILL.md 中被引用，specs 未被引用）

### 问题 5：design.md 跨阶段语义模糊（中等）

- **Clarify 阶段**：生成 design.md 并通过 design-to-spec-converter 转为 specs/
- **Design 阶段**：`driv-design/SKILL.md:29,44` 再次"生成 design.md"
- **状态**：`state.openspec.design` 在 Clarify 已设置，Design 阶段是否覆盖？
- **影响**：同一文件两阶段产出，语义边界不清（初稿 vs 定稿？），无版本区分

### 问题 6：Superpowers 技能可用性未持久化（轻微）

- **detect.ts**：运行时检测 5 个 Superpowers 技能是否已安装
- **状态机**：无字段记录技能安装状态
- **门禁**：`checkBuildEntry()` 不校验 writing-plans/tdd 技能是否可用
- **影响**：Build 阶段开始时可能因技能缺失而中途失败

### 问题 7：plan.md 内容仅为存根（中等）

- **build-orchestrator.ts:70-110**：`generatePlanContent()` 只输出标题、OpenSpec 路径引用、执行配置、handoff hash
- **SKILL.md**：`driv-build/SKILL.md:26` 要求"使用 writing-plans 技能生成详细实施计划"
- **影响**：代码生成的 plan.md 是存根，真正的实施计划应由 Superpowers writing-plans 技能生成；两者职责重叠且未区分

### 问题 8：phase-guard 未校验 Superpowers 工件（中等）

- `checkDesignExit()`：不校验 brainstorming.md 存在
- `checkBuildExit()`：不校验 `state.superpowers.plan` 已设置、plan.md 文件存在
- **影响**：Superpowers 产物的完整性未纳入阶段门禁，可能遗漏

---

## Comet 转换 Schema 对比分析

通过对 `D:\AI\project\SDD\TOOL\comet-master` 的调研，Comet 作为同源工具，已建立成熟的 OpenSpec ↔ Superpowers 转换 Schema。以下对比 Driv 现状与 Comet 方案，提取可借鉴的模式。

### Comet 核心设计原则

Comet 在 `assets/skills/comet/SKILL.md:6-13` 明确定义职责划分：
```
OpenSpec handles WHAT  — outline, proposal, spec lifecycle, archive
Superpowers handles HOW — technical design, planning, execution, closing
```

### 目录布局对比

| 维度 | Driv 现状 | Comet 方案 |
|---|---|---|
| OpenSpec 工件 | `openspec/changes/<name>/` | `openspec/changes/<name>/`（相同） |
| Superpowers 工件 | 混乱：plan.md 在 openspec/，brainstorming.md 声明在 openspec/，docs/superpowers/ 部分闲置 | **清晰分离**：`docs/superpowers/specs/`（Design Doc）、`docs/superpowers/plans/`（Plan）、`docs/superpowers/reports/`（验证报告） |
| Handoff 包 | `.driv/handoff/handoff.json` | `.comet/handoff/design-context.{json,md}` + SHA256 溯源 |
| 状态文件 | `.driv.yaml`（在 change 目录） | `.comet.yaml`（在 change 目录，字段更全） |

### 状态机字段对比

| 字段类别 | Driv `.driv.yaml` | Comet `.comet.yaml` |
|---|---|---|
| OpenSpec 路径 | `openspec.{proposal,design,tasks,specs}` | `handoff_context`, `handoff_hash` |
| Superpowers 路径 | 仅 `superpowers.plan` | `design_doc`, `plan`, `verification_report` |
| 执行配置 | `buildMode`, `tddMode`, `isolation` | `build_mode`, `tdd_mode`, `isolation`, `build_pause`, `subagent_dispatch` |
| 验证 | `verifyResult` | `verify_mode`, `verify_result`, `verification_report`, `branch_status`, `verified_at` |
| 闭环 | `archived` | `archived`, `base_ref`, `direct_override` |

### 关键差异：Comet 的 4 项核心机制（Driv 缺失）

#### 1. Machine-owned Handoff（机器拥有的交接包）
Comet 的 `comet-handoff.sh` 是唯一官方转换通道，`comet-design/SKILL.md:35` 明确规定：
> Must be generated by script. Agent writing summaries on the fly is not allowed.

- 输入：OpenSpec 的 proposal/design/tasks/specs
- 输出：`.comet/handoff/design-context.{json,md}`，带 SHA256 溯源
- Driv 对比：`HandoffManager` 功能相似但无"禁止 agent 自由总结"的约束，且路径与 SKILL.md 不一致

#### 2. Canonical Spec 声明（规格真源声明）
Comet 的 `comet-guard.sh:594-599` 强制 Superpowers Design Doc frontmatter 包含：
```yaml
canonical_spec: openspec
role: technical-design
comet_change: <name>
```
- 确立 OpenSpec 为规格唯一真源，Superpowers 仅为技术设计
- Driv 对比：无此机制，design.md 语义模糊（既是 OpenSpec 工件又被 Design 阶段覆写）

#### 3. Hash 不变量校验（防篡改）
Comet 的 `comet-guard.sh:448-484` 在 design → build 边界校验：
- `handoff_hash` 与当前 OpenSpec artifacts 实际 hash 一致
- 防止 handoff 后 OpenSpec 文件被篡改
- Driv 对比：`phase-guard.ts:130-143` 有 handoff hash 校验，但不校验 Superpowers 工件

#### 4. 反向同步闭环（归档标注）
Comet 的 `comet-archive.sh:164-210` 在归档时：
- 给 Superpowers Design Doc 与 Plan 标注 `archived-with:` + `status: final` frontmatter
- 调用 `openspec archive` 做 delta 语义合并（ADDED/MODIFIED/REMOVED/RENAMED）
- Driv 对比：`archive-service.ts` 有 `mergeDeltaSpec()` 但不标注 Superpowers 工件

### Comet 转换 Schema 全景图

```
[OpenSpec WHAT]                    [Handoff 桥]                    [Superpowers HOW]
openspec/changes/<name>/           .comet/handoff/                 docs/superpowers/
├── proposal.md      ─┐                                             ├── specs/
├── design.md          ├─ comet-handoff.sh ─→ design-context.json ─→│   YYYY-MM-DD-<topic>-design.md
├── tasks.md          ─┤   (SHA256 溯源)     + handoff_hash        │      frontmatter:
└── specs/*/spec.md   ─┘                                             │        canonical_spec: openspec
       │                                                           │        role: technical-design
       │                                                           │        comet_change: <name>
       │                                                           │
       │                                                           ├── plans/
       │                                                           │   YYYY-MM-DD-<feature>.md
       │                                                           │      frontmatter:
       │                                                           │        change: <name>
       │                                                           │        design-doc: <path>
       │                                                           │
       │                                                           └── reports/
       │                                                               YYYY-MM-DD-<name>-verify.md
       │
       └─ archive ─→ openspec/specs/<capability>/spec.md (delta 合并)
                  + Superpowers 工件标注 archived-with: / status: final
```

### 对 Driv 的启示

| Driv 问题 | Comet 解法 | 是否采纳 |
|---|---|---|
| plan 位置冲突 | Comet 用 `docs/superpowers/plans/` + state.plan 跟踪 | ❌ 用户已确认合并到 openspec/changes/ |
| brainstorming 未跟踪 | Comet 用 `docs/superpowers/specs/` Design Doc + state.design_doc | ✅ 采纳：纳入状态机 |
| handoff 路径不一致 | Comet 用 `.comet/handoff/` + 脚本生成 | ✅ 采纳：统一路径文档 |
| specs 目录闲置 | Comet 用它放 Design Doc | ❌ 用户已确认移除 |
| design.md 语义模糊 | Comet 分离：OpenSpec design.md（WHAT）vs Superpowers Design Doc（HOW） | ⚠️ 部分采纳：Driv 保持单文件但明确阶段语义 |
| 技能可用性未持久化 | Comet 无此检查 | ✅ 采纳：Build 入口 warning 检查 |
| plan.md 仅存根 | Comet 的 plan 由 writing-plans 技能完整生成 | ✅ 采纳：存根标注 + writing-plans 扩充 |
| phase-guard 未校验 SP 工件 | Comet guard 校验 handoff_hash + Design Doc frontmatter | ✅ 采纳：warning 级别校验 |
| **无 canonical_spec 声明** | Comet 强制声明规格真源 | 🆕 **新增采纳** |
| **无归档闭环标注** | Comet 标注 archived-with/status:final | 🆕 **新增采纳** |

---

## 拟议变更（基于 Comet 对比修订）

### 变更 1：统一 plan 文件位置与命名

**目标**：消除 plan.md 位置冲突，明确"编排器 plan"与"writing-plans 产物"的关系。

**方案**：合并为单一产物 `openspec/changes/<name>/plan.md`（编排器生成存根，writing-plans 技能在此基础上扩充详细步骤）。✅ 用户已确认

**修改文件**：
- `.opencode/skills/driv-build/SKILL.md:26,42` — 将输出路径改为 `openspec/changes/<name>/plan.md`，说明该文件由编排器初始化、writing-plans 技能补充详细步骤
- `build-orchestrator.ts:70-110` — 在 `generatePlanContent()` 末尾追加占位章节 `## 实施步骤（由 writing-plans 技能填充）`，明确存根定位
- 保留 `state.superpowers.plan` 记录 `openspec/changes/<name>/plan.md`

**与 Comet 差异**：Comet 将 plan 放在 `docs/superpowers/plans/`；Driv 选择放 openspec/ 便于归档，牺牲了 WHAT/HOW 目录分离但简化了文件管理。

### 变更 2：将 brainstorming.md 纳入状态机

**目标**：让 Design 阶段的 Superpowers 产物可追踪、可校验。借鉴 Comet 的 `design_doc` 字段。

**修改文件**：
- `src/core/types.ts:83-85` — 扩展 `superpowers` 接口：
  ```typescript
  superpowers: {
    plan?: string;
    brainstorming?: string;
  };
  ```
- `src/core/state-machine.ts` — 新增 `setBrainstormingPath(changeName, path)` 方法，写入 `state.superpowers.brainstorming` 与 `state.phases.design.artifacts.brainstorming`
- `src/core/phase-guard.ts:336-400`（`checkDesignExit`）— 新增 warning 校验：`state.superpowers.brainstorming` 已设置
- `.opencode/skills/driv-design/SKILL.md:43` — 确认路径 `openspec/changes/<name>/brainstorming.md`，步骤中增加"调用 stateMachine.setBrainstormingPath() 记录路径"

### 变更 3：统一 handoff 文件路径文档

**目标**：消除 handoff 文件路径不一致。借鉴 Comet 的 machine-owned handoff 约束。

**修改文件**：
- `.opencode/skills/driv-design/SKILL.md:42` — 将 `handoff-context.json` 改为 `.driv/handoff/handoff.json`（+ `handoff.md`）
- `.opencode/skills/driv-design/SKILL.md` — 增加 Comet 风格约束说明："Handoff 包由 HandoffManager 脚本生成，agent 不得自行编写摘要"
- `.opencode/skills/driv-build/SKILL.md:10` — 同步更新 handoff context 引用路径

### 变更 4：移除 docs/superpowers/specs/ 目录

**目标**：消除闲置目录。✅ 用户已确认

**修改文件**：
- `src/commands/init.ts:75-80` — 从 `createWorkingDirs()` 移除 `specsDir`
- `src/commands/init.ts:244-246` — 同步移除 specsDir 引用
- `docs/superpowers/plans/` 保留，在 `driv-build/SKILL.md` 注明"用于 writing-plans 技能中间草稿，正式产物为 openspec/changes/<name>/plan.md"

**与 Comet 差异**：Comet 用 `docs/superpowers/specs/` 放 Design Doc；Driv 将 brainstorming.md 放在 openspec/changes/ 内，故该目录无用途。

### 变更 5：明确 design.md 跨阶段语义

**目标**：区分 Clarify 初稿与 Design 定稿。借鉴 Comet 的 WHAT/HOW 分离思想，但保持单文件。

**修改文件**：
- `.opencode/skills/driv-clarify/SKILL.md` — 明确 Clarify 产出 design.md **初稿**（基础设计要素，用于转 specs/）
- `.opencode/skills/driv-design/SKILL.md:29` — 明确 Design 是**完善** design.md（补充 FSM/接口/数据流/DOM），非重新生成
- 通过 `design-converted`（Clarify）和 `detailed-design-completed`（Design）两个 artifact 标记区分阶段进度

### 变更 6：Build 入口校验 Superpowers 技能可用性

**目标**：Build 开始时检测关键技能。借鉴 Comet 的 guard 机制。

**修改文件**：
- `src/core/phase-guard.ts:98-153`（`checkBuildEntry`）— 新增 warning 检查：调用 `detect.ts` 检测 writing-plans 和 test-driven-development 技能

### 变更 7：Build 退出校验 plan 已生成

**目标**：确保 Build 退出时 plan.md 实际存在。借鉴 Comet 的 `plan_tasks_all_done` 校验。

**修改文件**：
- `src/core/phase-guard.ts:402-484`（`checkBuildExit`）— 新增 warning 校验：`state.superpowers.plan` 已设置

### 变更 8（新增，借鉴 Comet）：plan.md 增加 canonical_spec frontmatter

**目标**：借鉴 Comet 的规格真源声明，明确 OpenSpec 为 WHAT 真源、plan.md 为 HOW 产物。

**修改文件**：
- `build-orchestrator.ts:70-110` — 在 `generatePlanContent()` 顶部增加 YAML frontmatter：
  ```yaml
  ---
  canonical_spec: openspec
  role: implementation-plan
  driv_change: <changeName>
  generated_by: BuildOrchestrator
  ---
  ```
- `.opencode/skills/driv-build/SKILL.md` — 说明 writing-plans 技能扩充内容时应保留此 frontmatter

### 变更 9（新增，借鉴 Comet）：Archive 阶段标注 Superpowers 工件闭环

**目标**：借鉴 Comet 的 `archived-with:` 标注，在归档时标记 Superpowers 工件生命周期状态。

**修改文件**：
- `src/core/archive-service.ts:58-140`（`archive()` 方法）— 归档时若 `state.superpowers.plan` 存在，在 plan.md 末尾追加：
  ```
  ---
  archived-with: <changeName>
  status: final
  archived-at: <ISO date>
  ```
- 若 `state.superpowers.brainstorming` 存在，同样标注

### 变更 10：更新相关测试

**修改文件**：
- `test/types.test.ts` — 新增 `superpowers.brainstorming` 字段测试
- `test/state-machine.test.ts` — 新增 `setBrainstormingPath()` 方法测试
- `test/phase-guard.test.ts` — 新增 Design 退出校验 brainstorming、Build 退出校验 superpowers.plan 的测试
- `test/init.test.ts` — 更新 `createWorkingDirs` 测试（移除 specs 目录）
- `test/build-orchestrator.test.ts` — 新增 plan.md frontmatter（canonical_spec/role）测试
- `test/archive-service.test.ts` — 新增归档标注 Superpowers 工件的测试

---

## 假设与决策

### 假设
1. plan.md 统一到 `openspec/changes/<name>/plan.md`（便于归档，牺牲 WHAT/HOW 目录分离）
2. brainstorming.md 放在 `openspec/changes/<name>/brainstorming.md`（与其他工件同级）
3. handoff 文件以代码行为为准（`.driv/handoff/`），更新文档
4. `docs/superpowers/specs/` 移除，`docs/superpowers/plans/` 保留作为中间草稿目录
5. Superpowers 技能可用性检查为 warning 级别（不阻塞流程）
6. canonical_spec frontmatter 为轻量声明，不强制校验（首期）

### 已确认决策
1. **plan.md 策略**：合并为单一文件 `openspec/changes/<name>/plan.md`。✅ 用户已确认
2. **docs/superpowers/specs/ 目录**：移除。✅ 用户已确认

### 借鉴 Comet 的新增决策
3. **canonical_spec 声明**：在 plan.md 增加 frontmatter 声明 OpenSpec 为规格真源（借鉴 Comet `comet-guard.sh:594-599`）
4. **归档闭环标注**：Archive 阶段给 Superpowers 工件追加 `archived-with:` / `status: final`（借鉴 Comet `comet-archive.sh:164-210`）
5. **machine-owned handoff 约束**：SKILL.md 增加"handoff 由脚本生成，agent 不得自行编写摘要"约束（借鉴 Comet `comet-design/SKILL.md:35`）

---

## 验证步骤

1. **类型检查**：`npm run typecheck` 通过
2. **单元测试**：`npm test` 全部通过（当前基线 393 测试 + 新增测试）
3. **文档一致性**：SKILL.md 中声明的所有产物路径与代码实际行为一致
4. **状态完整性**：
   - Clarify 退出：proposal/design/tasks/specs/design-converted 校验通过
   - Design 退出：detailed-design-completed/handoff/technicalReview + brainstorming（warning）校验通过
   - Build 退出：buildMode/tddMode/isolation/committed/tests/clean-code/codeReview + superpowers.plan（warning）校验通过
5. **Comet 模式验证**：
   - plan.md 含 `canonical_spec: openspec` frontmatter
   - Archive 后 plan.md 含 `archived-with:` / `status: final` 标注
   - SKILL.md 含"handoff 由脚本生成"约束说明
6. **端到端验证**：`driv init` 后 `docs/superpowers/specs/` 不再创建；`docs/superpowers/plans/` 仍创建

---

## 实施顺序

1. 类型与状态机变更（types.ts、state-machine.ts）— 基础接口
2. 门禁变更（phase-guard.ts）— 依赖类型
3. 编排器变更（build-orchestrator.ts）— plan.md 存根 + canonical_spec frontmatter
4. 归档变更（archive-service.ts）— 闭环标注 Superpowers 工件
5. init.ts 变更 — 移除 specs 目录创建
6. SKILL.md 文档同步（driv-clarify、driv-design、driv-build）— 含 machine-owned handoff 约束
7. 测试更新与运行
8. 类型检查与全量测试通过
