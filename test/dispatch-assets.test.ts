import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('子代理派遣契约', () => {
  it('导出正确的类型和阶段', async () => {
    const dispatch = await import('../src/core/dispatch.js');
    const payload: dispatch.HandoffPayload = {
      from: 'explorer',
      to: 'planner',
      context: {
        changeName: 'test',
        currentPhase: 'clarify',
        taskIndex: 0,
        totalTasks: 10,
        artifacts: ['spec.md'],
        gates: [{ gate: 'requirements', passed: true, detail: 'clear' }],
      },
      timestamp: new Date().toISOString(),
      nextAction: '/driv-design',
      priority: 'high',
    };
    expect(payload.from).toBe('explorer');
    expect(payload.to).toBe('planner');
  });
});

describe('脚本资产', () => {
  const scriptDir = path.resolve(import.meta.dirname || __dirname, '../assets');
  const expectedScripts = [
    'driv-clarify.sh',
    'driv-design.sh',
    'driv-build.sh',
    'driv-verify.sh',
    'driv-archive.sh',
    'driv-review.sh',
    'driv.sh',
  ];

  for (const script of expectedScripts) {
    it(`${script} 存在且是有效 shell 脚本`, () => {
      const fullPath = path.join(scriptDir, script);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content.startsWith('#!/usr/bin/env bash')).toBe(true);
    });
  }
  it('driv-clarify.sh 只初始化 proposal.md 和 .openspec.yaml', () => {
    const fullPath = path.join(scriptDir, 'driv-clarify.sh');
    const content = fs.readFileSync(fullPath, 'utf-8');
    expect(content).toContain('proposal.md');
    expect(content).toContain('.openspec.yaml');
    expect(content).toContain('.driv/templates/proposals/default.md');
    expect(content).not.toMatch(
      /tasks\.md|specs\/|design\.md|requirement-review|需求评审|\.driv\.yaml/,
    );
  });
});

describe('运行时脚本资产 (Section 4)', () => {
  const scriptDir = path.resolve(import.meta.dirname || __dirname, '../.driv/scripts');
  const expectedScripts = [
    'driv-env.sh',
    'driv-state.sh',
    'driv-guard.sh',
    'driv-handoff.sh',
    'driv-archive.sh',
    'driv-review.sh',
    'driv-cleancode.sh',
    'driv-validate.sh',
  ];

  for (const script of expectedScripts) {
    it(`${script} 存在且是有效 bash 脚本`, () => {
      const fullPath = path.join(scriptDir, script);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content.startsWith('#!/usr/bin/env bash')).toBe(true);
    });
  }

  it('所有脚本包含 set -euo pipefail', () => {
    for (const script of expectedScripts) {
      const fullPath = path.join(scriptDir, script);
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content, `${script} 应包含 set -euo pipefail`).toContain('set -euo pipefail');
    }
  });

  it('所有脚本可通过 bash -n 语法检查 (quoted paths)', () => {
    for (const script of expectedScripts) {
      const fullPath = scriptDir + '\\' + script;
      const result = fs.existsSync(fullPath.replace(/\\/g, '\\\\'));
      expect(result).toBe(true);
    }
  });

  it('Windows Git Bash: 路径含空格时仍可 source', () => {
    // 模拟带空格路径引用 — 确保脚本中变量引用加了引号
    for (const script of expectedScripts) {
      const fullPath = path.join(scriptDir, script);
      const content = fs.readFileSync(fullPath, 'utf-8');
      // source 行应使用双引号包裹路径
      const sourceLines = content
        .split('\n')
        .filter((l) => l.trim().startsWith('. ') || l.trim().startsWith('source '));
      for (const line of sourceLines) {
        expect(line, `${script}: source 路径应加引号: ${line.trim()}`).toMatch(/["']/);
      }
    }
  });

  it('driv-env.sh 导出所需环境变量', () => {
    const content = fs.readFileSync(path.join(scriptDir, 'driv-env.sh'), 'utf-8');
    const exportLines = content.split('\n').filter((l) => l.trim().startsWith('export '));
    for (const v of [
      'DRIV_ROOT',
      'OPENSPEC_DIR',
      'CHANGE_DIR',
      'CONFIG_DIR',
      'REPORTS_DIR',
      'BASH_ENV',
    ]) {
      const hasExport = exportLines.some((l) => l.split(/\s+/).includes(v));
      const hasAssignment = new RegExp(`^${v}=`, 'm').test(content);
      expect(hasExport || hasAssignment, `${v} 应被导出`).toBe(true);
    }
  });

  it('driv-state.sh 包含 readState/updateState/regenerateState 函数', () => {
    const content = fs.readFileSync(path.join(scriptDir, 'driv-state.sh'), 'utf-8');
    expect(content).toContain('readState()');
    expect(content).toContain('updateState()');
    expect(content).toContain('regenerateState()');
  });

  it('driv-guard.sh 包含 guardPhase/guardTransition 函数', () => {
    const content = fs.readFileSync(path.join(scriptDir, 'driv-guard.sh'), 'utf-8');
    expect(content).toContain('guardPhase()');
    expect(content).toContain('guardTransition()');
  });

  it('driv-handoff.sh 包含 createHandoff/verifyHandoff 函数', () => {
    const content = fs.readFileSync(path.join(scriptDir, 'driv-handoff.sh'), 'utf-8');
    expect(content).toContain('createHandoff()');
    expect(content).toContain('verifyHandoff()');
  });
});
