---
name: driv-clarify
description: 需求澄清 - 通过多轮对话生成 PRD（产品需求文档），初始化状态文件
---

需求澄清：通过多轮对话与用户交互，分析存量功能，生成 PRD（产品需求文档）并初始化状态文件。

**Input**: 变更描述或现有的需求信息。

**核心流程**:

1. **前置探索** — 通过多轮对话收集需求信息
2. **存量分析** — 提示用户提供代码仓地址，进行存量功能分析（若用户已提供）
3. **PRD 生成** — 结合用户输入和存量分析结果，生成产品需求文档
4. **状态初始化** — 创建 .openspec.yaml 和 .driv.yaml

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
4. **生成 prd.md** — **必须读取 `.driv/templates/prds/default.md` 模板作为结构骨架**，包含以下必填章节（不得遗漏）：
   - `## 需求背景` — 当前问题与业务价值
   - `## 用户故事` — 以用户视角描述需求场景
   - `## 功能范围` — 明确范围内/范围外
   - `## 验收标准` — 可验证的验收条件（至少 5 条）
   - `## 技术约束` — 技术栈、兼容性等约束条件
   - PhaseGuard 会对 prd.md 进行章节结构校验（advisory 级别），缺失必填章节会产生警告

5. **创建 .openspec.yaml** — 记录 schema、change、phase、status、created
6. **创建 .driv.yaml** — 初始化状态文件，设置 clarify 阶段为 in-progress，记录 prd 路径
7. **输出结果** — 显示生成的文件清单和下一步 `/driv-design`

**Output**:

- **生成文件**:
  - `openspec/changes/<name>/prd.md` — 产品需求文档（包含验收标准）
  - `openspec/changes/<name>/.openspec.yaml` — OpenSpec 元数据
  - `.driv.yaml` — 初始化状态文件
- **状态更新**: phases.clarify（status/in-progress、artifacts/prd）
- **下一步**: Clarify 完成后调用 `/driv-design` 进入 Design 阶段（Design 阶段将基于 PRD 生成全套 OpenSpec 交付件）

---
Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```
