## Why

当前 Driv 的 CI/发布质量配置不完整，只有 build/test/typecheck 三个脚本，缺少 lint、format、prepublish-check 和自动化 CI 工作流。

## What Changes

- 增加 lint 工具和脚本
- 增加 format 工具和脚本
- 增加 prepublish-check 脚本（lint + typecheck + test）
- 创建 GitHub Actions CI workflow

## Capabilities

### New Capabilities
- ci-quality: CI/发布质量基础设施

### Modified Capabilities
- （无）
