#!/usr/bin/env bash
# driv-build — 阶段 3: 构建
# 检查 design 完成、创建 plan、选择执行模式、初始化隔离
set -euo pipefail

CHANGE_NAME="${1:-}"
if [ -z "$CHANGE_NAME" ]; then
  echo "用法: driv build <change-name> [build-mode]"
  exit 1
fi

BUILD_MODE="${2:-subagent-driven-development}"

echo "driv-build: 开始构建阶段 [$CHANGE_NAME] (模式: $BUILD_MODE)"

CHANGE_DIR="openspec/changes/$CHANGE_NAME"
if [ ! -d "$CHANGE_DIR" ]; then
  echo "错误: 变更目录不存在: $CHANGE_DIR"
  exit 1
fi

echo "driv-build: 完成"
