#!/usr/bin/env bash
# driv-archive — 阶段 5: 归档
# 验证前置条件、归档工件、合并 Delta Spec、更新知识库
set -euo pipefail

CHANGE_NAME="${1:-}"
if [ -z "$CHANGE_NAME" ]; then
  echo "用法: driv archive <change-name>"
  exit 1
fi

echo "driv-archive: 开始归档阶段 [$CHANGE_NAME]"

CHANGE_DIR="openspec/changes/$CHANGE_NAME"
if [ ! -d "$CHANGE_DIR" ]; then
  echo "错误: 变更目录不存在: $CHANGE_DIR"
  exit 1
fi

ARCHIVE_DIR="openspec/archive/$(date +%Y-%m-%d)-$CHANGE_NAME"
echo "创建归档目录: $ARCHIVE_DIR"
mkdir -p "$ARCHIVE_DIR"

echo "driv-archive: 完成"
