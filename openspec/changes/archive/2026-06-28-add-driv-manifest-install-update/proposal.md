## Why

当前 Driv 的 init/update 硬编码资产路径和命令生成逻辑，缺少统一 manifest 导致重复和维护困难。缺少 scope（global/project）、uninstall、中英文资产支持。

## What Changes

- 新增 Driv manifest（assets/manifest.json）
- 支持 global/project 安装 scope
- 中英文技能资产目录
- uninstall 命令
- 覆盖/跳过策略
- 命令生成从 manifest 读取
- 版本信息与升级提示

## Capabilities

### New Capabilities
- manifest-install-update: Driv 集中资产管理与安装生命周期

### Modified Capabilities
- （无）
