## 1. 命令资产与命名兼容

- [ ] 1.1 新增 Driv OpenCode 命令资产：`driv-clarify`、`driv-design`、`driv-build`、`driv-verify`、`driv-archive`、`driv-review`、`driv`
- [ ] 1.2 更新初始化/同步逻辑，同时生成 Driv 主入口并保留现有 `opsx-*` 兼容入口
- [ ] 1.3 在 `opsx-*` 命令或说明中标注其为 OpenSpec 兼容入口，不作为 Driv 五阶段主入口
- [ ] 1.4 为命令生成添加测试，覆盖 Driv 命令生成、`opsx-*` 保留和不覆盖用户修改文件

## 2. CLI 诊断维护命令

- [ ] 2.1 注册 `driv status`，输出当前 change、阶段、门禁、报告路径和下一步命令
- [ ] 2.2 注册 `driv doctor`，检查 Node.js、Git、Bash、OpenSpec、Superpowers、OpenCode 目录、Driv 配置、脚本和模板资产
- [ ] 2.3 注册 `driv update`，同步命令、技能、模板和脚本资产，默认不覆盖用户修改
- [ ] 2.4 注册 `driv review`，支持评审创建、提交和状态检查的非交互入口
- [ ] 2.5 添加 CLI 参数、失败输出和 Windows `.cmd`/Git Bash 兼容测试

## 3. 五阶段 slash 命令接线

- [ ] 3.1 实现 `/driv-clarify` 接线，复用 OpenSpec artifact 生成能力并初始化 `.driv.yaml` 与需求评审
- [ ] 3.2 实现 `/driv-design` 接线，生成 handoff、调用 brainstorming 流程约束并更新 OpenSpec `design.md`
- [ ] 3.3 确保 `/driv-build`、`/driv-verify`、`/driv-archive` 调用对应 BuildOrchestrator、VerifyService、ArchiveService
- [ ] 3.4 实现 `/driv-review` 接线，调用 ReviewSystem 创建、提交、检查评审
- [ ] 3.5 实现 `/driv` 状态入口，展示阻塞原因、报告路径和推荐下一步

## 4. 脚本资产

- [ ] 4.1 创建 `driv-env.sh`，统一解析项目根、OpenSpec 目录、change 目录、配置目录、报告目录和 Bash 环境
- [ ] 4.2 创建 `driv-state.sh`，提供状态读取、字段更新和状态再生成入口
- [ ] 4.3 创建 `driv-guard.sh` 和 `driv-handoff.sh`，封装阶段检查与 handoff 生成/校验
- [ ] 4.4 创建 `driv-archive.sh`、`driv-review.sh`、`driv-cleancode.sh`、`driv-validate.sh`
- [ ] 4.5 添加脚本资产同步测试，覆盖路径加引号、带空格路径和 Windows Git Bash 场景

## 5. 子代理调度契约

- [ ] 5.1 定义 Build 阶段 subagent dispatch 记录结构，包含任务 id、依赖、输入路径、期望输出、子代理类型和验证命令
- [ ] 5.2 在 BuildOrchestrator 中生成调度计划并记录到 `.driv.yaml.phases.build.subagents` 或 reports
- [ ] 5.3 生成 `reports/subagent-dispatch-report.md`，汇总成功、失败、修改文件和验证证据
- [ ] 5.4 确保任一子代理任务失败或缺少验证证据时，PhaseGuard 阻止进入 Verify

## 6. 验证

- [ ] 6.1 添加 OpenSpec spec 场景对应测试，覆盖命令入口、CLI 维护命令、命名兼容、脚本资产和子代理调度
- [ ] 6.2 运行 lint、typecheck、test
- [ ] 6.3 运行 `openspec status --change "add-driv-command-script-alignment"` 确认 artifacts complete
