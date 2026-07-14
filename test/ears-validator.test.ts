import { describe, it, expect } from 'vitest';

describe('validateEARS', () => {
  it('验证 Ubiquitous 句式 (The system shall ...)', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const result = validateEARS('The system shall provide a login form.');
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('验证 Event-driven 句式 (When ..., the system shall ...)', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const result = validateEARS(
      'When the user clicks login, the system shall authenticate the user.',
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('验证 State-driven 句式 (While ..., the system shall ...)', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const result = validateEARS(
      'While the system is in maintenance mode, the system shall reject new logins.',
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('验证 Optional feature 句式 (Where ..., the system shall ...)', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const result = validateEARS(
      'Where dark mode is enabled, the system shall render the UI in dark colors.',
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('验证 Unwanted behavior 句式 (If ..., then the system shall ...)', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const result = validateEARS(
      'If the database is unavailable, then the system shall display an error message.',
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('支持不同模态动词 (SHOULD/MUST/WILL/MAY)', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    expect(validateEARS('The system should cache responses.').valid).toBe(true);
    expect(validateEARS('The system must validate inputs.').valid).toBe(true);
    expect(validateEARS('The system will log events.').valid).toBe(true);
    expect(validateEARS('The system may retry on failure.').valid).toBe(true);
  });

  it('支持大写模态动词 (SHALL)', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const result = validateEARS('The system SHALL provide a login form.');
    expect(result.valid).toBe(true);
  });

  it('缺少 system 关键字的语句无效', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const result = validateEARS('The application shall do something.');
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBe(1);
  });

  it('When 句式缺少逗号无效', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const result = validateEARS('When the user clicks the system shall respond.');
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBe(1);
  });

  it('If 句式缺少 then 无效', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const result = validateEARS(
      'If the database is down the system shall show an error.',
    );
    expect(result.valid).toBe(false);
  });

  it('跳过标题、列表、引用等非需求行', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const content = `# Requirements

> The system shall do something.

- The system shall do something.

1. The system shall do something.

<!-- The system shall do something -->

| The system shall do something |`;
    const result = validateEARS(content);
    expect(result.valid).toBe(true);
  });

  it('跳过不含模态动词的行', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const result = validateEARS('This is just a description without requirements.');
    expect(result.valid).toBe(true);
  });

  it('空内容返回 valid=true', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const result = validateEARS('');
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('多行内容中混合有效/无效语句', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const content = `The system shall authenticate users.
The application shall do something invalid.
The system shall log errors.`;
    const result = validateEARS(content);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBe(1);
  });

  it('issues 中包含行号信息', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const content = `The system shall do something valid.

The application shall do something invalid.`;
    const result = validateEARS(content);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain('行 3');
  });

  it('部分 EARS 句式 (shall 后无动作) 无效', async () => {
    const { validateEARS } = await import('../src/core/ears-validator.js');
    const result = validateEARS('The system shall');
    expect(result.valid).toBe(false);
  });
});
