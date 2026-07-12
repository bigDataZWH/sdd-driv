#!/usr/bin/env bash
# driv-handoff — Handoff 生成与校验
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/driv-env.sh"

# createHandoff <change-name> <from-phase> <to-phase> [artifact-dir]
# 生成 handoff 文档，记录阶段间的上下文传递
createHandoff() {
  local changeName="${1:?用法: createHandoff <change-name> <from-phase> <to-phase> [artifact-dir]}"
  local fromPhase="${2:?}"
  local toPhase="${3:?}"
  local artifactDir="${4:-$CHANGE_DIR/$changeName/artifacts}"
  local handoffDir="$CHANGE_DIR/$changeName/handoffs"
  mkdir -p "$handoffDir"
  local handoffFile="$handoffDir/${fromPhase}-to-${toPhase}.md"
  {
    echo "# Handoff: $fromPhase → $toPhase"
    echo "change: $changeName"
    echo "from: $fromPhase"
    echo "to: $toPhase"
    echo "timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u)"
    echo ""
    echo "## 交付物"
    if [ -d "$artifactDir" ]; then
      ls -1 "$artifactDir" 2>/dev/null | while read -r f; do echo "- $f"; done
    else
      echo "（无交付物）"
    fi
    echo ""
    echo "## 待办事项"
    echo "- [ ] 由 $toPhase 阶段验证并继续"
  } > "$handoffFile"
  echo "driv-handoff: Handoff 已生成: $handoffFile"
}

# verifyHandoff <change-name> <from-phase> <to-phase>
# 校验 handoff 文档是否存在且完整
verifyHandoff() {
  local changeName="${1:?用法: verifyHandoff <change-name> <from-phase> <to-phase>}"
  local fromPhase="${2:?}"
  local toPhase="${3:?}"
  local handoffFile="$CHANGE_DIR/$changeName/handoffs/${fromPhase}-to-${toPhase}.md"
  if [ ! -f "$handoffFile" ]; then
    echo "driv-handoff: 校验失败: handoff 文件不存在: $handoffFile" >&2
    exit 1
  fi
  if ! grep -q "^from: $fromPhase" "$handoffFile"; then
    echo "driv-handoff: 校验失败: handoff 缺少 from 声明" >&2
    exit 1
  fi
  if ! grep -q "^to: $toPhase" "$handoffFile"; then
    echo "driv-handoff: 校验失败: handoff 缺少 to 声明" >&2
    exit 1
  fi
  echo "driv-handoff: Handoff 校验通过: $handoffFile"
}

case "${1:-}" in
  create) shift; createHandoff "$@" ;;
  verify) shift; verifyHandoff "$@" ;;
  *)
    echo "用法: driv-handoff.sh {create|verify} [参数...]"
    exit 1
    ;;
esac
