# Driv 文件功能分析与废弃计划

## 分析结论

### 项目架构说明

Driv 项目采用 **TypeScript 核心 + OpenCode Skills 扩展** 的架构：
- **核心逻辑**: `src/` 目录下的 TypeScript 模块，提供状态管理、门禁控制、模板系统等核心能力
- **扩展流程**: `.opencode/skills/` 目录下的 SKILL.md 文件，定义各阶段的 OpenCode 工作流
- **命令定义**: `.opencode/commands/` 目录下的命令文档，映射到对应的 Skill

### 废弃文件识别

经过分析，以下两类文件已被 TypeScript 代码完整替代，可安全废弃：

#### 第一类：`assets/` 目录（8个文件）

| 文件 | 功能 | 替代方案 | 废弃原因 |
|------|------|---------|---------|
| `driv.sh` | 主入口，显示用法 | `bin/driv.js` + `.opencode/skills/driv/SKILL.md` | 仅显示用法，无实际功能 |
| `driv-clarify.sh` | 创建 proposal.md 和 .openspec.yaml | `.opencode/skills/driv-clarify/SKILL.md` | 功能被 OpenCode Skill 替代 |
| `driv-design.sh` | 检查目录是否存在 | `.opencode/skills/driv-design/SKILL.md` | 仅检查目录，无实际功能 |
| `driv-build.sh` | 检查目录是否存在 | `.opencode/skills/driv-build/SKILL.md` | 仅检查目录，无实际功能 |
| `driv-verify.sh` | 检查目录是否存在 | `.opencode/skills/driv-verify/SKILL.md` | 仅检查目录，无实际功能 |
| `driv-archive.sh` | 创建归档目录 | `.opencode/skills/driv-archive/SKILL.md` | 功能被 OpenCode Skill 替代 |
| `driv-review.sh` | 显示用法 | `.opencode/skills/driv-review/SKILL.md` | 仅显示用法，无实际功能 |
| `manifest.json` | 技能清单 | `src/core/manifest.ts` + `src/commands/update.ts` | 技能清单已在代码中定义 |

#### 第二类：`.driv/scripts/` 目录（6个文件）

| 文件 | 功能 | 替代方案 | 废弃原因 |
|------|------|---------|---------|
| `driv-env-template.sh` | 环境变量模板 | `driv-env.sh` | 与 driv-env.sh 重复 |
| `driv-state.sh` | 状态读写与更新 | `src/core/state-machine.ts` | 功能被 TypeScript 模块替代 |
| `driv-guard.sh` | 阶段门禁控制 | `src/core/phase-guard.ts` | 功能被 TypeScript 模块替代 |
| `driv-handoff.sh` | Handoff 生成与校验 | `src/core/handoff-manager.ts` | 功能被 TypeScript 模块替代 |
| `driv-archive.sh` | 归档与变更日志 | `src/core/archive-service.ts` | 功能被 TypeScript 模块替代 |
| `driv-review.sh` | 评审管理 | `src/core/review-system.ts` | 功能被 TypeScript 模块替代 |

#### 保留文件

| 文件 | 保留原因 |
|------|---------|
| `.driv/scripts/driv-env.sh` | 无 TypeScript 替代，提供环境变量解析能力 |
| `.driv/scripts/driv-cleancode.sh` | 无 TypeScript 替代，提供 lint/format/typecheck 命令 |
| `.driv/scripts/driv-validate.sh` | 无直接替代，提供项目结构验证能力 |

### 证据链

1. **`src/core/assets.ts`** 仅同步 `.driv/config.yaml` 和 `.driv/templates/`，不包含 `assets/` 和 `.driv/scripts/`
2. **TypeScript 代码搜索** (`src/` 目录) 未发现对任何 bash 脚本的引用
3. **功能对比**：所有 `.driv/scripts/` 中的脚本功能都已在 `src/core/` 中实现

## 废弃计划

### 步骤 1：删除 `assets/` 目录（8个文件）

```
assets/
├── driv.sh
├── driv-clarify.sh
├── driv-design.sh
├── driv-build.sh
├── driv-verify.sh
├── driv-archive.sh
├── driv-review.sh
└── manifest.json
```

### 步骤 2：删除 `.driv/scripts/` 目录下的 6 个文件

```
.driv/scripts/
├── driv-env-template.sh  # 与 driv-env.sh 重复
├── driv-state.sh         # 被 state-machine.ts 替代
├── driv-guard.sh         # 被 phase-guard.ts 替代
├── driv-handoff.sh       # 被 handoff-manager.ts 替代
├── driv-archive.sh       # 被 archive-service.ts 替代
└── driv-review.sh        # 被 review-system.ts 替代
```

### 步骤 3：更新 `.gitignore`（如需要）

检查 `.gitignore` 是否需要更新以移除对这些文件的忽略规则。

### 步骤 4：更新 `package.json`（如需要）

检查 `files` 字段是否包含这些目录，如有则移除。

## 风险评估

- **低风险**: 所有废弃文件均未被 TypeScript 核心代码引用
- **回滚方案**: 可从 git 历史中恢复任何被删除的文件
- **影响范围**: 仅删除冗余的 bash 脚本，不影响核心功能

## 验证方式

1. 运行 `npm run test` 确保所有测试通过
2. 运行 `npm run typecheck` 确保类型检查通过
3. 运行 `driv --version` 确保命令正常工作
