---
description: Run the driv-clarify OpenCode workflow
---

Equivalent skill: `driv-clarify`
Command name: `/driv-clarify`

需求澄清：通过多轮对话生成华为规范 PRD（产品需求文档），初始化状态文件。

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
4. **生成 prd.md** — 使用 `.driv/templates/prds/default.md` 模板，遵循华为 PRD 规范，必填章节：需求概述、需求目标、业务价值、用户场景、功能需求、非功能需求、约束与依赖、风险分析、验收标准、里程碑
5. **创建 .openspec.yaml** — 记录 schema、change、phase、status、created
6. **创建 .driv.yaml** — 初始化状态文件，设置 clarify 阶段为 in-progress
7. **输出结果** — 显示生成的文件清单和下一步 `/driv-design`

**Output**:

- **生成文件**:
  - `openspec/changes/<name>/prd.md` — 华为规范产品需求文档
  - `openspec/changes/<name>/.openspec.yaml` — OpenSpec 元数据
  - `.driv.yaml` — 初始化状态文件
- **状态更新**: phases.clarify（status/in-progress、artifacts/prd）
- **下一步**: Clarify 完成后调用 `/driv-design` 进入 Design 阶段

---
Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```
