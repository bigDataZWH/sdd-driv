## 1. 项目结构与配置

- [x] 1.1 创建最小 TypeScript CLI 项目结构，包括 `src/commands`、`src/core`、`src/utils`、`assets`、`test` 目录
- [x] 1.2 配置 `package.json`、`tsconfig.json`、构建脚本和测试脚本，保持 Node.js 20+ 兼容
- [x] 1.3 添加 CLI 入口文件并注册初始化命令，命令内部使用 2 空格缩进和 camelCase 命名
- [x] 1.4 创建集中路径常量，定义项目级 `.opencode/skills`、`.opencode/commands`、`openspec`、`docs/superpowers/plans` 路径

## 2. OpenCode 平台适配

- [x] 2.1 实现 OpenCode 平台定义，包含项目级 `.opencode` 与全局 `.config/opencode` 的目录映射但第一版只写项目级路径
- [x] 2.2 实现文件系统工具函数，支持存在性检查、目录创建、文件复制、JSON 读取和安全写入
- [x] 2.3 实现技能 frontmatter 剥离逻辑，用于从 `SKILL.md` 生成命令正文
- [x] 2.4 实现 OpenCode 命令生成逻辑，将 `.opencode/skills/<name>/SKILL.md` 转换为 `.opencode/commands/<name>.md`
- [x] 2.5 保持现有 `opsx-*` 命令命名，不自动改名为 `driv-*`

## 3. OpenSpec 集成

- [x] 3.1 实现 OpenSpec CLI 检测逻辑，Windows 下使用 `where`，其他平台使用 `which`
- [x] 3.2 实现 npm 可执行文件解析，Windows 下使用 `npm.cmd`
- [x] 3.3 实现 OpenSpec 安装/升级流程，优先复用已有 CLI，缺失时安装 `@fission-ai/openspec@latest`
- [x] 3.4 实现 OpenSpec 初始化调用，目标工具为 `opencode`，失败时输出 stderr/stdout 诊断信息
- [x] 3.5 为 OpenSpec 参数兼容性加入降级策略，参考 comet-master 的 `--profile` fallback 行为

## 4. Superpowers 集成

- [x] 4.1 实现 npx 可执行文件解析，Windows 下使用 `npx.cmd`
- [x] 4.2 实现 Superpowers 安装命令构造：`npx skills add obra/superpowers -y --agent opencode`
- [x] 4.3 实现 Superpowers 安装执行逻辑，记录 `installed`、`skipped`、`failed` 三类状态
- [x] 4.4 安装失败时保留已存在项目文件，并打印底层命令错误详情
- [x] 4.5 创建 `docs/superpowers/plans` 工作目录，但不创建 `docs/superpowers/specs` 设计真相源

## 5. 初始化编排

- [x] 5.1 实现项目级初始化流程，按顺序执行目录准备、OpenSpec 安装、Superpowers 安装、技能复制、命令生成
- [x] 5.2 实现已存在文件处理策略，默认跳过，显式 overwrite 时覆盖
- [x] 5.3 输出初始化结果摘要，列出 OpenSpec、Superpowers、OpenCode 命令/技能的安装状态
- [x] 5.4 初始化完成后提示用户重启 OpenCode 以加载新增命令和技能
- [x] 5.5 确保初始化流程不修改用户全局 OpenCode 配置

## 6. 资产与工作流约束

- [x] 6.1 将现有 `.opencode/skills/openspec-*` 技能模板纳入资产目录或复制源
- [x] 6.2 将现有 `.opencode/commands/opsx-*` 命令模板纳入资产目录或由技能自动生成
- [x] 6.3 在技能/命令模板中明确 OpenSpec 为 proposal/design/specs/tasks 的唯一真相源
- [x] 6.4 在实施相关说明中明确 Superpowers 只使用 OpenSpec 工件作为输入，不生成重复 design 文档

## 7. 测试与验证

- [x] 7.1 添加 OpenSpec 单元测试，覆盖 CLI 检测、npm 安装参数、初始化参数和 fallback 行为
- [x] 7.2 添加 Superpowers 单元测试，覆盖 npx 命令构造、OpenCode agent 参数和失败状态
- [x] 7.3 添加 OpenCode 命令生成测试，覆盖 frontmatter 剥离、`$ARGUMENTS` 转发和 `opsx-*` 命名保留
- [x] 7.4 添加初始化集成测试，覆盖目录创建、已存在文件跳过和 overwrite 覆盖
- [x] 7.5 添加 Windows 路径测试，覆盖反斜杠路径、`.cmd` 可执行文件和带空格路径
- [x] 7.6 运行 lint、typecheck、test，确认全部通过后再标记任务完成
