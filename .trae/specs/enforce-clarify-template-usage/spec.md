# Clarify 阶段模板强制使用与结构校验 Spec

## Why

当前 clarify 阶段生成 proposal.md / tasks.md / specs 时未程序化调用 TemplateManager，仅靠 SKILL.md 自然语言提示 AI "使用模板"，代码层面无强制机制。方案 A 通过最小改动填补文档-代码一致性缺口。

## What Changes

- 模板 frontmatter 新增 `required_sections` 字段声明必填章节
- TemplateManager 新增 `getRequiredSections(type, name)` 接口
- PhaseGuard `checkClarifyExit()` 新增章节结构校验（advisory 级别，不阻断）
- driv-clarify SKILL.md 强化模板使用指令

## ADDED Requirements

### Requirement: 模板必填章节声明
模板文件 SHALL 在 frontmatter 中通过 `required_sections` 声明必填章节列表。

### Requirement: TemplateManager 暴露必填章节查询接口
`TemplateManager` SHALL 提供 `getRequiredSections(type, name)` 返回必填章节列表，无声明时返回空数组。

### Requirement: PhaseGuard clarify 退出章节结构校验
`checkClarifyExit()` SHALL 对 proposal.md 进行章节结构校验，缺失必填章节时产生 advisory 级别 failure（不阻断）。

### Requirement: SKILL.md 强化模板使用指令
`driv-clarify/SKILL.md` SHALL 将"使用模板"从可选提示改为强约束指令。

## Constraints

- 章节校验为 advisory 级别，不阻断 clarify→design 转换
- 不新增 Service 层
- 必填章节匹配使用 `content.includes('## ' + sectionName)` 简单判断
