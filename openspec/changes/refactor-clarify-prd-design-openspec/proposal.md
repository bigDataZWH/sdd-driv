# 变更提案：refactor-clarify-prd-design-openspec

## 一、基本信息

| 项目 | 内容 |
|------|------|
| 变更名称 | refactor-clarify-prd-design-openspec |
| 变更类型 | 重构 |
| 提案人 | AI |
| 创建日期 | 2026-07-14 |
| 当前状态 | 草稿 |

## 二、背景与问题

### 2.1 背景说明

当前 Driv 五阶段工作流中，Clarify 阶段承担了全部 OpenSpec 交付件的生成（proposal.md、design.md 初稿、tasks.md、specs/、reviews/requirement-review.md、.openspec.yaml），而 Design 阶段仅做设计完善（brainstorming + design.md 定稿）。这导致 Clarify 阶段职责过重，与"需求澄清"的语义不匹配。

### 2.2 当前问题

1. **阶段语义错位**：Clarify（需求澄清）阶段直接生成 specs（行为规格）和 tasks（任务清单），但此时设计尚未展开，这些产物可能与最终设计脱节。
2. **Specs 过早固化**：specs 在需求阶段就确定，Design 阶段 brainstorming 后往往需要大幅修改，产生返工。
3. **用户认知负担重**：Clarify 阶段要求用户连续确认 4 个决策点（DP-0 需求、DP-1 提案、DP-4 任务、DP-2 规格），非技术用户面对 proposal+specs+tasks 等结构化产物时认知负担高。
4. **proposal.md 质量不稳定**：proposal.md 在 Clarify 阶段早期生成，缺乏设计决策支撑，Design 阶段可能需大幅修改。

### 2.3 业务价值

- 提升阶段语义自洽性，降低用户认知负担
- specs 基于设计决策生成，提高产物质量
- 减少跨阶段返工，提高整体交付效率

## 三、目标与非目标

### 3.1 目标

1. Clarify 阶段仅生成 PRD（产品需求文档）并初始化状态文件（.driv.yaml / .openspec.yaml）
2. Design 阶段基于 PRD + brainstorming 生成全套 OpenSpec 交付件（proposal.md / design.md / tasks.md / specs/ / reviews/）
3. 调整 PhaseGuard 校验逻辑：checkClarifyExit 校验 PRD，checkDesignExit 校验 OpenSpec 交付件
4. 重新分布决策点：需求确认留在 Clarify，提案/任务/规格确认移至 Design
5. 新增 PRD 模板，将 OpenSpec 模板使用从 Clarify 移至 Design
6. 保持 context-recovery 健壮性：Clarify 阶段仍初始化 .driv.yaml

### 3.2 非目标

- 不改变五阶段整体流程顺序（clarify → design → build → verify → archive）
- 不改变 Build/Verify/Archive 阶段逻辑
- 不引入新的阶段或子阶段
- 不改变 .driv.yaml 的文件格式，仅调整 clarify/design 阶段的 artifacts 字段

## 四、变更范围

### 4.1 范围内

- **src/core/types.ts**：调整 `createDefaultState`，clarify artifacts 改为 PRD 路径，design artifacts 增加 OpenSpec 交付件路径
- **src/core/phase-guard.ts**：重写 `checkClarifyExit`（校验 PRD），扩展 `checkDesignExit`（新增 OpenSpec 交付件校验）
- **src/core/decision-point.ts**：调整 DP-1/DP-2/DP-4 的 phase 从 `clarify` 改为 `design`
- **src/core/state-machine.ts**：新增 `setPrdPath` 方法，调整 `setDesignPath`/`setSpecsPaths`/`setTasksPath` 归属到 design 阶段
- **.opencode/skills/driv-clarify/SKILL.md**：重写工作流，仅生成 PRD
- **.opencode/skills/driv-design/SKILL.md**：扩展工作流，增加 OpenSpec 交付件生成步骤
- **.opencode/commands/driv-clarify.md**：同步更新
- **.opencode/commands/driv-design.md**：同步更新
- **.driv/templates/prd/default.md**：新增 PRD 模板
- **test/**：更新所有相关测试

### 4.2 范围外

- Build/Verify/Archive 阶段的 Skill/Command/PhaseGuard 逻辑
- slash-router.ts 命令注册（命令名不变）
- dispatch.ts 流转规则（clarify→design 不变）

### 4.3 受影响对象

| 对象 | 影响 |
|------|------|
| Clarify 阶段用户 | 产出件从 7 个文件减少为 1 个 PRD + 2 个状态文件，认知负担降低 |
| Design 阶段用户 | 需处理更多步骤，但步骤间逻辑更连贯 |
| 现有进行中 change | 需迁移：已有 openspec 交付件的 change 可跳过 PRD 直接进入 Design |

## 五、验收标准

1. Clarify 阶段退出时，`checkClarifyExit` 仅校验 PRD 文件存在且 `.driv.yaml` 已初始化
2. Clarify 阶段不再生成 proposal.md / design.md / tasks.md / specs/ / reviews/
3. Design 阶段退出时，`checkDesignExit` 校验 proposal / design / specs（非空）/ tasks / design-converted / handoff / technical-review
4. Design 阶段 SKILL.md 包含从 PRD 生成 OpenSpec 交付件的完整步骤
5. 决策点 DP-1（提案确认）、DP-2（规格确认）、DP-4（任务确认）的 phase 改为 `design`
6. 决策点 DP-0（需求确认）保持在 `clarify` 阶段
7. 新增 `.driv/templates/prd/default.md` PRD 模板，包含背景/目标/范围/验收标准章节
8. `createDefaultState` 中 clarify artifacts 包含 `prd` 字段，design artifacts 包含 `proposal`/`design`/`tasks`/`specs`/`design-converted` 字段
9. `StateMachine` 新增 `setPrdPath` 方法，`setProposalPath`/`setTasksPath` 方法归属到 design 阶段
10. 所有现有测试更新并通过（phase-guard.test.ts / state-machine.test.ts / types.test.ts / decision-point.test.ts 等）
11. context-recovery 在 Clarify 阶段崩溃后可从 .driv.yaml 恢复（PRD 路径已记录）

## 六、影响分析

### 6.1 功能影响

- Clarify 阶段产出件大幅简化，用户体验改善
- Design 阶段步骤增加，但流程逻辑更连贯（PRD → brainstorming → proposal → design → specs → tasks → review）

### 6.2 技术影响

- PhaseGuard 校验逻辑重构
- StateMachine 方法归属调整
- ChangeState 数据结构微调（clarify/design artifacts 字段变化）

### 6.3 兼容性影响

- 已有的进行中 change 需迁移处理（若已有 openspec 交付件，可跳过 PRD 直接进入 Design）
- .driv.yaml 格式向后兼容（新增字段，不删除已有字段）

## 七、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Design 阶段步骤过多导致用户疲劳 | 中 | 将 OpenSpec 交付件生成拆分为连续子步骤，每个产出后轻量确认 |
| 已有 change 迁移困难 | 低 | 提供迁移指南：已有交付件的 change 直接标记 clarify 已完成 |
| context-recovery 在 Clarify 阶段信息不足 | 中 | Clarify 仍初始化 .driv.yaml 和 .openspec.yaml，记录 PRD 路径 |

## 八、依赖项

- 无外部依赖
- 依赖现有 TemplateManager、StateMachine、PhaseGuard 基础设施

## 九、后续设计输入

- PRD 模板结构定义（章节、字段）
- Design SKILL.md 的 OpenSpec 生成步骤编排
- 决策点重分布后的 DP 顺序
- StateMachine 新方法签名设计

## Intent

将 Clarify 阶段从生成全套 OpenSpec 交付件简化为仅生成 PRD，将 OpenSpec 交付件生成职责移至 Design 阶段，使阶段语义更自洽、产物质量更高。
