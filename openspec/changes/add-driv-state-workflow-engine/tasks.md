## 1. 基础类型与路径

- [ ] 1.1 定义 `Phase`、`Workflow`、`ReviewStatus`、`BuildMode`、`TddMode`、`IsolationMode`、`VerifyMode`、`ChangeState` 类型
- [ ] 1.2 实现 PathResolver，统一解析项目根目录、OpenSpec 目录、change 目录、`.driv.yaml`、handoff 目录
- [ ] 1.3 实现 FileSystem 安全读写、目录创建、复制、列表和路径边界校验
- [ ] 1.4 实现 YamlParser 读取、写入、嵌套字段更新和字段读取

## 2. 状态机实现

- [ ] 2.1 实现 StateMachine.initChange，创建完整 `.driv.yaml` 默认结构
- [ ] 2.2 实现 StateMachine.getState 和 validate，读取并校验状态字段
- [ ] 2.3 实现 StateMachine.setField，支持点路径更新且保留其他字段
- [ ] 2.4 实现 StateMachine.transition，限制顺序阶段转换并更新时间戳
- [ ] 2.5 实现 StateMachine.assessScale，按 tasks 和 changed files 判断 light/full

## 3. 阶段守护实现

- [ ] 3.1 定义 PhaseGuard 接口、GuardResult、GuardFailure 和 ReviewType
- [ ] 3.2 实现 Clarify entry/exit 检查规则
- [ ] 3.3 实现 Design entry/exit 检查规则，确保检查 OpenSpec design.md
- [ ] 3.4 实现 Build entry/exit 检查规则
- [ ] 3.5 实现 Verify 和 Archive entry/exit 检查规则
- [ ] 3.6 实现 applyTransition，先执行 guard 再调用 StateMachine.transition

## 4. Handoff 与上下文压缩

- [ ] 4.1 实现 HashUtils，支持文件、字符串和对象 hash
- [ ] 4.2 实现 HandoffManager.collectSourceFiles，收集 proposal、design、tasks、specs、reviews
- [ ] 4.3 实现 HandoffManager.generate，输出 JSON 和 Markdown handoff
- [ ] 4.4 实现 HandoffManager.validate，校验源文件 hash 和 total hash
- [ ] 4.5 实现 ContextCompression 的 off、beta、full 策略

## 5. 基础设施与脚本

- [ ] 5.1 实现 Logger，输出统一 info/warn/error 格式
- [ ] 5.2 实现 ScriptExec，封装外部命令执行、超时和错误详情
- [ ] 5.3 创建 `.driv/config.yaml` 默认配置
- [ ] 5.4 创建脚本环境变量模板，保留 `driv-env.sh` 中 OpenSpec、Superpowers、配置目录变量

## 6. 测试验证

- [ ] 6.1 添加 StateMachine 初始化、字段更新、转换和规模评估测试
- [ ] 6.2 添加 PhaseGuard 成功/失败测试
- [ ] 6.3 添加 HandoffManager 生成与 hash 校验测试
- [ ] 6.4 添加 Windows 路径与安全写入测试
- [ ] 6.5 运行 lint、typecheck、test 并修复失败
