#!/usr/bin/env bash
# driv-archive — 阶段 5: 归档与发布
# 归档变更，更新 changelog
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/driv-env.sh"

ARCHIVE_DIR="$REPORTS_DIR/archive"

doArchive() {
  local changeName="${1:?用法: driv-archive.sh <change-name>}"
  local changeDir="$CHANGE_DIR/$changeName"
  if [ ! -d "$changeDir" ]; then
    echo "driv-archive: 错误: change 目录不存在: $changeDir" >&2
    exit 1
  fi

  mkdir -p "$ARCHIVE_DIR/$changeName"
  # 复制工件
  if [ -d "$changeDir/artifacts" ]; then
    cp -r "$changeDir/artifacts" "$ARCHIVE_DIR/$changeName/"
  fi
  if [ -d "$changeDir/handoffs" ]; then
    cp -r "$changeDir/handoffs" "$ARCHIVE_DIR/$changeName/"
  fi
  # 复制状态和 spec
  [ -f "$changeDir/.driv.yaml" ] && cp "$changeDir/.driv.yaml" "$ARCHIVE_DIR/$changeName/"
  [ -f "$changeDir/spec.md" ] && cp "$changeDir/spec.md" "$ARCHIVE_DIR/$changeName/"

  # 更新 changelog
  local changelog="$DRIV_ROOT/CHANGELOG.md"
  local dateStr
  dateStr="$(date -u +%Y-%m-%d 2>/dev/null || date -u +%Y-%m-%d)"
  {
    echo ""
    echo "## [$dateStr] - $changeName"
    echo "- 归档变更: $changeName"
  } >> "$changelog"

  echo "driv-archive: 变更已归档到 $ARCHIVE_DIR/$changeName"
  echo "driv-archive: Changelog 已更新"
}

doArchive "$@"
