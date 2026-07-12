# Design: Manifest 与安装生命周期

## Manifest 结构

```json
{
  "version": "1.0",
  "skills": [{ "name": "driv", "path": "skills/driv/SKILL.md", "languages": ["zh"] }],
  "commands": [{ "name": "driv", "path": "commands/driv.md" }],
  "references": [{ "name": "fields", "path": "reference/driv-yaml-fields.md" }],
  "scripts": [{ "name": "setup", "path": "scripts/setup.sh" }],
  "rules": [],
  "hooks": []
}
```

## Scope

- `--scope project` → ${projectRoot}/.opencode
- `--scope global` → ~/.config/opencode

## Init/Update 流程

1. 读取 manifest
2. 检查目标路径已存在文件
3. 按 overwrite/skip 策略操作
4. 输出摘要

## Uninstall

- 读取 manifest 列出的文件
- 只删除 manifest 管理的文件
- 保留用户自定义配置
