# 实施指南

## 快速开始

### 1. 环境准备

**前置要求**：
- Node.js 20+
- npm/npx
- Git
- Bash 环境（Windows 使用 Git Bash）

### 2. 初始化项目

```bash
# 进入项目目录
cd your-project

# 初始化企业研发研发流程工具
npx driv init
```

初始化过程会：
1. 检测 AI 平台（优先 OpenCode）
2. 选择安装范围（项目级/全局）
3. 安装 OpenSpec 技能
4. 安装 Superpowers 技能
5. 创建企业研发研发配置目录
6. 创建评审模板目录

### 3. 创建变更

```bash
# 在 OpenCode 中使用命令
/driv-clarify 添加用户认证功能
```

---

## 各阶段详细指南

### Clarify 阶段（需求澄清）

**目标**：澄清需求，创建提案和任务清单

**步骤**：
1. 运行 `/driv-clarify [描述]`
2. 系统自动创建变更目录结构
3. 生成 `proposal.md`（需求提案）
4. 生成 `tasks.md`（任务清单）
5. **企业研发扩展**：生成需求评审文档
6. 等待需求评审通过

**产出物**：
```
openspec/changes/<name>/
├── .openspec.yaml
├── .driv.yaml
├── proposal.md
├── tasks.md
└── reviews/
    └── requirement-review.md
```

### Design 阶段（技术设计）

**目标**：深度设计，完善 OpenSpec 设计文档

**步骤**：
1. 需求评审通过后，运行 `/driv-design`
2. 系统生成 handoff 上下文包
3. 执行 Superpowers brainstorming 技能
   - **执行但不产文档**：brainstorming 过程中的思考和决策
   - **决策记录**：将关键决策记录到 `tasks.md` 的决策记录区
4. 完善 `design.md`（由 OpenSpec 管理）
5. **企业研发扩展**：生成技术评审文档
6. 等待技术评审通过

**关键约束**：
- ❌ Superpowers 不产出独立的 design-doc.md
- ✅ 所有设计文档由 OpenSpec 的 design.md 管理
- ✅ Brainstorming 决策记录到 tasks.md

**产出物**：
```
openspec/changes/<name>/
├── design.md        # 技术设计（OpenSpec 产出）
├── tasks.md         # 任务清单 + 决策记录
└── reviews/
    └── technical-review.md
```

### Build 阶段（编码实现）

**目标**：实现功能，单元测试

**核心流程**：
```
技术评审通过 → /driv-build → 创建plan.md → 选择模式 → 执行编码 → Clean Code检查 → 代码评审
```

**步骤**：
1. 技术评审通过后，运行 `/driv-build`
2. 创建实施计划 `plan.md`（docs/superpowers/plans/YYYY-MM-DD-<feature>.md）
3. 选择执行模式：
   - **subagent-driven-development**（⭐⭐⭐ 推荐）：子代理驱动开发，适用于复杂任务
   - **direct**（⭐ 不推荐）：直接实现，仅用于简单变更
4. 选择 TDD 模式：
   - **tdd**（⭐⭐⭐ 推荐）：测试驱动开发，Red → Green → Refactor
   - **direct**（⭐ 不推荐）：直接实现
5. 选择工作区隔离：
   - **branch**（⭐⭐⭐ 推荐）：Git 分支隔离
   - **worktree**（⭐⭐ 可选）：Git worktree，适用于并行多任务
6. 执行编码任务（TDD 模式优先）
7. **华为 Clean Code 检查**：
   - 六大维度：命名规范(15%) + 函数设计(25%) + 代码结构(20%) + 注释规范(15%) + 错误处理(15%) + 安全规范(20%)
   - 循环优化：分数 < 80 则 AI 自动修复（最多 5 轮）
   - 通过条件：分数 ≥ 80，critical 问题全部修复
8. **代码评审**：
   - AI 自动生成评审初稿
   - 人工复核确认
   - 评审通过方可进入 Verify 阶段

**Clean Code 检查阈值**：
| 维度 | 规则 | 阈值 |
|------|------|------|
| 函数设计 | 函数长度 | ≤50 行 |
| 函数设计 | 参数数量 | ≤5 个 |
| 函数设计 | 圈复杂度 | ≤10 |
| 代码结构 | 类长度 | ≤500 行 |
| 代码结构 | 嵌套深度 | ≤4 层 |

**评审门禁检查项**：
- 代码符合规范 ✓
- 单元测试覆盖（≥80%） ✓
- 无安全漏洞 ✓
- 错误处理完善 ✓

**产出物**：
```
docs/superpowers/plans/
└── YYYY-MM-DD-<feature>.md          # 实施计划

openspec/changes/<name>/reviews/
└── code-review.md                    # 代码评审文档

openspec/changes/<name>/reports/
├── clean-code-report.md              # Clean Code 报告
├── clean-code-issues.json            # 问题列表
└── clean-code-fix-history.json       # 修复历史
```

**状态文件示例**：
```yaml
phases:
  build:
    status: completed
    mode:
      build_mode: subagent-driven-development
      tdd_mode: tdd
      isolation: branch
    clean_code:
      score: 85
      iterations: 2
      passed: true
    tests:
      coverage: 82%
      passed: true
```

### Verify 阶段（验证测试）

**目标**：验证实现，处理分支

**核心流程**：
```
代码评审通过 → /driv-verify → 评估变更规模 → 执行验证检查 → 处理分支 → 生成报告
```

**步骤**：
1. 代码评审通过后，运行 `/driv-verify`
2. 系统评估变更规模：
   - **light**：轻量验证（<3 tasks, <4 files）
   - **full**：完整验证（≥3 tasks, ≥4 files）
3. 执行验证检查：
   - **构建成功**：代码可正常编译/构建 ✅
   - **测试通过**：所有单元测试/集成测试通过 ✅
   - **Clean Code 通过**：分数 ≥ 80 ✅
   - **分支已处理**：分支已合并或保留 ✅
4. 处理开发分支：
   - **merge**（推荐）：合并到主分支，适用于小改动
   - **squash**：Squash 合并，适用于中等改动
   - **rebase**：Rebase 到主分支，适用于大改动
   - **retain**：保留独立分支，适用于需要继续开发
5. 生成验证报告

**验证检查项**：
| 检查项 | 状态 | 说明 |
|--------|------|------|
| 构建成功 | ✅ | |
| 测试通过 | ✅ | 覆盖率: xx% |
| Clean Code | ✅ | 分数: xx |
| 分支处理 | ✅ | |

**产出物**：
```
openspec/changes/<name>/reports/
└── verification-report.md        # 验证报告
```

**状态文件示例**：
```yaml
phases:
  verify:
    status: completed
    scale: full
    checks:
      build_passed: true
      tests_passed: true
      clean_code_passed: true
      branch_handled: true
    branch:
      strategy: merge
      source_branch: feature/user-auth
      target_branch: main
```

### Archive 阶段（归档沉淀）

**目标**：归档变更，合并 Spec

**核心流程**：
```
验证通过 → /driv-archive → 确认归档条件 → 移动到归档 → 合并 Spec → 更新知识库
```

**命令行接口**：
```bash
/driv-archive --change <name> [选项]

选项：
  --change <name>      # 变更名称（必填）
  --spec-merge        # 合并 Spec（默认：true）
  --skip-knowledge    # 跳过知识库更新
  --dry-run           # 预演模式
  --force             # 强制归档（忽略警告）

示例：
  /driv-archive --change feature-user-auth
  /driv-archive --change feature-user-auth --skip-knowledge
  /driv-archive --change feature-user-auth --dry-run
```

**详细步骤**：
1. 验证前置条件：
   - 检查 verify 阶段是否完成
   - 检查变更是否存在
   - 检查是否已归档
2. 确认归档条件：
   - 变更完成状态 = completed
   - 所有评审已通过
   - 验证报告存在
3. 创建归档目录：`openspec/archive/YYYY-MM-DD-<name>/`
4. 复制文件到归档目录：
   - proposal.md、design.md、tasks.md
   - specs/、reviews/
5. 合并 Delta Spec：
   - 读取主 Spec 和 Delta Spec
   - 执行合并策略（append/update/supersede）
   - 写入主 Spec
6. 更新知识库（可选）：
   - 更新索引文件
   - 更新变更摘要
7. 更新状态文件：
   - phase.archive.status = completed
   - archive_path = <path>

**归档检查清单**：
| 检查项 | 说明 |
|--------|------|
| verify_completed | verify 阶段已完成 |
| change_exists | 变更目录存在 |
| not_archived | 尚未归档 |
| verification_report_exists | 验证报告存在 |

**Delta Spec 合并策略**：
| 策略 | 说明 | 适用场景 |
|------|------|----------|
| append | 追加新能力到主 Spec | 新增能力 |
| update | 更新已有能力 | 修改现有能力 |
| supersede | 替换整个能力 | 完全重写 |

**错误处理**：
| 错误类型 | 处理策略 | 回滚操作 |
|----------|----------|----------|
| Spec 合并冲突 | 保留原 Spec，创建 conflict 文件 | 无需回滚 |
| 文件复制失败 | 回滚已复制文件 | 删除已创建的目录 |

**实现脚本结构**：
```
.driv/scripts/
├── archive.sh                    # 主归档脚本
├── archive-merge-spec.sh         # Spec 合并脚本
├── archive-copy-files.sh         # 文件复制脚本
├── archive-rollback.sh           # 回滚脚本
└── archive-verify.sh             # 归档验证脚本
```

**归档产物**：
```
openspec/archive/YYYY-MM-DD-<name>/    # 归档目录
├── proposal.md                        # 原始提案
├── design.md                          # 技术设计
├── tasks.md                           # 任务清单
├── specs/                             # Delta Spec
│   └── <capability>/
│       └── spec.md
└── reviews/                           # 评审记录
    ├── requirement-review.md
    ├── technical-review.md
    └── code-review.md

openspec/specs/<capability>/spec.md   # 合并后的主 Spec
```

**状态文件示例**：
```yaml
phases:
  archive:
    status: completed
    archive_path: openspec/archive/2026-06-28-feature-user-auth
    spec_merged:
      capability: user-auth
      merged_at: 2026-06-28T21:30:00
    artifacts:
      proposal: archived
      design: archived
      specs: merged
      reviews: archived
```

---

## 常见场景示例

### 场景：新功能开发（完整五阶段流程）

```bash
# 1. 创建变更
/driv-clarify 实现用户登录功能

# 2. 填写需求评审（自动生成）
# ... 在 reviews/requirement-review.md 中填写 ...

# 3. 提交需求评审
/driv-review submit <change-name> requirement

# 4. 进入设计阶段（评审通过后）
/driv-design

# 5. 填写技术评审
# ... 在 reviews/technical-review.md 中填写 ...

# 6. 提交技术评审
/driv-review submit <change-name> technical

# 7. 进入构建阶段（评审通过后）
/driv-build

# 8. 选择执行模式和 TDD 模式（推荐 TDD）

# 9. 编码实现
# ... AI 自动执行编码任务，采用 TDD 模式 ...

# 10. 填写代码评审
/driv-review submit <change-name> code

# 11. 进入验证阶段（评审通过后）
/driv-verify

# 12. 验证检查（自动化）
#     - 构建成功 ✅
#     - 测试通过 ✅
#     - Clean Code 通过 ✅
#     - 分支处理

# 13. 处理分支策略
#     - merge（推荐）：合并到主分支
#     - squash：Squash 合并
#     - rebase：Rebase 到主分支
#     - retain：保留独立分支

# 14. 生成验证报告
#     - openspec/changes/<name>/reports/verification-report.md

# 15. 归档（验证通过后）
/driv-archive

# 16. 归档完成
#     - 变更已归档到 openspec/archive/
#     - Delta Spec 已合并到主 Spec
```

### 场景：Bug 修复（完整流程）

```bash
# Bug 修复同样需要完整流程，确保修复质量

# 1. 创建变更
/driv-clarify 修复用户登录失败的问题

# 2. 需求评审（包括问题分析）
/driv-review submit <change-name> requirement

# 3. 设计阶段（分析根本原因，设计修复方案）
/driv-design

# 4. 技术评审（确保修复方案正确）
/driv-review submit <change-name> technical

# 5. 构建阶段（TDD 模式编写修复代码）
/driv-build

# 6. 代码评审
/driv-review submit <change-name> code

# 7. 验证阶段（确保修复有效且无副作用）
/driv-verify

# 7.1 验证检查（自动化）
#     - 构建成功 ✅
#     - 测试通过 ✅
#     - Clean Code 通过 ✅
#     - 分支处理

# 7.2 处理分支策略
/driv-verify --branch merge  # 推荐：合并到主分支

# 7.3 生成验证报告
#     - openspec/changes/<name>/reports/verification-report.md

# 8. 归档
/driv-archive

# 8.1 归档完成
#     - 变更已归档到 openspec/archive/
#     - Delta Spec 已合并到主 Spec
```

### 场景：配置修改（完整流程）

```bash
# 配置修改也需要完整流程，确保变更可控

# 1. 创建变更
/driv-clarify 修改配置文件中的超时参数

# 2. 需求评审（评估配置变更影响）
/driv-review submit <change-name> requirement

# 3. 设计阶段（分析配置变更方案）
/driv-design

# 4. 技术评审（确保配置变更合理）
/driv-review submit <change-name> technical

# 5. 构建阶段（修改配置文件）
/driv-build

# 6. 代码评审（检查配置正确性）
/driv-review submit <change-name> code

# 7. 验证阶段（验证配置生效）
/driv-verify

# 7.1 验证检查（自动化）
#     - 构建成功 ✅
#     - 测试通过 ✅
#     - Clean Code 通过 ✅
#     - 分支处理

# 7.2 处理分支策略
/driv-verify --branch squash  # 配置变更通常使用 squash

# 7.3 生成验证报告

# 8. 归档
/driv-archive
```

### 核心原则

1. **每个变更都必须经过完整流程**：确保变更质量和可追溯性
2. **深度设计不可跳过**：每个变更必须经过充分的 brainstorming
3. **TDD 模式优先**：所有代码变更默认采用测试驱动开发
4. **评审门禁严格执行**：每个阶段转换必须通过对应评审

---

## 企业研发流程对接细节

### 需求评审

**触发时机**：Clarify 阶段完成，准备进入 Design 阶段前

**检查项**：
- 需求描述清晰完整
- 用户故事格式正确
- 验收标准明确
- 范围边界清晰
- 技术可行性已评估
- 风险已识别

**自动化检查**：
```bash
# 检查 proposal.md 存在
check_file_exists openspec/changes/<name>/proposal.md

# 检查 tasks.md 定义
check_file_exists openspec/changes/<name>/tasks.md

# 检查提案内容完整性
check_proposal_completeness openspec/changes/<name>/proposal.md
```

### 技术评审

**触发时机**：Design 阶段完成，准备进入 Build 阶段前

**检查项**：
- 技术方案可行性
- 架构设计合理性
- 接口设计完整性
- 性能考虑充分
- 安全考虑充分

**自动化检查**：
```bash
# 检查设计文档存在
check_file_exists docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md

# 检查设计文档结构
check_design_doc_structure docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md

# 检查接口定义完整性
check_interface_definitions docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md
```

### 代码评审

**触发时机**：Build 阶段完成，准备进入 Verify 阶段前

**检查项**：
- 代码符合规范
- 单元测试覆盖
- 无安全漏洞
- 注释文档完整

**自动化检查**：
```bash
# 检查代码提交
check_code_committed <change-name>

# 检查单元测试通过
run_unit_tests

# 检查 Clean Code 标准
run_clean_code_check <change-name>

# 安全漏洞扫描
run_security_scan
```

---

## Clean Code 实践指南

### 代码质量标准

1. **命名规范**
   - 类名：PascalCase（如 `UserService`）
   - 函数名：camelCase（如 `getUserById`）
   - 常量：UPPER_SNAKE_CASE（如 `MAX_RETRY_COUNT`）
   - 变量：camelCase（如 `userList`）

2. **函数设计**
   - 单一职责原则
   - 长度不超过 50 行
   - 参数不超过 4 个
   - 返回值明确

3. **注释规范**
   - 公共接口必须有注释
   - 复杂逻辑必须有注释
   - 注释应解释意图，而非实现
   - 使用标准注释格式

4. **代码结构**
   - 圈复杂度不超过 10
   - 嵌套层次不超过 3 层
   - 避免重复代码
   - 合理使用设计模式

### 自动化检查

```bash
# 执行 Clean Code 检查
driv-cleancode check <change-name>

# 生成 Clean Code 报告
driv-cleancode report <change-name>
```

---

## 故障排查

### 问题1：状态文件丢失

**症状**：`/driv` 提示找不到状态文件

**解决方案**：
```bash
# 检查状态文件位置
ls openspec/changes/<name>/.driv.yaml

# 如果丢失，重新生成
driv-state regenerate <change-name>
```

### 问题2：评审未通过

**症状**：无法进入下一阶段，提示评审未通过

**解决方案**：
```bash
# 查看评审状态
driv-review check <change-name> requirement

# 重新提交评审
driv-review submit <change-name> requirement
```

### 问题3：工作区脏状态

**症状**：提示工作区有未提交的变更

**解决方案**：
```bash
# 查看未提交变更
git status

# 提交变更
git add .
git commit -m "WIP: <change-name>"

# 或暂存变更
git stash
```

---

## 高级配置

### 自定义评审流程

```yaml
# .driv/config.yaml
gates:
  requirement_review:
    enabled: true
    custom_checks:
      - 业务价值评估
      - 客户影响分析
      - 竞品对比

  technical_review:
    enabled: true
    custom_checks:
      - 性能基准
      - 成本估算
      - 技术债务评估
```

### 自定义 Clean Code 规则

```yaml
# .driv/config.yaml
clean_code:
  custom_rules:
    - id: no-magic-number
      severity: warning
      description: 禁止使用魔法数字

    - id: max-class-lines
      severity: suggestion
      max_lines: 500
      description: 类总行数限制
```

---

## 最佳实践

1. **始终使用完整流程**：对于新功能，避免跳过设计阶段
2. **优先使用 TDD 模式**：先写测试，再写实现
3. **及时完成评审**：不要让评审成为阻塞点
4. **保持工作区干净**：及时提交代码
5. **善用中断恢复**：可以随时中断，下次继续

---

## 参考资源

- [OpenSpec 官方文档](https://github.com/Fission-AI/OpenSpec)
- [Superpowers 官方文档](https://github.com/obra/superpowers)
- [Comet 项目](https://github.com/rpamis/comet)
- [企业研发 IPD 流程指南](企业研发内部文档)
- [Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)