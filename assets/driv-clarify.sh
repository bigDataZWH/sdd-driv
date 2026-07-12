#!/usr/bin/env bash
# driv-clarify — 阶段 1: 澄清
# 只初始化 proposal.md 和 OpenSpec metadata
set -euo pipefail

CHANGE_NAME="${1:-}"
if [ -z "$CHANGE_NAME" ]; then
  echo "用法: driv clarify <change-name>"
  exit 1
fi

echo "driv-clarify: 开始澄清阶段 [$CHANGE_NAME]"

CHANGE_DIR="openspec/changes/$CHANGE_NAME"
PROPOSAL_PATH="$CHANGE_DIR/proposal.md"
METADATA_PATH="$CHANGE_DIR/.openspec.yaml"
TEMPLATE_PATH=".driv/templates/proposals/default.md"
mkdir -p "$CHANGE_DIR"

if [ ! -f "$PROPOSAL_PATH" ]; then
  if [ -f "$TEMPLATE_PATH" ]; then
    cp "$TEMPLATE_PATH" "$PROPOSAL_PATH"
  else
    cat > "$PROPOSAL_PATH" <<EOF
# 变更提案：$CHANGE_NAME

## 一、基本信息

| 项目 | 内容 |
|------|------|
| 变更名称 | $CHANGE_NAME |
| 变更类型 | feature |
| 提案人 |  |
| 创建日期 | $(date +%F) |
| 当前状态 | 草稿 |
EOF
  fi
fi

cat > "$METADATA_PATH" <<EOF
schema: spec-driven
change: $CHANGE_NAME
phase: clarify
status: draft
created: $(date +%F)
artifacts:
  proposal: proposal.md
EOF

echo "driv-clarify: 已准备 $PROPOSAL_PATH 和 $METADATA_PATH"
echo "driv-clarify: 完成"
