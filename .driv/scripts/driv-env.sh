#!/usr/bin/env bash
# driv-env — 统一环境解析
# 导出: DRIV_ROOT, OPENSPEC_DIR, CHANGE_DIR, CONFIG_DIR, REPORTS_DIR, BASH_ENV
set -euo pipefail

# 解析项目根（首个包含 .git 的祖先目录）
resolveRoot() {
  local dir
  dir="$(cd "${1:-$PWD}" && pwd -W 2>/dev/null || pwd)"
  while [ "$dir" != "${dir%\\*}" ] && [ "$dir" != "/" ]; do
    if [ -d "$dir/.git" ] || [ -f "$dir/.git" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  echo "driv-env: 错误: 未找到项目根（无 .git）" >&2
  exit 1
}

# 检测 Bash 环境
detectBashEnv() {
  if [ -n "${BASH:-}" ]; then
    echo "bash"
  elif [ -n "${ZSH_VERSION:-}" ]; then
    echo "zsh"
  elif uname -o 2>/dev/null | grep -qi "msys\|mingw\|cygwin"; then
    echo "git-bash"
  else
    echo "sh"
  fi
}

DRIV_ROOT="$(resolveRoot "${1:-$PWD}")"
export DRIV_ROOT

OPENSPEC_DIR="$DRIV_ROOT/openspec"
CHANGE_DIR="$DRIV_ROOT/openspec/changes"
CONFIG_DIR="$DRIV_ROOT/.driv"
REPORTS_DIR="$DRIV_ROOT/reports"
BASH_ENV="$(detectBashEnv)"

export OPENSPEC_DIR CHANGE_DIR CONFIG_DIR REPORTS_DIR BASH_ENV

echo "DRIV_ROOT=$DRIV_ROOT"
echo "OPENSPEC_DIR=$OPENSPEC_DIR"
echo "CHANGE_DIR=$CHANGE_DIR"
echo "CONFIG_DIR=$CONFIG_DIR"
echo "REPORTS_DIR=$REPORTS_DIR"
echo "BASH_ENV=$BASH_ENV"
