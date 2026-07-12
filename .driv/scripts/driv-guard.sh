#!/usr/bin/env bash
# driv-guard — 阶段检查与门禁控制
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/driv-env.sh"

PHASES=(clarify design build verify archive)

# guardPhase <change-name> <expected-phase>
# 检查当前 change 是否在预期阶段，否则退出
guardPhase() {
  local changeName="${1:?用法: guardPhase <change-name> <expected-phase>}"
  local expectedPhase="${2:?用法: guardPhase <change-name> <expected-phase>}"
  local stateFile="$CHANGE_DIR/$changeName/.driv.yaml"
  if [ ! -f "$stateFile" ]; then
    echo "driv-guard: 错误: change '$changeName' 尚未初始化" >&2
    exit 1
  fi
  local currentPhase
  currentPhase="$(grep -E '^phase:' "$stateFile" | head -1 | sed 's/^phase:[[:space:]]*//')"
  if [ "$currentPhase" != "$expectedPhase" ]; then
    echo "driv-guard: 门禁拒绝: 当前阶段 '$currentPhase', 需要 '$expectedPhase'" >&2
    exit 1
  fi
  echo "driv-guard: 阶段检查通过 ($expectedPhase)"
}

# guardTransition <change-name> <from-phase> <to-phase>
# 检查从 from-phase 到 to-phase 的转换是否合法
guardTransition() {
  local changeName="${1:?用法: guardTransition <change-name> <from-phase> <to-phase>}"
  local fromPhase="${2:?}"
  local toPhase="${3:?}"
  local fromIdx=-1 toIdx=-1
  for i in "${!PHASES[@]}"; do
    if [ "${PHASES[$i]}" = "$fromPhase" ]; then fromIdx=$i; fi
    if [ "${PHASES[$i]}" = "$toPhase" ]; then toIdx=$i; fi
  done
  if [ $fromIdx -eq -1 ] || [ $toIdx -eq -1 ]; then
    echo "driv-guard: 错误: 无效阶段 '$fromPhase' -> '$toPhase'" >&2
    exit 1
  fi
  if [ $toIdx -ne $((fromIdx + 1)) ] && [ "$toPhase" != "$fromPhase" ]; then
    echo "driv-guard: 转换拒绝: 不允许 '$fromPhase' -> '$toPhase' (只能顺序推进)" >&2
    exit 1
  fi
  echo "driv-guard: 转换允许: '$fromPhase' -> '$toPhase'"
}

case "${1:-}" in
  phase) shift; guardPhase "$@" ;;
  transition) shift; guardTransition "$@" ;;
  *)
    echo "用法: driv-guard.sh {phase|transition} [参数...]"
    exit 1
    ;;
esac
