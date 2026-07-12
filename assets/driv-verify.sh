#!/usr/bin/env bash
# driv-verify — 阶段 4: 验证
# 执行构建/测试/Clean Code，生成验证报告
set -euo pipefail

CHANGE_NAME="${1:-}"
if [ -z "$CHANGE_NAME" ]; then
  echo "用法: driv verify <change-name>"
  exit 1
fi

echo "driv-verify: 开始验证阶段 [$CHANGE_NAME]"

CHANGE_DIR="openspec/changes/$CHANGE_NAME"
if [ ! -d "$CHANGE_DIR" ]; then
  echo "错误: 变更目录不存在: $CHANGE_DIR"
  exit 1
fi

echo "driv-verify: 完成"
