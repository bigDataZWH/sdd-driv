---
name: driv-clarify
description: 需求澄清 - 通过 openspec-explore 多轮对话，生成完整 OpenSpec 交付件
---

需求澄清：通过 openspec-explore 进行多轮对话，分析存量功能，生成完整的 OpenSpec 交付件。

**Input**: 变更描述或现有的需求信息。

**核心流程**:

1. **前置探索** — 调用 openspec-explore 进行多轮对话，收集需求信息
2. **存量分析** — 提示用户提供代码仓地址，进行存量功能分析（若用户已提供）
3. **方案输出** — 结合用户输入和存量分析结果，给出完整方案

**Steps**:

1. **需求收集** — 通过多轮对话与用户交互，澄清以下问题：
   - 技术栈选择
   - MVP 功能范围
   - UI 风格偏好
   - 代码仓地址（可选，用于存量功能分析）

**⚠️ Decision Point DP-0: 需求确认**
- 暂停工作流，向用户展示当前产出件
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

2. **存量分析** — 若用户提供代码仓地址，分析现有功能结构和代码质量
3. **生成 Change 名称** — 从输入推导 kebab-case change 名称，确保 `openspec/changes/<name>/` 存在
4. **生成 proposal.md** — **必须读取 `.driv/templates/proposals/default.md` 模板作为结构骨架**，包含以下必填章节（不得遗漏）：
   - `## 背景与问题` — 当前问题与业务价值
   - `## 目标与非目标` — 明确范围内/范围外
   - `## 变更范围` — 受影响对象与代码范围
   - `## 验收标准` — 可验证的验收条件（至少 8 条）
   - **必须包含 `## Intent` 章节** — 一句话锁定本次变更核心意图（如：'修复用户登录超时 bug，不改变现有 API 签名'）。该意图将在 Design→Build 边界作为意图锁（Intent Lock）用于 design.md 对齐校验。
   - PhaseGuard 会对 proposal.md 进行章节结构校验（advisory 级别），缺失必填章节会产生警告

**⚠️ Decision Point DP-1: 提案确认**
- 暂停工作流，向用户展示当前产出件
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

5. **生成 tasks.md** — 任务清单（跨 5 阶段，约 22 项），**建议参考 `.driv/templates/` 下的任务清单结构**，每项任务需可验证

**⚠️ Decision Point DP-4: 任务确认**
- 暂停工作流，向用户展示当前产出件
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

6. **生成 specs/<capability>/spec.md** — 能力规格（行为场景描述），**必须参考 `.driv/templates/specs/default.md` 模板结构**，包含以下必填章节：
   - `## 规格概述` — 能力基本信息
   - `## 能力详述` — 能力详细说明
   - `## 行为规格` — 行为场景（GIVEN/WHEN/THEN）
   - 由 AI 直接基于 OpenSpec 模板生成，不经过 design-to-spec-converter 转换

**⚠️ Decision Point DP-2: 规格确认**
- 暂停工作流，向用户展示当前产出件
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

7. **生成 reviews/requirement-review.md** — 需求评审（AI 预检）
8. **创建 .openspec.yaml** — 记录 schema、change、phase、status、created 和 proposal artifact
9. **创建 .driv.yaml** — 初始化状态文件，设置 clarify 阶段为 in-progress
10. **输出结果** — 显示生成的文件清单和下一步 `/driv-design`

**Output**:

- **生成文件**:
  - `openspec/changes/<name>/proposal.md` — 功能提案（包含验收标准）
  - `openspec/changes/<name>/design.md` — 设计文档**初稿**（含基础设计要素；Design 阶段会在此基础上完善定稿）
  - `openspec/changes/<name>/tasks.md` — 任务清单（跨 5 阶段）
  - `openspec/changes/<name>/specs/<name>.md` — 能力规格（行为场景）
  - `openspec/changes/<name>/reviews/requirement-review.md` — 需求评审（AI 预检）
  - `openspec/changes/<name>/.openspec.yaml` — OpenSpec 元数据
  - `.driv.yaml` — 初始化状态文件
- **状态更新**: phases.clarify（status/in-progress、artifacts/proposal/tasks/specs）
- **下一步**: Clarify 完成后调用 `/driv-design` 进入 Design 阶段

---
Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```
