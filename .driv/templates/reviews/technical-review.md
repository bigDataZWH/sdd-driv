# 技术评审

## 基本信息

| 项目 | 内容 |
|------|------|
| 变更名称 | {{change_name}} |
| 变更类型 | {{change_type}} |
| 评审人 | {{reviewer}} |
| 评审日期 | {{review_date}} |

## 设计文档

- [design.md]({{design_path}})
- [tasks.md]({{tasks_path}})

## 检查项

### 架构设计

| 序号 | 检查项 | 状态 | 说明 |
|------|--------|------|------|
| 1 | 技术方案可行性 | {{check_1}} | {{check_1_note}} |
| 2 | 架构设计合理性 | {{check_2}} | {{check_2_note}} |
| 3 | 接口设计完整性 | {{check_3}} | {{check_3_note}} |
| 4 | 性能考虑充分 | {{check_4}} | {{check_4_note}} |

### 决策记录审查

| 决策ID | 决策内容 | 评审意见 |
|--------|----------|----------|
{{decisions_table}}

### 任务完整性

| 任务数 | 已设计任务 | 评审意见 |
|--------|------------|----------|
| {{task_count}} | {{task_detail}} | {{task_review}} |

## AI 检查结果

{{ai_review_content}}

## 评审意见

**整体评价**：{{overall_evaluation}}

**通过条件**：
{{pass_conditions}}

## 最终结论

- **状态**: {{status}}
- [ ] 通过
- [ ] 有条件通过：{{conditions}}
- [ ] 不通过：{{rejection_reason}}

## 评审记录

| 轮次 | 评审人 | 日期 | 结论 |
|------|--------|------|------|
| {{round}} | {{reviewer}} | {{review_date}} | {{conclusion}} |
