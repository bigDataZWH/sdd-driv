#!/usr/bin/env bash
# driv-state — 状态读取、字段更新、状态再生成
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./driv-env.sh
. "$SCRIPT_DIR/driv-env.sh"

# readState <change-name>
# 输出 change 的 YAML/JSON 状态文件内容
readState() {
  local changeName="${1:?用法: readState <change-name>}"
  local stateFile="$CHANGE_DIR/$changeName/.driv.yaml"
  if [ ! -f "$stateFile" ]; then
    echo "driv-state: 错误: 状态文件不存在: $stateFile" >&2
    return 1
  fi
  cat "$stateFile"
}

# updateState <change-name> <field> <value>
# 更新状态文件中某个字段的值（简单 key: value 替换）
updateState() {
  local changeName="${1:?用法: updateState <change-name> <field> <value>}"
  local field="${2:?用法: updateState <change-name> <field> <value>}"
  local value="${3:?用法: updateState <change-name> <field> <value>}"
  local stateFile="$CHANGE_DIR/$changeName/.driv.yaml"
  if [ ! -f "$stateFile" ]; then
    echo "driv-state: 错误: 状态文件不存在: $stateFile" >&2
    return 1
  fi
  if grep -q "^${field}:" "$stateFile"; then
    if sed -i "s/^${field}:.*/${field}: ${value}/" "$stateFile" 2>/dev/null; then
      echo "driv-state: 已更新 ${field}=${value}"
    else
      # fallback: Windows sed 兼容
      local tmpFile
      tmpFile="$(mktemp)"
      sed "s/^${field}:.*/${field}: ${value}/" "$stateFile" > "$tmpFile" && mv "$tmpFile" "$stateFile"
      echo "driv-state: 已更新 ${field}=${value}"
    fi
  else
    echo "${field}: ${value}" >> "$stateFile"
    echo "driv-state: 已追加 ${field}=${value}"
  fi
}

# regenerateState <change-name>
# 重新生成状态文件（从现有 artifact 推断）
regenerateState() {
  local changeName="${1:?用法: regenerateState <change-name>}"
  local changeDir="$CHANGE_DIR/$changeName"
  if [ ! -d "$changeDir" ]; then
    echo "driv-state: 错误: change 目录不存在: $changeDir" >&2
    return 1
  fi
  local stateFile="$changeDir/.driv.yaml"
  {
    echo "# Driv State — 自动生成 $(date)"
    echo "change: $changeName"
    echo "phase: clarify"
    if [ -f "$changeDir/design.md" ]; then echo "design: present"; fi
    if [ -f "$changeDir/tasks.md" ]; then echo "tasks: present"; fi
    if [ -d "$changeDir/artifacts" ]; then echo "artifacts: present"; fi
    echo "updated: $(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u)"
  } > "$stateFile"
  echo "driv-state: 状态文件已重新生成: $stateFile"
}

case "${1:-}" in
  read) shift; readState "$@" ;;
  update) shift; updateState "$@" ;;
  regenerate) shift; regenerateState "$@" ;;
  *)
    echo "用法: driv-state.sh {read|update|regenerate} [参数...]"
    exit 1
    ;;
esac
