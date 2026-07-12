#!/usr/bin/env bash
# driv-cleancode — 代码规约检查
# 运行 lint、format、type-check
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/driv-env.sh"

lint() {
  echo "driv-cleancode: 运行 lint..."
  if [ -f "$DRIV_ROOT/package.json" ]; then
    if grep -q '"lint"' "$DRIV_ROOT/package.json" 2>/dev/null; then
      (cd "$DRIV_ROOT" && npm run lint)
    else
      echo "driv-cleancode: 未配置 lint script，跳过"
    fi
  fi
}

format() {
  echo "driv-cleancode: 检查格式..."
  if command -v prettier &>/dev/null; then
    prettier --check "$DRIV_ROOT/src"
  else
    echo "driv-cleancode: prettier 未安装，跳过格式检查"
  fi
}

typecheck() {
  echo "driv-cleancode: 类型检查..."
  if [ -f "$DRIV_ROOT/tsconfig.json" ]; then
    (cd "$DRIV_ROOT" && npx tsc --noEmit)
  else
    echo "driv-cleancode: 未找到 tsconfig.json，跳过类型检查"
  fi
}

all() {
  lint
  format
  typecheck
  echo "driv-cleancode: 完成"
}

case "${1:-}" in
  lint) lint ;;
  format) format ;;
  typecheck) typecheck ;;
  all|"") all ;;
  *)
    echo "用法: driv-cleancode.sh {lint|format|typecheck|all}"
    exit 1
    ;;
esac
