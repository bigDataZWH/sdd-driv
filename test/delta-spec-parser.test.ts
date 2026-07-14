import { describe, it, expect } from 'vitest';

describe('parseDeltaSpec', () => {
  it('解析 ## ADDED Requirements 章节中的需求', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const content = `# Spec

## ADDED Requirements

### Requirement: User Login

The system shall provide a login form.

### Requirement: User Logout

The system shall provide a logout button.
`;
    const result = parseDeltaSpec(content);
    expect(result.added).toEqual(['User Login', 'User Logout']);
    expect(result.modified).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it('解析 ## UPDATED Requirements 章节并归入 modified', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const content = `## UPDATED Requirements

### Requirement: Search
`;
    const result = parseDeltaSpec(content);
    expect(result.modified).toEqual(['Search']);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it('解析 ## SUPERSEDE 章节并归入 removed', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const content = `## SUPERSEDE

### Requirement: Legacy Auth
`;
    const result = parseDeltaSpec(content);
    expect(result.removed).toEqual(['Legacy Auth']);
    expect(result.added).toEqual([]);
    expect(result.modified).toEqual([]);
  });

  it('解析 ## MODIFIED Requirements 章节归入 modified', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const content = `## MODIFIED Requirements

### Requirement: Feature A
`;
    const result = parseDeltaSpec(content);
    expect(result.modified).toEqual(['Feature A']);
  });

  it('解析 ## REMOVED Requirements 章节归入 removed', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const content = `## REMOVED Requirements

### Requirement: Deprecated Feature
`;
    const result = parseDeltaSpec(content);
    expect(result.removed).toEqual(['Deprecated Feature']);
  });

  it('解析 ## SUPERSEDED Requirements 章节归入 removed', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const content = `## SUPERSEDED Requirements

### Requirement: Old Spec
`;
    const result = parseDeltaSpec(content);
    expect(result.removed).toEqual(['Old Spec']);
  });

  it('同时解析 added/modified/removed 多个章节', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const content = `## ADDED Requirements

### Requirement: New Feature

## UPDATED Requirements

### Requirement: Updated Feature

## SUPERSEDE

### Requirement: Old Feature
`;
    const result = parseDeltaSpec(content);
    expect(result.added).toEqual(['New Feature']);
    expect(result.modified).toEqual(['Updated Feature']);
    expect(result.removed).toEqual(['Old Feature']);
  });

  it('去重相同的需求名称', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const content = `## ADDED Requirements

### Requirement: Dup

### Requirement: Dup
`;
    const result = parseDeltaSpec(content);
    expect(result.added).toEqual(['Dup']);
  });

  it('空内容返回空数组', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const result = parseDeltaSpec('');
    expect(result.added).toEqual([]);
    expect(result.modified).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it('格式错误的标记不解析（缺少 Requirement: 前缀）', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const content = `## ADDED Requirements

Some random text

### Not A Requirement

- bullet point
`;
    const result = parseDeltaSpec(content);
    expect(result.added).toEqual([]);
  });

  it('格式错误的章节标题不解析（## 后无空格）', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const content = `##ADDED Requirements

### Requirement: Foo
`;
    const result = parseDeltaSpec(content);
    expect(result.added).toEqual([]);
  });

  it('遇到其他二级标题退出当前章节', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const content = `## ADDED Requirements

### Requirement: In Section

## Other Section

### Requirement: Out Of Section
`;
    const result = parseDeltaSpec(content);
    expect(result.added).toEqual(['In Section']);
  });

  it('无 delta 标记的普通内容返回空结果', async () => {
    const { parseDeltaSpec } = await import('../src/core/delta-spec-parser.js');
    const content = `# Spec

This is a regular spec document.

### Requirement: Normal

Some content.
`;
    const result = parseDeltaSpec(content);
    expect(result.added).toEqual([]);
    expect(result.modified).toEqual([]);
    expect(result.removed).toEqual([]);
  });
});

describe('hasDelta', () => {
  it('包含 ADDED 标记返回 true', async () => {
    const { hasDelta } = await import('../src/core/delta-spec-parser.js');
    const content = `## ADDED Requirements

### Requirement: Foo
`;
    expect(hasDelta(content)).toBe(true);
  });

  it('包含 UPDATED 标记返回 true', async () => {
    const { hasDelta } = await import('../src/core/delta-spec-parser.js');
    const content = `## UPDATED Requirements

### Requirement: Foo
`;
    expect(hasDelta(content)).toBe(true);
  });

  it('包含 SUPERSEDE 标记返回 true', async () => {
    const { hasDelta } = await import('../src/core/delta-spec-parser.js');
    const content = `## SUPERSEDE

### Requirement: Foo
`;
    expect(hasDelta(content)).toBe(true);
  });

  it('普通内容（无 delta 标记）返回 false', async () => {
    const { hasDelta } = await import('../src/core/delta-spec-parser.js');
    const content = `# Spec

This is a regular spec document.

## Section

Some content.
`;
    expect(hasDelta(content)).toBe(false);
  });

  it('空内容返回 false', async () => {
    const { hasDelta } = await import('../src/core/delta-spec-parser.js');
    expect(hasDelta('')).toBe(false);
  });

  it('只有章节标题无需求时返回 false', async () => {
    const { hasDelta } = await import('../src/core/delta-spec-parser.js');
    const content = `## ADDED Requirements

No requirements here.
`;
    expect(hasDelta(content)).toBe(false);
  });
});
