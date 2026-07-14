## Why

当前 VerifyService 和 ArchiveService 功能不完整：scale 判断粗糙、命令解析脆弱、Clean Code 无落盘、分支处理未闭环、Archive 用 DIY 实现而非 OpenSpec 官方归档。需要在已有框架上硬化这些功能。

## What Changes

- 增强 scale 判断（git diff + spec scope）
- VerifyService 命令解析支持引号/npm scripts
- 项目级验证配置读取
- Clean Code 报告落盘
- 分支处理闭环（branch_status）
- Archive 使用 openspec archive
- 归档前 spec 防污染检查

## Capabilities

### New Capabilities
- verify-archive-hardening: 验证与归档硬化

### Modified Capabilities
- （无）
