# Tasks

- [x] Task 1: 支柱 1 — 激活内容级状态检测
  - [x] SubTask 1.1: 重写 `PhaseGuard.validateHandoffHash()` 调用 `HandoffManager.getMismatchedFiles()` 重新计算源文件哈希并比对（替换 phase-guard.ts L220-222 的 `return true`）
  - [x] SubTask 1.2: build entry 哈希不匹配时返回 `error` 级失败（升级自 `warning`），并在失败信息中输出变更文件名
  - [x] SubTask 1.3: 重写 `DirtyWorktreeChecker` 占位为真实 git diff 检测（调用 `git status --porcelain`）
  - [x] SubTask 1.4: 为 validateHandoffHash 真实校验编写测试（哈希匹配通过、不匹配失败、文件缺失失败）
  - [x] SubTask 1.5: 为 DirtyWorktreeChecker 编写测试（干净通过、有变更失败）

- [x] Task 2: 支柱 2 — 引入意图锁（Intent Lock）
  - [x] SubTask 2.1: 扩展 `CompressedContext` 接口新增 `intent: string` 和 `acceptanceCriteria: string[]` 字段
  - [x] SubTask 2.2: `HandoffManager.buildContext()` 从 proposal.md 的 `## Intent`/`## 目标` 章节抽取 intent（一句话摘要）
  - [x] SubTask 2.3: `HandoffManager.buildContext()` 从 tasks.md 抽取结构化验收标准
  - [x] SubTask 2.4: build entry 新增 intent 对齐校验（design.md 是否包含 intent 关键词）
  - [x] SubTask 2.5: 更新 `.opencode/skills/driv-clarify/SKILL.md` 要求 proposal.md 包含 `## Intent` 章节
  - [x] SubTask 2.6: 更新 `.opencode/commands/driv-clarify.md` 同步 Intent 章节要求
  - [x] SubTask 2.7: 为 intent 抽取和校验编写测试

- [x] Task 3: 支柱 3 — 激活 Decision Point（8 个确认点）
  - [x] SubTask 3.1: 重写 `DecisionPoint.require()` 为真实暂停机制（不再默认 `confirmed: true`）
  - [x] SubTask 3.2: 定义 8 个 DP 节点常量（DP-0 需求、DP-1 提案、DP-2 规格、DP-3 设计、DP-4 任务、DP-5 契约、DP-6 批次、DP-7 收尾）
  - [x] SubTask 3.3: 在各阶段 SKILL.md 中接入对应 DP 调用点（clarify: DP-0/1/2/4, design: DP-3/5, build: DP-6, verify/archive: DP-7）
  - [x] SubTask 3.4: 更新 `.opencode/commands/driv-*.md` 同步 DP 暂停行为文档
  - [x] SubTask 3.5: 为 DecisionPoint 重写编写测试（不再默认 confirmed、confirmed:false 阻断）

- [x] Task 4: 支柱 4 — 激活 Bug-Investigator 侧路径
  - [x] SubTask 4.1: 重写 `DebugGate.enforce()` 增强返回信息（包含 investigate 子流程指引）
  - [x] SubTask 4.2: 修复 `verify-service.ts` L224-226 消费 `enforce()` 返回值（enforced:true 时暂停 verify 流程）
  - [x] SubTask 4.3: 更新 `.opencode/skills/driv-verify/SKILL.md` 文档化 investigate 侧路径
  - [x] SubTask 4.4: 为 DebugGate 消费逻辑编写测试

- [x] Task 5: 全量验证
  - [x] SubTask 5.1: 运行 `npm run typecheck` 通过
  - [x] SubTask 5.2: 运行 `npm test` 全部通过

# Task Dependencies
- Task 2 依赖 Task 1（intent 校验复用 handoff 哈希基础设施）
- Task 3 和 Task 4 相互独立，可与 Task 2 并行
- Task 5 依赖 Task 1-4 全部完成
