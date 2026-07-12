# Driv - Clarify 阶段生成完整 OpenSpec 交付件 - 实现计划

## [x] Task 1: 更新 createDefaultState 中的阶段 artifacts 定义
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `types.ts` 的 `createDefaultState` 函数中，更新 clarify 阶段的 artifacts，添加 tasks、specs 和 design-converted 字段
  - 更新 design 阶段的 artifacts，移除 design-converted，添加 detailed-design-completed 字段
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-1.1: createDefaultState('test-change').phases.clarify.artifacts 包含 proposal、design、tasks、specs、design-converted
  - `programmatic` TR-1.2: createDefaultState('test-change').phases.design.artifacts 包含 detailed-design-completed，不包含 design-converted

## [x] Task 2: 更新 PhaseGuard.checkClarifyExit 添加完整 OpenSpec 交付件检查
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在 `phase-guard.ts` 的 `checkClarifyExit` 方法中，添加对 state.openspec.specs（非空数组）的检查
  - 添加对 state.openspec.tasks 的检查
  - 添加对 state.phases.clarify.artifacts['design-converted'] 的检查
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-2.1: checkClarifyExit 在 specs 为空数组时返回失败
  - `programmatic` TR-2.2: checkClarifyExit 在 tasks 未设置时返回失败
  - `programmatic` TR-2.3: checkClarifyExit 在 design-converted 未设置时返回失败
  - `programmatic` TR-2.4: checkClarifyExit 在所有条件满足时返回成功

## [x] Task 3: 更新 PhaseGuard.checkDesignExit 修改检查逻辑
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 在 `phase-guard.ts` 的 `checkDesignExit` 方法中，移除对 state.openspec.specs 和 state.phases.design.artifacts['design-converted'] 的检查
  - 添加对 state.phases.design.artifacts['detailed-design-completed'] 的检查
  - 保留 handoff 和技术评审的检查
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-3.1: checkDesignExit 在 detailed-design-completed 未设置时返回失败
  - `programmatic` TR-3.2: checkDesignExit 在 detailed-design-completed 设置为 true 时不阻塞（其他条件满足）
  - `programmatic` TR-3.3: checkDesignExit 不再检查 specs 数组
  - `programmatic` TR-3.4: checkDesignExit 不再检查 design-converted 状态

## [x] Task 4: 更新 StateMachine 添加新方法支持新职责
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 确保 `setSpecsPaths` 和 `setDesignConverted` 方法可在 Clarify 阶段调用
  - 添加新方法 `setDetailedDesignCompleted(changeName: string)` 用于在 Design 阶段标记详细设计完成
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: setDetailedDesignCompleted 方法正确更新 state.phases.design.artifacts['detailed-design-completed'] 为 'true'
  - `programmatic` TR-4.2: setSpecsPaths 正确更新 clarify 阶段的 artifacts（如果需要）
  - `programmatic` TR-4.3: setDesignConverted 正确更新 clarify 阶段的 artifacts（如果需要）

## [x] Task 5: 更新单元测试以反映新的阶段职责
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**: 
  - 更新 `types.test.ts` 验证新的默认状态结构
  - 更新 `phase-guard.test.ts` 验证 clarify 和 design 阶段的新退出规则
  - 更新 `state-machine.test.ts` 验证新方法和状态更新
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-5.1: types.test.ts 所有测试通过
  - `programmatic` TR-5.2: phase-guard.test.ts 所有测试通过
  - `programmatic` TR-5.3: state-machine.test.ts 所有测试通过