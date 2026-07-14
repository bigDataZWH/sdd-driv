# 设计文档：refactor-clarify-prd-design-openspec

## 一、设计概述

将 OpenSpec 交付件生成职责从 Clarify 阶段移至 Design 阶段。Clarify 阶段仅生成 PRD（产品需求文档）并初始化状态文件，Design 阶段基于 PRD + brainstorming 生成全套 OpenSpec 交付件。

## 二、阶段职责重定义

### 2.1 Clarify 阶段（重构后）

**输入**：用户的需求描述（自然语言）

**产出**：
- `openspec/changes/<name>/prd.md` — 产品需求文档
- `openspec/changes/<name>/.openspec.yaml` — OpenSpec 元数据
- `.driv.yaml` — 状态文件（clarify 阶段 in-progress）

**工作流**：
1. 多轮需求对话（openspec-explore）
2. 存量代码库分析（可选）
3. 推导 change 名称
4. 生成 PRD（基于模板）
5. **DP-0 需求确认** → 用户确认 PRD
6. 初始化 .openspec.yaml 和 .driv.yaml
7. 输出结果，提示下一步 `/driv-design`

**退出条件（checkClarifyExit）**：
- `prd` 路径已设置（error）
- PRD 文件包含必填章节（advisory warning）
- clarify 阶段 status === 'completed'（error）

### 2.2 Design 阶段（重构后）

**输入**：PRD + .driv.yaml 上下文

**产出**：
- `openspec/changes/<name>/proposal.md` — 变更提案（基于 PRD）
- `openspec/changes/<name>/design.md` — 设计文档（基于 brainstorming）
- `openspec/changes/<name>/tasks.md` — 任务清单
- `openspec/changes/<name>/specs/<capability>/spec.md` — 能力规格
- `openspec/changes/<name>/reviews/requirement-review.md` — 需求评审
- `openspec/changes/<name>/reviews/technical-review.md` — 技术评审
- `openspec/changes/<name>/.driv/handoff/handoff.json` — 交接包

**工作流**：
1. 读取 PRD，生成 handoff-context
2. **DP-5 契约确认**
3. 调用 brainstorming 进行设计发散-收敛
4. 基于 PRD + brainstorming 生成 `proposal.md`
5. **DP-1 提案确认**
6. 生成 `specs/<capability>/spec.md`
7. **DP-2 规格确认**
8. 生成 `tasks.md`（基于设计决策拆分）
9. **DP-4 任务确认**
10. 生成 `design.md`（定稿，含 FSM/接口/数据流）
11. **DP-3 设计确认**
12. 生成 `reviews/requirement-review.md`
13. 生成 `reviews/technical-review.md`
14. 更新 .driv.yaml（design 阶段 completed）

**退出条件（checkDesignExit）**：
- `proposal` 路径已设置（error）
- `design` 路径已设置（error）
- `specs` 非空数组（error）
- `tasks` 路径已设置（error）
- `design-converted` === 'true'（error）
- `detailed-design-completed` === 'true'（error）
- `handoff` 已生成（error）
- `technicalReview` === 'passed'（error）
- `brainstorming` 路径已设置（warning）

## 三、数据结构变更

### 3.1 ChangeState 调整（types.ts）

```
createDefaultState 变更:
  openspec: {
    changeDir,
    prd: `${changeDir}/prd.md`,          // 新增
    // proposal/design/specs/tasks 初始不设置，由 Design 阶段填充
  }

  phases.clarify.artifacts: {
    prd: `${changeDir}/prd.md`,           // 替换原 proposal/design/tasks/specs
  }

  phases.design.artifacts: {
    proposal: `${changeDir}/proposal.md`,  // 从 clarify 移入
    design: `${changeDir}/design.md`,      // 从 clarify 移入
    tasks: `${changeDir}/tasks.md`,         // 从 clarify 移入
    specs: `${changeDir}/specs.json`,      // 从 clarify 移入
    'design-converted': 'false',            // 新增
    'detailed-design-completed': 'false',  // 已有
  }
```

### 3.2 StateMachine 新方法

```typescript
// 新增
setPrdPath(changeName, prdPath): 更新 openspec.prd 和 phases.clarify.artifacts.prd

// 调整归属（从 clarify 移到 design）
setProposalPath(changeName, path): 更新 openspec.proposal 和 phases.design.artifacts.proposal
setDesignPath(changeName, path): 更新 openspec.design 和 phases.design.artifacts.design  // 已有，仅 artifacts 目标调整
setTasksPath(changeName, path): 更新 openspec.tasks 和 phases.design.artifacts.tasks
setSpecsPaths(changeName, paths): 更新 openspec.specs 和 phases.design.artifacts.specs    // 已有，仅 artifacts 目标调整
setDesignConverted(changeName, value): 设置 phases.design.artifacts['design-converted']
```

### 3.3 决策点重分布（decision-point.ts）

| DP | 原阶段 | 新阶段 | 说明 |
|----|--------|--------|------|
| DP-0 需求确认 | clarify | clarify | 不变 |
| DP-1 提案确认 | clarify | design | 移至 Design |
| DP-2 规格确认 | clarify | design | 移至 Design |
| DP-4 任务确认 | clarify | design | 移至 Design |
| DP-5 契约确认 | design | design | 不变 |
| DP-3 设计确认 | design | design | 不变 |

## 四、PRD 模板设计

### 4.1 模板路径

`.driv/templates/prd/default.md`

### 4.2 模板结构

```markdown
---
template: prd-default
version: 1.0
required_sections:
  - 需求背景
  - 用户故事
  - 功能范围
  - 验收标准
---

# 产品需求文档：{{change_name}}

## 需求背景
{{background}}

## 用户故事
{{user_stories}}

## 功能范围
### 范围内
{{in_scope}}
### 范围外
{{out_of_scope}}

## 验收标准
{{acceptance_criteria}}

## 技术约束
{{technical_constraints}}
```

### 4.3 与 proposal.md 的关系

| 维度 | PRD | proposal.md |
|------|-----|------------|
| 生成阶段 | Clarify | Design |
| 面向对象 | 产品/业务 | 技术/工程 |
| 内容焦点 | 做什么、为什么 | 怎么做、影响什么 |
| 设计依赖 | 无 | 依赖 brainstorming 结果 |
| Intent Lock | 无 | 包含 `## Intent` 章节 |

## 五、PhaseGuard 校验逻辑变更

### 5.1 checkClarifyExit（重写）

```
校验项:
1. state.openspec.prd 路径已设置 (error)
2. clarify 阶段 status === 'completed' (error)
3. advisory: PRD 文件包含 required_sections (warning)
```

### 5.2 checkDesignExit（扩展）

```
校验项:
1. state.openspec.proposal 路径已设置 (error)
2. state.openspec.design 路径已设置 (error)
3. state.openspec.specs 非空数组 (error)
4. state.openspec.tasks 路径已设置 (error)
5. design-converted === 'true' (error)
6. detailed-design-completed === 'true' (error)
7. handoff 已生成 (error)
8. technicalReview === 'passed' (error)
9. brainstorming 路径已设置 (warning)
10. advisory: proposal 章节结构校验 (warning)
11. advisory: specs EARS 句式校验 (warning)
```

## 六、SKILL.md 变更

### 6.1 driv-clarify/SKILL.md

- 删除步骤 4-8（生成 proposal/tasks/specs/reviews/.openspec.yaml）
- 新增步骤：生成 PRD（使用 prd/default.md 模板）
- 保留 DP-0 需求确认
- 删除 DP-1/DP-2/DP-4
- 保留 .openspec.yaml 和 .driv.yaml 初始化（简化版）

### 6.2 driv-design/SKILL.md

- 新增前置步骤：读取 PRD
- 在 brainstorming 后新增步骤：生成 proposal.md → 生成 specs/ → 生成 tasks.md
- 新增 DP-1/DP-2/DP-4
- 保留现有 DP-5/DP-3

## 七、迁移策略

### 7.1 已有进行中 change

- 若 change 已有 proposal.md（即 Clarify 旧流程已完成），标记为可直接进入 Design
- 迁移工具：检测 `openspec.proposal` 是否已设置，若已设置则跳过 PRD 生成

### 7.2 .driv.yaml 兼容性

- 新增 `openspec.prd` 字段，旧 .driv.yaml 无此字段时不阻断（兼容）
- `phases.clarify.artifacts` 支持新旧两种格式（prd 或 proposal/design/tasks/specs）
- `phases.design.artifacts` 扩展字段，旧格式缺少新字段时由 Design SKILL.md 填充

## 八、测试策略

| 测试文件 | 变更内容 |
|----------|----------|
| phase-guard.test.ts | 重写 checkClarifyExit 测试（校验 PRD）；扩展 checkDesignExit 测试（校验 OpenSpec 交付件） |
| types.test.ts | 更新 createDefaultState 期望（prd 字段、clarify/design artifacts） |
| state-machine.test.ts | 新增 setPrdPath/setProposalPath/setTasksPath 测试；调整 setDesignPath/setSpecsPaths 归属 |
| decision-point.test.ts | 更新 DP-1/DP-2/DP-4 的 phase 期望为 design |
| slash-router.test.ts | 无变更（命令名不变） |
| dispatch.test.ts | 无变更（流转规则不变） |
| context-recovery.test.ts | 验证 Clarify 阶段崩溃后可从 .driv.yaml 恢复 PRD 路径 |
