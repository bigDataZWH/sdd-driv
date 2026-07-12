# 质量门禁加固（Quality Gate Hardening）Spec

## Why

Driv 当前的质量门禁存在三类问题：① **TDD 检查逻辑漏洞**——`phase-guard.ts:468` 检查 `!state.tddMode`（字段非空即通过），即使值为 `'no-tdd'` 也能通过，TDD 形同虚设；② **测试覆盖率完全未收集**——`vitest.config.ts` 无 coverage 配置，`verify-service.ts:132-135` 只看 exit code 不读覆盖率，"伪绿色测试"（如 `expect(true).toBe(true)`）畅通无阻；③ **静态分析未集成到 Verify**——`verify-service.ts` 的 `verify()` 方法不调用 lint/typecheck，`driv-cleancode.sh` 用 `|| true` 和 `2>/dev/null` 吞掉错误；④ **代码评审自动检查只读状态字段**——`review-system.ts:223-308` 的 `runAutoCheck` 只验证 `.driv.yaml` 字符串值，AI 可自报 passed 而无真实工具校验。本 spec 补齐这四项质量门禁，让 Driv 从"AI 自报通过"升级为"真实工具校验"。

## What Changes

### 1. 修复 TDD 检查逻辑漏洞
- `phase-guard.ts:468` 的 `!state.tddMode` 改为：当 `tddMode === 'tdd'` 时才强制 TDD 校验，`'tdd-lite'` 和 `'no-tdd'` 走不同校验路径
- `'tdd'` 模式：必须通过 TDD 强制校验（测试文件存在且测试通过）
- `'tdd-lite'` 模式：仅要求测试通过（不强制测试先于代码）
- `'no-tdd'` 模式：跳过 TDD 校验，但在 build exit 检查中追加 warning 提示"未使用 TDD"

### 2. 配置 vitest coverage
- `package.json` devDependencies 增加 `@vitest/coverage-v8`
- `vitest.config.ts` 增加 coverage 配置：provider 'v8'、reporter ['text','json','lcov']、thresholds（lines 80/functions 80/branches 70/statements 80）
- `package.json` scripts 增加 `"test:coverage": "vitest run --coverage"`

### 3. verify-service 读取覆盖率数据
- `VerifyResult` 接口新增 `coveragePassed?: boolean` 和 `coverageSummary?: { lines: number; functions: number; branches: number; statements: number }` 字段
- `verify()` 方法在 `executeTests` 后解析 `coverage/coverage-summary.json`，填充覆盖率字段
- `passed` 计算改为 `buildPassed && testsPassed && cleanCodePassed && coveragePassed`
- 验证报告新增"测试覆盖率"检查项
- 当 coverage 文件不存在时（如项目未配置 coverage），`coveragePassed` 默认为 `true` 不阻塞（向后兼容）

### 4. verify-service 集成 lint + typecheck
- `VerifyResult` 接口新增 `lintPassed?: boolean` 和 `typeCheckPassed?: boolean` 字段
- `verify()` 方法新增 `executeLint()` 和 `executeTypeCheck()` 调用
- `executeLint()` 调用 `npm run lint`，捕获 exit code
- `executeTypeCheck()` 调用 `tsc --noEmit`，捕获 exit code
- `passed` 计算改为 `buildPassed && testsPassed && cleanCodePassed && coveragePassed && lintPassed && typeCheckPassed`
- 验证报告新增"Lint 检查"和"类型检查"两项
- 当项目无 lint script 或无 tsconfig.json 时，对应字段默认为 `true` 不阻塞（向后兼容）

### 5. 修复 driv-cleancode.sh 吞错误问题
- 移除 `lint()` 函数的 `|| true`
- 移除 `typecheck()` 函数的 `2>/dev/null` 和 `|| echo`
- 移除 `format()` 函数的 `2>/dev/null` 和 `|| echo`
- 让错误真正传播，exit code 反映真实状态

### 6. runAutoCheck 接入真实工具调用
- `review-system.ts` 的 `runAutoCheck` 中，以下检查项从"读状态字段"改为"真实工具调用"：
  - "代码已提交" → 调用 `git status --porcelain` 检查工作区是否干净（而非读 `committed === 'true'`）
  - "测试通过" → 实际运行 `npm test` 检查 exit code（而非读 `tests === 'passed'`）
  - "Clean Code 通过" → 调用 `CleanCodeChecker.check()` 实际检查（而非读 `clean-code === 'passed'`）
  - "安全扫描通过" → 运行 `npm audit --audit-level=high` 检查 exit code（而非读 `security-scan === 'passed'`）
- 真实工具调用失败但状态字段为 passed 时，返回 `passed: false` 并在 detail 中标注"状态字段与实际检查不一致"
- 真实工具调用异常时（如 git/npm 不可用），回退到读状态字段（向后兼容）

## Impact

- **Affected specs**: 无既有 spec 受影响
- **Affected code**:
  - `src/core/phase-guard.ts` — checkBuildExit 的 tddMode 检查逻辑
  - `src/core/verify-service.ts` — VerifyResult 接口、verify 方法、generateReport 方法
  - `src/core/review-system.ts` — runAutoCheck 方法
  - `vitest.config.ts` — coverage 配置
  - `package.json` — devDependencies、scripts
  - `.driv/scripts/driv-cleancode.sh` — 移除错误吞没

## ADDED Requirements

### Requirement: TDD 模式分级校验
The system SHALL apply different validation rules based on the `tddMode` value: strict TDD validation for `'tdd'` mode, relaxed validation for `'tdd-lite'` mode, and skip with warning for `'no-tdd'` mode.

#### Scenario: tddMode 为 'tdd'
- **WHEN** `state.tddMode === 'tdd'`
- **THEN** checkBuildExit 强制校验测试文件存在且测试通过
- **AND** 若测试未通过，返回 error 级失败

#### Scenario: tddMode 为 'tdd-lite'
- **WHEN** `state.tddMode === 'tdd-lite'`
- **THEN** checkBuildExit 仅要求测试通过（不强制测试先于代码）
- **AND** 测试未通过时返回 error 级失败

#### Scenario: tddMode 为 'no-tdd'
- **WHEN** `state.tddMode === 'no-tdd'`
- **THEN** checkBuildExit 跳过 TDD 强制校验
- **AND** 追加 warning 级提示"未使用 TDD 模式，建议启用 TDD 以提升代码质量"

#### Scenario: tddMode 为空
- **WHEN** `!state.tddMode`（字段未设置）
- **THEN** checkBuildExit 返回 error 级失败"TDD 模式未选择"

### Requirement: 测试覆盖率收集
The system SHALL collect test coverage data during verification and SHALL enforce coverage thresholds.

#### Scenario: 项目配置了 coverage
- **WHEN** `coverage/coverage-summary.json` 存在
- **THEN** VerifyService 解析该文件，填充 `coverageSummary` 字段
- **AND** 当任一指标低于阈值（lines 80/functions 80/branches 70/statements 80）时，`coveragePassed = false`
- **AND** `passed` 计算纳入 `coveragePassed`

#### Scenario: 项目未配置 coverage
- **WHEN** `coverage/coverage-summary.json` 不存在
- **THEN** `coveragePassed` 默认为 `true`（向后兼容，不阻塞）
- **AND** `coverageSummary` 为 undefined

### Requirement: Lint 集成到 Verify
The system SHALL run lint during verification and SHALL block verification on lint failure.

#### Scenario: 项目配置了 lint script
- **WHEN** `package.json` 存在 `lint` script
- **THEN** VerifyService 调用 `npm run lint`
- **AND** exit code 非 0 时 `lintPassed = false`
- **AND** `passed` 计算纳入 `lintPassed`

#### Scenario: 项目未配置 lint script
- **WHEN** `package.json` 无 `lint` script
- **THEN** `lintPassed` 默认为 `true`（向后兼容）

### Requirement: 类型检查集成到 Verify
The system SHALL run TypeScript type checking during verification and SHALL block verification on type errors.

#### Scenario: 项目有 tsconfig.json
- **WHEN** `tsconfig.json` 存在
- **THEN** VerifyService 调用 `tsc --noEmit`
- **AND** exit code 非 0 时 `typeCheckPassed = false`
- **AND** `passed` 计算纳入 `typeCheckPassed`

#### Scenario: 项目无 tsconfig.json
- **WHEN** `tsconfig.json` 不存在
- **THEN** `typeCheckPassed` 默认为 `true`（向后兼容）

### Requirement: 代码评审真实工具校验
The system SHALL validate review checklist items using real tool calls rather than only reading state fields.

#### Scenario: 代码已提交检查
- **WHEN** runAutoCheck 执行"代码已提交"项
- **THEN** 调用 `git status --porcelain` 检查工作区是否干净
- **AND** 工作区干净时 passed=true，有未提交变更时 passed=false

#### Scenario: 测试通过检查
- **WHEN** runAutoCheck 执行"测试通过"项
- **THEN** 实际运行 `npm test` 检查 exit code
- **AND** exit code 0 时 passed=true，非 0 时 passed=false

#### Scenario: Clean Code 通过检查
- **WHEN** runAutoCheck 执行"Clean Code 通过"项
- **THEN** 调用 CleanCodeChecker 实际检查 src/ 目录
- **AND** 全部文件通过时 passed=true，任一失败时 passed=false

#### Scenario: 安全扫描通过检查
- **WHEN** runAutoCheck 执行"安全扫描通过"项
- **THEN** 运行 `npm audit --audit-level=high` 检查 exit code
- **AND** exit code 0 时 passed=true，非 0 时 passed=false

#### Scenario: 工具调用异常回退
- **WHEN** 真实工具调用抛出异常（如 git/npm 不可用）
- **THEN** 回退到读状态字段（向后兼容）
- **AND** detail 中标注"工具调用失败，回退到状态字段检查"

### Requirement: driv-cleancode.sh 错误传播
The system SHALL propagate errors from lint, format, and typecheck commands in driv-cleancode.sh.

#### Scenario: lint 失败
- **WHEN** `npm run lint` 返回非 0 exit code
- **THEN** driv-cleancode.sh 的 lint 函数返回非 0 exit code（而非 `|| true` 吞掉）

#### Scenario: typecheck 失败
- **WHEN** `tsc --noEmit` 返回非 0 exit code
- **THEN** driv-cleancode.sh 的 typecheck 函数输出错误信息并返回非 0 exit code（而非 `2>/dev/null` 吞掉）

## MODIFIED Requirements

### Requirement: checkBuildExit TDD 校验
checkBuildExit SHALL apply TDD validation based on `tddMode` value (previously checked `!state.tddMode` which passed even for `'no-tdd'`).

### Requirement: VerifyResult 接口
VerifyResult interface SHALL include `coveragePassed`, `coverageSummary`, `lintPassed`, `typeCheckPassed` fields (previously only had buildPassed/testsPassed/cleanCodePassed/branchHandled).

### Requirement: verify 方法 passed 计算
verify() method SHALL compute `passed` as `buildPassed && testsPassed && cleanCodePassed && coveragePassed && lintPassed && typeCheckPassed` (previously only `buildPassed && testsPassed && cleanCodePassed`).

### Requirement: runAutoCheck
runAutoCheck SHALL use real tool calls for "代码已提交"/"测试通过"/"Clean Code 通过"/"安全扫描通过" items (previously only read state field string values).

### Requirement: vitest 配置
vitest.config.ts SHALL include coverage configuration with provider 'v8', reporters, and thresholds (previously had no coverage config).

## REMOVED Requirements
无移除项。
