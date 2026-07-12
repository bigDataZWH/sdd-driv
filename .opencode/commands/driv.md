---
description: Run the driv OpenCode workflow
---

Equivalent skill: `driv`
Command name: `/driv`

Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```

状态巡检：读取 `.driv.yaml` 和 `openspec/changes/`，输出当前状态、阻塞原因、报告路径和推荐下一步命令。

**Input**: 可选 change 名称（默认使用当前活跃 change）。

## Steps

1. **检查项目状态** — 读取 `.driv.yaml`（若存在）和 `openspec/changes/` 目录
2. **无 active change** — 当 `.driv.yaml` 和 `openspec/changes/` 均不存在时：
   - 输出：仅报告，未生成文件
   - 决策：建议启动 `/driv-clarify`
3. **有 active change** — 遍历各阶段状态，汇总未通过的门禁和缺失的工件：
   - clarify 未完成 → 缺少 `proposal.md`、`tasks.md`、`specs/` 或设计文档未转换
   - design 未完成 → 缺少 design.md、handoff 或详细设计未完成
   - design review 未通过 → 阻塞进入 build
   - build 未完成 → 缺少 implementation plan 或编码未结束
   - clean code 未通过 → 总分 <80 或有 critical
   - code review 未通过 → 评审未批准
   - verify 未完成 → 缺少 verification-report.md
   - archive 已完成 → change 已归档
4. **显示报告路径** — 列出各阶段已生成报告的位置
5. **推荐下一步** — 根据当前阶段推荐命令：
   - 无 change → `/driv-clarify`
   - clarify 阶段 → `/driv-clarify`
   - design 阶段 → `/driv-design`
   - design review 未通过 → `/driv-review design`
   - build 阶段 → `/driv-build`
   - verify 阶段 → `/driv-verify`
   - archive 阶段 → `/driv-archive`
   - 全部完成 → `当前 change 已归档`

## Output

- **当前 change**：`<change-name>`（来自 `.driv.yaml.current_change`）或 `无 active change`
- **当前阶段**：`clarify / design / build / verify / archive / archived / 未初始化`
- **阻塞原因**：列表，每项说明阻塞的门禁或缺失的工件；无 change 时显示"项目尚未初始化"
- **报告路径**：`openspec/changes/<name>/` 内各工件的路径
- **推荐下一步**：如 `/driv-clarify`、`/driv-verify`、`/driv-archive`

---
Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```
