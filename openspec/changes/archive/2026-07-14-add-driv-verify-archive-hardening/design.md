# Design: 验证与归档硬化

## Scale 判断

```typescript
async function determineScale(changeName: string): Promise<VerifyScale> {
  const diffFiles = await gitOps.getDiffFiles(baseRef);
  if (diffFiles > 10 || specScope === 'multiple') return 'full';
  if (diffFiles > 3 || testImpact) return 'light';
  return 'light';
}
```

## 命令解析

使用 shell-quote 或安全 split 逻辑：
- 支持 `"npm run test -- --watch"` 引号分组
- Windows 路径自动处理反斜杠转义

## Clean Code 落盘

VerifyService 新增步骤：
1. 运行 Clean Code 检查
2. 生成 clean-code-report.md → reports/ 目录
3. 生成 clean-code-issues.json → reports/ 目录

## 分支处理

| 策略 | branch_status 值 | 行为 |
|------|-----------------|------|
| retain | 'retained' | 保留分支不合并 |
| squash | 'squashed' | squash 合并到 base |
| rebase | 'rebased' | rebase 到 base |
| merge | 'merged' | merge 到 base |
| pr-ready | 'pr-ready' | 标记 PR 就绪 |

## Archive

- 优先调用 openspec archive CLI
- 补充复制 Driv 特有工件（.driv.yaml、subagent-progress）
- 防污染检查：保证 delta spec 路径未出现在主 spec 目录
