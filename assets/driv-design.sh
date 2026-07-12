#!/usr/bin/env bash
# driv-design — 阶段 2: 设计
# 生成 handoff，调用 brainstorming，完善 design.md
set -euo pipefail

CHANGE_NAME="${1:-}"
if [ -z "$CHANGE_NAME" ]; then
  echo "用法: driv design <change-name>"
  exit 1
fi

echo "driv-design: 开始设计阶段 [$CHANGE_NAME]"

CHANGE_DIR="openspec/changes/$CHANGE_NAME"
if [ ! -d "$CHANGE_DIR" ]; then
  echo "错误: 变更目录不存在: $CHANGE_DIR"
  exit 1
fi

echo "driv-design: 完成"
