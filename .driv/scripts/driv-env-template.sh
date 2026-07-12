#!/usr/bin/env bash
# driv-env-template — 环境变量模板
# 继承自 driv-env.sh 的标准变量
# 导出: DRIV_ROOT, OPENSPEC_DIR, CHANGE_DIR, CONFIG_DIR, REPORTS_DIR, BASH_ENV
set -euo pipefail

# 项目根目录
DRIV_ROOT="${DRIV_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
export DRIV_ROOT

# OpenSpec 相关目录
OPENSPEC_DIR="${OPENSPEC_DIR:-$DRIV_ROOT/openspec}"
CHANGE_DIR="${CHANGE_DIR:-$DRIV_ROOT/openspec/changes}"
export OPENSPEC_DIR CHANGE_DIR

# 配置与报告目录
CONFIG_DIR="${CONFIG_DIR:-$DRIV_ROOT/.driv}"
REPORTS_DIR="${REPORTS_DIR:-$DRIV_ROOT/reports}"
export CONFIG_DIR REPORTS_DIR

# Bash 环境检测
if [ -n "${BASH:-}" ]; then
  BASH_ENV="bash"
elif [ -n "${ZSH_VERSION:-}" ]; then
  BASH_ENV="zsh"
elif uname -o 2>/dev/null | grep -qi "msys\|mingw\|cygwin"; then
  BASH_ENV="git-bash"
else
  BASH_ENV="sh"
fi
export BASH_ENV

echo "DRIV_ROOT=$DRIV_ROOT"
echo "OPENSPEC_DIR=$OPENSPEC_DIR"
echo "CHANGE_DIR=$CHANGE_DIR"
echo "CONFIG_DIR=$CONFIG_DIR"
echo "REPORTS_DIR=$REPORTS_DIR"
echo "BASH_ENV=$BASH_ENV"
