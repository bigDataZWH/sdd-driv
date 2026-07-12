---
template: proposal-config
version: 1.0
extends: proposal-default
---

# 配置变更提案：{{change_name}}

## 一、基本信息

| 项目 | 内容 |
|------|------|
| 变更名称 | {{change_name}} |
| 变更类型 | config |
| 提案人 | {{proposer}} |
| 创建日期 | {{created_at}} |
| 当前状态 | {{status:草稿/评审中/已批准}} |

## 二、变更背景

{{background}}

## 三、配置变更清单

| 配置项 | 当前值 | 目标值 | 说明 |
|--------|--------|--------|------|
{{config_changes}}

## 四、默认值变化

{{default_changes}}

## 五、兼容性分析

{{backward_compatibility}}

## 六、影响范围

{{impact}}

## 七、发布与回滚

### 7.1 发布策略

{{release_strategy}}

### 7.2 回滚策略

{{rollback_plan}}

## 八、验收标准

{{acceptance_criteria}}

## 九、风险与依赖

{{risks}}
