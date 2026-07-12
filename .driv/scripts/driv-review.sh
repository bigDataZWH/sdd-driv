#!/usr/bin/env bash
# driv-review — 代码审查
# 创建、提交、检查三类评审（需求/技术/代码）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/driv-env.sh"

REVIEW_TYPES=(requirements technical code)

doCreate() {
  local changeName="${1:?用法: driv-review.sh create <change-name> <type>}"
  local reviewType="${2:?}"
  local valid=false
  for t in "${REVIEW_TYPES[@]}"; do [ "$t" = "$reviewType" ] && valid=true; done
  if [ "$valid" = false ]; then
    echo "driv-review: 错误: 无效评审类型 '$reviewType'，可用: ${REVIEW_TYPES[*]}" >&2
    exit 1
  fi
  local reviewDir="$CHANGE_DIR/$changeName/reviews"
  mkdir -p "$reviewDir"
  local reviewFile="$reviewDir/${reviewType}-review.md"
  {
    echo "# ${reviewType} 评审"
    echo "change: $changeName"
    echo "type: $reviewType"
    echo "status: draft"
    echo "created: $(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u)"
    echo ""
    echo "## 评审项"
    echo "- [ ] 待补充"
  } > "$reviewFile"
  echo "driv-review: 评审已创建: $reviewFile"
}

doSubmit() {
  local changeName="${1:?用法: driv-review.sh submit <change-name> <type>}"
  local reviewType="${2:?}"
  local reviewFile="$CHANGE_DIR/$changeName/reviews/${reviewType}-review.md"
  if [ ! -f "$reviewFile" ]; then
    echo "driv-review: 错误: 评审不存在: $reviewFile" >&2
    exit 1
  fi
  # 将 status 从 draft 更新为 submitted
  sed -i 's/^status: draft/status: submitted/' "$reviewFile" 2>/dev/null || {
    local tmp; tmp="$(mktemp)"
    sed 's/^status: draft/status: submitted/' "$reviewFile" > "$tmp" && mv "$tmp" "$reviewFile"
  }
  echo "driv-review: 评审已提交: $reviewFile"
}

doCheck() {
  local changeName="${1:?用法: driv-review.sh check <change-name> <type>}"
  local reviewType="${2:?}"
  local reviewFile="$CHANGE_DIR/$changeName/reviews/${reviewType}-review.md"
  if [ ! -f "$reviewFile" ]; then
    echo "driv-review: 评审不存在 (draft)"
    exit 1
  fi
  local status
  status="$(grep -E '^status:' "$reviewFile" | head -1 | sed 's/^status:[[:space:]]*//')"
  echo "driv-review: 评审状态: $status"
  # 统计未完成评审项
  local pending
  pending="$(grep -c '\- \[ \]' "$reviewFile" 2>/dev/null || echo 0)"
  echo "driv-review: 待处理项: $pending"
}

case "${1:-}" in
  create) shift; doCreate "$@" ;;
  submit) shift; doSubmit "$@" ;;
  check) shift; doCheck "$@" ;;
  *)
    echo "用法: driv-review.sh {create|submit|check} <change-name> <type>"
    echo "类型: ${REVIEW_TYPES[*]}"
    exit 1
    ;;
esac
