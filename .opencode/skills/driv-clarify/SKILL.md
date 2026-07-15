---
name: driv-clarify
description: 需求澄清 - 通过多轮对话生成华为规范 PRD（产品需求文档），初始化状态文件
---

需求澄清：通过多轮对话与用户交互，分析存量功能，生成符合华为规范的 PRD（产品需求文档）并初始化状态文件。

**Input**: 变更描述或现有的需求信息。

**核心流程**:

1. **前置探索** — 通过多轮对话收集需求信息
2. **存量分析** — 提示用户提供代码仓地址，进行存量功能分析（若用户已提供）
3. **PRD 生成** — 结合用户输入和存量分析结果，生成华为规范的产品需求文档
4. **状态初始化** — 创建 .openspec.yaml 和 .driv.yaml

**Steps**:

1. **需求收集** — 通过多轮对话与用户交互，澄清以下问题：
   - 业务背景与现状问题
   - 业务目标与量化指标（SMART 原则）
   - 用户画像与核心场景
   - 功能范围与优先级（P0/P1/P2）
   - 非功能需求（性能、安全、可用性、可维护性、兼容性）
   - 技术栈选择与约束
   - 依赖关系与风险
   - 里程碑与交付计划
   - 代码仓地址（可选，用于存量功能分析）

**⚠️ Decision Point DP-0: 需求确认**
- 暂停工作流，向用户展示当前产出件
- 等待用户确认（confirmed）后再进入下一步
- 用户拒绝时返回当前步骤修改，不进入下一阶段

2. **存量分析** — 若用户提供代码仓地址，分析现有功能结构和代码质量
3. **生成 Change 名称** — 从输入推导 kebab-case change 名称，确保 `openspec/changes/<name>/` 存在
4. **生成 prd.md** — **必须读取 `.driv/templates/prds/default.md` 模板作为结构骨架**，遵循华为 PRD 规范，包含以下必填章节（不得遗漏）：
   - `## 需求概述` — 需求背景与现状分析
   - `## 需求目标` — SMART 原则的业务目标与量化指标
   - `## 业务价值` — 用户价值、业务价值、技术价值
   - `## 用户场景` — 用户画像、用户故事、核心场景
   - `## 功能需求` — 功能范围、FR 清单（带 P0/P1/P2 优先级）、功能详细说明
   - `## 非功能需求` — 性能、安全、可用性、可维护性、兼容性
   - `## 约束与依赖` — 技术约束、业务约束、依赖关系
   - `## 风险分析` — 风险识别、影响评估、应对策略
   - `## 验收标准` — Given-When-Then 格式，功能验收与非功能验收
   - `## 里程碑` — M1-M5 阶段交付计划
   - PhaseGuard 会对 prd.md 进行章节结构校验（advisory 级别），缺失必填章节会产生警告

5. **创建 .openspec.yaml** — 记录 schema、change、phase、status、created
6. **创建 .driv.yaml** — 初始化状态文件，设置 clarify 阶段为 in-progress，记录 prd 路径
7. **输出结果** — 显示生成的文件清单和下一步 `/driv-design`

**华为 PRD 规范要点**：
- **SMART 原则**：目标必须具体、可衡量、可达、相关、有时限
- **FR 优先级**：P0（Must Have）/ P1（Should Have）/ P2（Nice to Have）
- **非功能需求五维度**：性能、安全、可用性、可维护性、兼容性
- **风险矩阵**：影响 × 概率，制定应对策略
- **量化指标**：每个业务目标必须有可衡量的指标
- **验收标准**：采用 Given-When-Then 格式，确保可验证

**Output**:

- **生成文件**:
  - `openspec/changes/<name>/prd.md` — 华为规范产品需求文档
  - `openspec/changes/<name>/.openspec.yaml` — OpenSpec 元数据
  - `.driv.yaml` — 初始化状态文件
- **状态更新**: phases.clarify（status/in-progress、artifacts/prd）
- **下一步**: Clarify 完成后调用 `/driv-design` 进入 Design 阶段（Design 阶段将基于 PRD 生成全套 OpenSpec 交付件）

---
Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```
