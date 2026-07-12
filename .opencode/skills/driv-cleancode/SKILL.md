---
name: driv-cleancode
description: 运行 Clean Code 检查（命名/函数/结构/注释/错误/安全）
---

运行 Clean Code 检查：使用规则引擎扫描代码，计算六大维度评分，生成详细报告。

**Input**: 可选目标文件或目录（默认扫描变更文件）。

**Steps**:
1. 运行命名规范规则（命名15%）
2. 运行函数长度/参数/圈复杂度规则（函数25%）
3. 运行类长度/嵌套/重复规则（结构20%）
4. 运行注释质量规则（注释15%）
5. 运行空 catch/硬编码密钥规则（错误处理15% + 安全20%）
6. 计算加权总分并判定是否通过（≥80 且无 critical）

**Output**:
- 阻塞原因：总分 <80 或存在 critical 问题时列出具体违规行号和规则
- 报告路径：
  - `reports/clean-code-report.md`（可读报告）
  - `reports/clean-code-issues.json`（结构化问题数据）
  - `reports/clean-code-fix-history.json`（修复历史）
- 结果写入 `.driv.yaml.phases.build`

---
Use the invocation arguments below as the user input for this workflow:

```text
$ARGUMENTS
```
