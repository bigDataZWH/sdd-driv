## 1. Manifest

- [x] 1.1 创建 manifest 类型（DrivManifest/InstallOptions）
- [x] 1.2 定义 manifest TypeScript 类型
- [x] 1.3 manifest 加载与验证逻辑

## 2. 安装生命周期

- [ ] 2.1 支持 --scope project/global
- [ ] 2.2 中英文技能资产目录（assets/skills、assets/skills-zh）
- [x] 2.3 覆盖/跳过策略

## 3. Uninstall

- [ ] 3.1 实现 uninstall 命令
- [ ] 3.2 只删除 manifest 管理的文件

## 4. 命令生成 + 版本

- [ ] 4.1 命令生成从 manifest 读取技能列表
- [ ] 4.2 driv --version
- [ ] 4.3 doctor 显示版本/资产版本
- [ ] 4.4 update 检查版本漂移

## 5. 测试

- [x] 5.1 manifest 加载测试
- [ ] 5.2 scope 测试
- [ ] 5.3 uninstall 安全测试
- [x] 5.4 全量测试通过
