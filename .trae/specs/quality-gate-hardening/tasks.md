# Tasks

- [x] Task 1: 修复 TDD 检查逻辑漏洞
  - [x] SubTask 1.1: 修改 `src/core/phase-guard.ts:468` 的 `!state.tddMode` 检查，改为根据 tddMode 值分级校验（'tdd' 严格、'tdd-lite' 宽松、'no-tdd' 跳过+warning、空值 error）
  - [x] SubTask 1.2: 更新 `test/phase-guard.test.ts` 中 tddMode 相关测试，覆盖 4 种场景（tdd/tdd-lite/no-tdd/空值）

- [x] Task 2: 配置 vitest coverage
  - [x] SubTask 2.1: `package.json` devDependencies 增加 `@vitest/coverage-v8`
  - [x] SubTask 2.2: `package.json` scripts 增加 `"test:coverage": "vitest run --coverage"`
  - [x] SubTask 2.3: `vitest.config.ts` 增加 coverage 配置（provider 'v8'、reporter ['text','json','lcov']、thresholds lines 80/functions 80/branches 70/statements 80）
  - [x] SubTask 2.4: 运行 `npm install` 安装新依赖

- [x] Task 3: verify-service 读取覆盖率数据
  - [x] SubTask 3.1: `VerifyResult` 接口新增 `coveragePassed?: boolean` 和 `coverageSummary?: { lines: number; functions: number; branches: number; statements: number }` 字段
  - [x] SubTask 3.2: 新增 `readCoverage()` 方法，解析 `coverage/coverage-summary.json`
  - [x] SubTask 3.3: `verify()` 方法调用 `readCoverage()`，填充覆盖率字段
  - [x] SubTask 3.4: `passed` 计算纳入 `coveragePassed`（向后兼容：coverage 文件不存在时 coveragePassed=true）
  - [x] SubTask 3.5: `generateReport()` 新增"测试覆盖率"检查项，输出 lines/functions/branches/statements 百分比
  - [x] SubTask 3.6: 更新 `test/verify-service.test.ts` 覆盖覆盖率收集场景

- [x] Task 4: verify-service 集成 lint + typecheck
  - [x] SubTask 4.1: `VerifyResult` 接口新增 `lintPassed?: boolean` 和 `typeCheckPassed?: boolean` 字段
  - [x] SubTask 4.2: 新增 `executeLint()` 方法，调用 `npm run lint`（无 lint script 时返回 true）
  - [x] SubTask 4.3: 新增 `executeTypeCheck()` 方法，调用 `tsc --noEmit`（无 tsconfig.json 时返回 true）
  - [x] SubTask 4.4: `verify()` 方法调用 `executeLint()` 和 `executeTypeCheck()`，填充字段
  - [x] SubTask 4.5: `generateReport()` 新增"Lint 检查"和"类型检查"两项
  - [x] SubTask 4.6: 更新 `test/verify-service.test.ts` 覆盖 lint/typecheck 集成场景

- [x] Task 5: 修复 driv-cleancode.sh 吞错误
  - [x] SubTask 5.1: 移除 `lint()` 函数的 `|| true`
  - [x] SubTask 5.2: 移除 `typecheck()` 函数的 `2>/dev/null` 和 `|| echo`
  - [x] SubTask 5.3: 移除 `format()` 函数的 `2>/dev/null` 和 `|| echo`

- [x] Task 6: runAutoCheck 接入真实工具调用
  - [x] SubTask 6.1: `review-system.ts` 的 `runAutoCheck` 中"代码已提交"改为调用 `git status --porcelain`（异常时回退读状态字段）
  - [x] SubTask 6.2: "测试通过"改为实际运行 `npm test`（异常时回退读状态字段）
  - [x] SubTask 6.3: "Clean Code 通过"改为调用 `CleanCodeChecker.check()` 检查 src/（异常时回退读状态字段）
  - [x] SubTask 6.4: "安全扫描通过"改为运行 `npm audit --audit-level=high`（异常时回退读状态字段）
  - [x] SubTask 6.5: 更新 `test/review-system.test.ts` 覆盖真实工具调用和回退场景

- [x] Task 7: 全量验证
  - [x] SubTask 7.1: 运行 `npm run typecheck` 通过
  - [x] SubTask 7.2: 运行 `npm test` 全部通过（456 测试）
  - [x] SubTask 7.3: 运行 `npm run test:coverage` 验证覆盖率配置生效

# Task Dependencies
- Task 3 和 Task 4 修改同一文件 `verify-service.ts`，建议串行执行（Task 3 先，Task 4 后）
- Task 2 是 Task 3 的前置（coverage 配置需先就位）
- Task 1、Task 5、Task 6 相互独立，可并行
- Task 7 依赖 Task 1-6 全部完成
