# 代码评审

## 基本信息

| 项目 | 内容 |
|------|------|
| 变更名称 | {{change_name}} |
| 变更类型 | {{change_type}} |
| 分支 | {{branch}} |
| Commits | {{commit_count}} |
| 代码量 | {{code_stats}} |
| 评审人 | {{reviewer}} |
| 评审日期 | {{review_date}} |

## 自动化检查结果

| 检查项 | 工具 | 状态 | 结果 |
|--------|------|------|------|
| 代码格式 | prettier | {{format_check}} | {{format_result}} |
| ESLint | eslint | {{lint_check}} | {{lint_result}} |
| 单元测试覆盖 | vitest | {{coverage_check}} | {{coverage_result}} |
| 安全扫描 | npm audit | {{security_check}} | {{security_result}} |

## 检查项

| 序号 | 检查项 | 状态 | 说明 |
|------|--------|------|------|
| 1 | 代码符合规范 | {{check_1}} | {{check_1_note}} |
| 2 | 单元测试覆盖 | {{check_2}} | {{check_2_note}} |
| 3 | 无安全漏洞 | {{check_3}} | {{check_3_note}} |
| 4 | 文档与模板同步 | {{check_4}} | {{check_4_note}} |
| 5 | 错误处理完善 | {{check_5}} | {{check_5_note}} |

## AI 代码分析

{{ai_code_analysis}}

## 评审意见

### 亮点

{{strengths}}

### 需要改进

{{improvements}}

## 最终结论

- **状态**: {{status}}
- [ ] 通过
- [ ] 有条件通过：{{conditions}}
- [ ] 不通过：{{rejection_reason}}

## 评审记录

| 轮次 | 评审人 | 日期 | 结论 |
|------|--------|------|------|
| {{round}} | {{reviewer}} | {{review_date}} | {{conclusion}} |
