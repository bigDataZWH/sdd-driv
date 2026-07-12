# Design: Driv 技能工作流增强

## /driv 主入口

自动扫描 openspec/changes/ 下的 .driv.yaml，识别：
- 当前 phase
- update 命令推荐的下一步
- 直接建议用户执行 /driv-* 或自动触发

## 技能增强

每个技能将加入：
- /driv-design: brainstorming 硬门禁 → design doc → delta spec patch → self-review → tech review → handoff
- /driv-build: dirty worktree 检查 → decision points → writing-plans → subagent/executing → TDD evidence checkpoints
- /driv-verify: verification-before-completion → scale 判断 → run → branch handling → report → auto-transition
- /driv-archive: 最终确认 → openspec archive → 防污染检查 → 知识库更新

## Hotfix/Tweak

- /driv-hotfix: 紧急修复，跳过 clarify/design，直接 build → verify → archive
- /driv-tweak: 小改动，跳过 clarify/design/全量 verify，直接 build → light verify → archive

## Rules/Hooks

- rules/: Phase guard, dirty worktree, debug gate
- hooks/: 阻止错误阶段写代码的钩子（如果 OpenCode 不支持则仅文档）
