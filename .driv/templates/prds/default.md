---
template: prd-default
version: 1.0
based_on: 产品需求文档标准
placeholders_required:
  - change_name
  - proposer
  - created_at
required_sections:
  - 需求背景
  - 用户故事
  - 功能范围
  - 验收标准
---

# 产品需求文档：{{change_name}}

## 一、基本信息

| 项目 | 内容 |
|------|------|
| 变更名称 | {{change_name}} |
| 提案人 | {{proposer}} |
| 创建日期 | {{created_at}} |
| 当前状态 | {{status:草稿/已确认}} |

## 二、需求背景

### 2.1 背景说明

{{background}}

### 2.2 当前问题

{{problem_statement}}

### 2.3 业务价值

{{business_value}}

## 三、用户故事

{{user_stories}}

## 四、功能范围

### 4.1 范围内

{{in_scope}}

### 4.2 范围外

{{out_scope}}

## 五、验收标准

{{acceptance_criteria}}

## 六、技术约束

{{technical_constraints}}
