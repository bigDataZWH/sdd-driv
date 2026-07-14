# Checklist

- [x] `.driv/templates/proposals/default.md` frontmatter 包含 `required_sections`
- [x] `.driv/templates/proposals/feature.md` / `bugfix.md` / `refactor.md` / `config.md` / `docs.md` 同步包含
- [x] `.driv/templates/designs/default.md` frontmatter 包含 `required_sections`
- [x] `.driv/templates/specs/default.md` frontmatter 包含 `required_sections`
- [x] `TemplateManager.getRequiredSections('proposal', 'default')` 返回正确章节列表
- [x] `TemplateManager.getRequiredSections()` 模板无声明时返回空数组
- [x] `checkClarifyExit()` 在 proposal 缺失必填章节时产生 advisory 级别 failure
- [x] advisory failure 不阻断流程（`passed` 仍为 true）
- [x] `checkClarifyExit()` 在 proposal 包含所有必填章节时不产生 failure
- [x] 模板无 `required_sections` 时 `checkClarifyExit()` 跳过章节校验
- [x] `driv-clarify/SKILL.md` 步骤 4 明确列出必填章节
- [x] `driv-clarify/SKILL.md` 步骤 5、6 同步强化模板使用指令
- [x] 全量测试通过（pre-existing dispatch-assets 失败除外）
- [x] 代码已推送到 master
