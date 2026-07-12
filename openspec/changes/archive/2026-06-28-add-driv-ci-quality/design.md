# Design: CI 与发布质量

## 新增脚本

```json
{
  "lint": "tsc --noEmit && eslint src/ test/",
  "format": "prettier --write src/ test/",
  "format:check": "prettier --check src/ test/",
  "prepublish-check": "npm run format:check && npm run lint && npm test"
}
```

## 工具选择

- lint: eslint + typescript-eslint（TypeScript 项目标准）
- format: prettier（与 lint 分离）
- CI: GitHub Actions（同 Comet）

## CI Workflow

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run format:check
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

## 发布检查

prepublish-check 在 npm publish 前运行，确保：
1. format 无差异
2. lint 无错误
3. typecheck 通过
4. 所有测试通过
