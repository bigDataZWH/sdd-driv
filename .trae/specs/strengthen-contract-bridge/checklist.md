# Verification Checklist

## 支柱 1：内容级状态检测
- [x] `PhaseGuard.validateHandoffHash()` 不再恒返回 true，而是调用 `HandoffManager.validate()`
- [x] build entry 哈希不匹配时返回 `error` 级失败（非 warning）
- [x] 失败信息包含哪个文件哈希不匹配
- [x] `DirtyWorktreeChecker` 真实检测 git 未提交变更（不再恒返回 dirty:false）
- [x] validateHandoffHash 测试覆盖：匹配通过、不匹配失败、文件缺失失败
- [x] DirtyWorktreeChecker 测试覆盖：干净通过、有变更失败

## 支柱 2：意图锁
- [x] `CompressedContext` 接口包含 `intent: string` 字段
- [x] `CompressedContext` 接口包含 `acceptanceCriteria: string[]` 字段
- [x] `HandoffManager.buildContext()` 从 proposal.md `## Intent`/`## 目标` 抽取 intent
- [x] `HandoffManager.buildContext()` 从 tasks.md 抽取验收标准
- [x] build entry 校验 design.md 与 intent 对齐
- [x] Clarify SKILL.md 要求 proposal.md 包含 `## Intent` 章节
- [x] driv-clarify.md 命令文档同步 Intent 章节要求
- [x] intent 抽取和校验测试通过

## 支柱 3：Decision Point
- [x] `DecisionPoint.require()` 不再默认返回 `confirmed: true`
- [x] 8 个 DP 节点已定义（DP-0 至 DP-7）
- [x] Clarify SKILL.md 接入 DP-0/1/2/4
- [x] Design SKILL.md 接入 DP-3/5
- [x] Build SKILL.md 接入 DP-6
- [x] Verify/Archive SKILL.md 接入 DP-7
- [x] 各 driv-*.md 命令文档同步 DP 暂停行为
- [x] DecisionPoint 重写测试通过（不再默认 confirmed、confirmed:false 阻断）

## 支柱 4：Bug-Investigator 侧路径
- [x] `DebugGate.enforce()` 返回值被 `verify-service.ts` 消费（不再丢弃）
- [x] `enforced: true` 时 verify 流程暂停
- [x] 返回信息包含 investigate 子流程指引
- [x] driv-verify SKILL.md 文档化 investigate 侧路径
- [x] DebugGate 消费逻辑测试通过

## 全量验证
- [x] `npm run typecheck` 通过
- [x] `npm test` 全部通过
