---
description: Run the driv-review OpenCode workflow
---

Equivalent skill: `driv-review`
Command name: `/driv-review`

Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```

创建、提交、检查三类企业研发评审（需求评审、技术评审、代码评审）。

**Input**: 评审类型和评审内容。

**Steps**:
1. 创建评审文档 — 生成 review markdown 并保存到 `reports/reviews/`
2. 提交评审 — 记录评审结论并更新状态
3. 检查评审状态 — 输出阻塞原因（未通过的门禁检查项）
4. 执行检查项 — 自动检查 + 人工检查项
5. 列出评审 — 展示所有评审记录及对应报告路径

**Output**:
- 阻塞原因：列出所有未通过的门禁检查项（按 requirement/technical/code 分类）
- 报告路径：`reports/reviews/<type>-<timestamp>.md`
- 评审状态写入 `.driv.yaml.hw_process`

---
Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```

