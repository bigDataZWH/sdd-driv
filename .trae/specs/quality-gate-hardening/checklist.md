# Verification Checklist

## Task 1: TDD 检查逻辑修复
- [x] `phase-guard.ts:468` 不再使用 `!state.tddMode`，改为根据 tddMode 值分级校验
- [x] tddMode='tdd' 时强制校验测试通过
- [x] tddMode='tdd-lite' 时仅要求测试通过
- [x] tddMode='no-tdd' 时跳过 TDD 校验并追加 warning
- [x] tddMode 为空时返回 error
- [x] phase-guard 测试覆盖 4 种 tddMode 场景

## Task 2: vitest coverage 配置
- [x] `package.json` devDependencies 包含 `@vitest/coverage-v8`
- [x] `package.json` scripts 包含 `test:coverage`
- [x] `vitest.config.ts` 包含 coverage 配置（provider/reporter/thresholds）
- [x] thresholds: lines 80 / functions 80 / branches 70 / statements 80
- [x] `npm install` 成功安装依赖

## Task 3: 覆盖率数据收集
- [x] `VerifyResult` 接口包含 `coveragePassed?: boolean` 字段
- [x] `VerifyResult` 接口包含 `coverageSummary?` 字段（含 lines/functions/branches/statements）
- [x] verify() 方法解析 `coverage/coverage-summary.json`
- [x] coverage 文件不存在时 coveragePassed=true（向后兼容）
- [x] `passed` 计算纳入 `coveragePassed`
- [x] 验证报告输出覆盖率百分比
- [x] verify-service 测试覆盖覆盖率收集场景

## Task 4: lint + typecheck 集成
- [x] `VerifyResult` 接口包含 `lintPassed?: boolean` 字段
- [x] `VerifyResult` 接口包含 `typeCheckPassed?: boolean` 字段
- [x] `executeLint()` 方法调用 `npm run lint`
- [x] `executeTypeCheck()` 方法调用 `tsc --noEmit`
- [x] 无 lint script 时 lintPassed=true（向后兼容）
- [x] 无 tsconfig.json 时 typeCheckPassed=true（向后兼容）
- [x] `passed` 计算纳入 `lintPassed` 和 `typeCheckPassed`
- [x] 验证报告输出 Lint 和类型检查结果
- [x] verify-service 测试覆盖 lint/typecheck 集成场景

## Task 5: driv-cleancode.sh 修复
- [x] `lint()` 函数无 `|| true`
- [x] `typecheck()` 函数无 `2>/dev/null` 和 `|| echo`
- [x] `format()` 函数无 `2>/dev/null` 和 `|| echo`
- [x] lint 失败时脚本返回非 0 exit code

## Task 6: runAutoCheck 真实工具校验
- [x] "代码已提交"调用 `git status --porcelain`
- [x] "测试通过"实际运行 `npm test`
- [x] "Clean Code 通过"调用 CleanCodeChecker
- [x] "安全扫描通过"运行 `npm audit --audit-level=high`
- [x] 工具调用异常时回退读状态字段
- [x] review-system 测试覆盖真实工具调用和回退场景

## Task 7: 全量验证
- [x] `npm run typecheck` 通过
- [x] `npm test` 全部通过
- [x] `npm run test:coverage` 验证覆盖率配置生效
