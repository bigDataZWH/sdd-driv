#!/usr/bin/env bash
# driv-validate — 完整验证套件
# 检查项目结构、命令、脚本、类型、测试
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/driv-env.sh"

checkProjectStructure() {
  echo "driv-validate: 检查项目结构..."
  local ok=true
  [ -d "$OPENSPEC_DIR" ] || { echo "  - 缺少: openspec/" && ok=false; }
  [ -d "$CONFIG_DIR" ] || { echo "  - 缺少: .driv/" && ok=false; }
  [ -d "$CONFIG_DIR/scripts" ] || { echo "  - 缺少: .driv/scripts/" && ok=false; }
  [ -d "$DRIV_ROOT/assets" ] || { echo "  - 缺少: assets/" && ok=false; }
  [ -d "$DRIV_ROOT/src" ] || { echo "  - 缺少: src/" && ok=false; }
  [ -d "$DRIV_ROOT/test" ] || { echo "  - 缺少: test/" && ok=false; }
  [ -f "$DRIV_ROOT/package.json" ] || { echo "  - 缺少: package.json" && ok=false; }
  $ok && echo "  ✓ 项目结构完整"
  return 0
}

checkCommands() {
  echo "driv-validate: 检查命令资产..."
  local count=0
  for cmd in driv driv-clarify driv-design driv-build driv-verify driv-archive driv-review; do
    if [ -f "$DRIV_ROOT/assets/$cmd.sh" ]; then
      echo "  ✓ $cmd.sh"
      count=$((count + 1))
    fi
  done
  echo "  → 共 $count 个命令资产"
}

checkScripts() {
  echo "driv-validate: 检查运行时脚本..."
  local count=0
  for s in driv-env driv-state driv-guard driv-handoff driv-archive driv-review driv-cleancode driv-validate; do
    if [ -f "$CONFIG_DIR/scripts/$s.sh" ]; then
      echo "  ✓ $s.sh"
      count=$((count + 1))
    fi
  done
  echo "  → 共 $count 个运行时脚本"
}

runTests() {
  echo "driv-validate: 运行测试..."
  if command -v npx &>/dev/null && [ -f "$DRIV_ROOT/package.json" ]; then
    (cd "$DRIV_ROOT" && npx vitest run 2>&1 | tail -5) || true
  else
    echo "  npx 不可用或缺少 package.json，跳过测试"
  fi
}

all() {
  checkProjectStructure
  echo ""
  checkCommands
  echo ""
  checkScripts
  echo ""
  runTests
  echo ""
  echo "driv-validate: 验证完成"
}

case "${1:-}" in
  structure) checkProjectStructure ;;
  commands) checkCommands ;;
  scripts) checkScripts ;;
  test|tests) runTests ;;
  all|"") all ;;
  *)
    echo "用法: driv-validate.sh {structure|commands|scripts|test|all}"
    exit 1
    ;;
esac
