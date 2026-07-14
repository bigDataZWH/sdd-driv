## 1. PRD 模板与基础设施

- [ ] 1.1 新增 `.driv/templates/prd/default.md` PRD 模板（含 required_sections frontmatter）
- [ ] 1.2 TemplateManager 支持 prd 类型（getRequiredSections('prd', 'default')）
- [ ] 1.3 新增 PRD 模板测试

## 2. 数据结构变更（types.ts）

- [ ] 2.1 `createDefaultState` 新增 `openspec.prd` 字段，初始指向 `prd.md`
- [ ] 2.2 `phases.clarify.artifacts` 改为 `{ prd: ... }`，移除 proposal/design/tasks/specs
- [ ] 2.3 `phases.design.artifacts` 增加 `proposal`/`design`/`tasks`/`specs`/`design-converted` 字段
- [ ] 2.4 更新 types.test.ts 断言

## 3. StateMachine 方法调整

- [ ] 3.1 新增 `setPrdPath(changeName, prdPath)` 方法，更新 openspec.prd 和 phases.clarify.artifacts.prd
- [ ] 3.2 新增 `setProposalPath(changeName, path)` 方法，更新 openspec.proposal 和 phases.design.artifacts.proposal
- [ ] 3.3 新增 `setTasksPath(changeName, path)` 方法，更新 openspec.tasks 和 phases.design.artifacts.tasks
- [ ] 3.4 调整 `setDesignPath` artifacts 目标从 clarify 移到 design
- [ ] 3.5 调整 `setSpecsPaths` artifacts 目标从 clarify 移到 design
- [ ] 3.6 新增 `setDesignConverted(changeName, value)` 方法
- [ ] 3.7 更新 state-machine.test.ts

## 4. PhaseGuard 校验逻辑重写

- [ ] 4.1 重写 `checkClarifyExit`：校验 prd 路径已设置 + clarify status completed + advisory PRD 章节校验
- [ ] 4.2 扩展 `checkDesignExit`：新增 proposal/specs/tasks/design-converted 校验（从 clarify 移入）
- [ ] 4.3 迁移 proposal 章节校验和 EARS 校验从 checkClarifyExit 到 checkDesignExit
- [ ] 4.4 更新 phase-guard.test.ts

## 5. 决策点重分布

- [ ] 5.1 `decision-point.ts` 中 DP-1 的 phase 从 'clarify' 改为 'design'
- [ ] 5.2 DP-2 的 phase 从 'clarify' 改为 'design'
- [ ] 5.3 DP-4 的 phase 从 'clarify' 改为 'design'
- [ ] 5.4 更新 decision-point 相关测试

## 6. Clarify SKILL.md 重写

- [ ] 6.1 删除生成 proposal/tasks/specs/reviews/.openspec.yaml 的步骤
- [ ] 6.2 新增生成 PRD 步骤（使用 prd/default.md 模板）
- [ ] 6.3 保留 DP-0 需求确认，删除 DP-1/DP-2/DP-4 引用
- [ ] 6.4 简化 .openspec.yaml 和 .driv.yaml 初始化步骤
- [ ] 6.5 更新 Output 部分（产出件改为 PRD + 状态文件）

## 7. Design SKILL.md 扩展

- [ ] 7.1 新增前置步骤：读取 PRD 作为输入
- [ ] 7.2 在 brainstorming 后新增：生成 proposal.md（基于 PRD + brainstorming）
- [ ] 7.3 新增 DP-1 提案确认
- [ ] 7.4 新增：生成 specs/（基于设计决策）
- [ ] 7.5 新增 DP-2 规格确认
- [ ] 7.6 新增：生成 tasks.md（基于设计决策拆分）
- [ ] 7.7 新增 DP-4 任务确认
- [ ] 7.8 保留现有 design.md/handoff/technical-review 步骤
- [ ] 7.9 更新 Output 部分（产出件增加 proposal/tasks/specs/reviews）

## 8. 命令文件同步

- [ ] 8.1 更新 `.opencode/commands/driv-clarify.md` 与 SKILL.md 一致
- [ ] 8.2 更新 `.opencode/commands/driv-design.md` 与 SKILL.md 一致

## 9. context-recovery 兼容

- [ ] 9.1 验证 Clarify 阶段崩溃后 context-recovery 可恢复 PRD 路径
- [ ] 9.2 验证旧格式 .driv.yaml（无 prd 字段）不崩溃
- [ ] 9.3 更新 context-recovery.test.ts

## 10. 全量测试与验证

- [ ] 10.1 运行全量测试通过
- [ ] 10.2 验证 driv-commands.test.ts 的文案一致性校验
- [ ] 10.3 验证 status 命令输出正确（clarify 阶段提示 /driv-clarify）
