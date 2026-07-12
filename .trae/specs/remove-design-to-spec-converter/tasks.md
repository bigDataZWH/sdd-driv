# Tasks

- [x] Task 1: 删除 design-to-spec-converter 源码与编译产物
  - [x] SubTask 1.1: 删除 `src/core/design-to-spec-converter.ts`
  - [x] SubTask 1.2: 删除 `dist/core/design-to-spec-converter.{js,d.ts,js.map}`
- [x] Task 2: 移除 StateMachine.setDesignConverted 方法
  - [x] SubTask 2.1: 从 `src/core/state-machine.ts` 删除 `setDesignConverted` 方法
  - [x] SubTask 2.2: 确认 `setSpecsPaths` 方法保留（仍用于记录 spec 路径）
- [x] Task 3: 移除 types.ts 中的 design-converted 默认字段
  - [x] SubTask 3.1: 从 `createDefaultState()` 的 `clarify.artifacts` 中移除 `'design-converted': 'false'`
  - [x] SubTask 3.2: 保留 `specs` 字段
- [x] Task 4: 更新 phase-guard.ts 的 checkClarifyExit
  - [x] SubTask 4.1: 移除对 `state.phases.clarify.artifacts['design-converted']` 的检查
  - [x] SubTask 4.2: 保留对 `state.openspec.specs` 非空数组的检查
- [x] Task 5: 更新 SKILL.md 和 command 文档
  - [x] SubTask 5.1: 更新 `.opencode/skills/driv-clarify/SKILL.md` — 移除第 10 步"完成设计文档转换"，强化第 6 步说明 AI 直接生成 spec
  - [x] SubTask 5.2: 更新 `.opencode/commands/driv-clarify.md` — 同步移除第 10 步
  - [x] SubTask 5.3: 更新两份文档的 Output 部分，移除 design-converted 引用
- [x] Task 6: 更新测试文件
  - [x] SubTask 6.1: 更新 `test/state-machine.test.ts` — 移除 `setDesignConverted` 测试用例
  - [x] SubTask 6.2: 更新 `test/phase-guard.test.ts` — 移除 `design-converted` 设置，保留 specs 检查
  - [x] SubTask 6.3: 更新 `test/review-system.test.ts` — 移除 `design-converted` 设置
- [x] Task 7: 类型检查与全量测试通过
  - [x] SubTask 7.1: `npm run typecheck` 通过
  - [x] SubTask 7.2: `npm test` 全部通过

# Task Dependencies
- [Task 4] depends on [Task 3]
- [Task 6] depends on [Task 2], [Task 3], [Task 4]
- [Task 7] depends on [Task 1], [Task 2], [Task 3], [Task 4], [Task 5], [Task 6]
