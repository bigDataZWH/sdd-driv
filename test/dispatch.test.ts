import { describe, it, expect } from 'vitest';

describe('SubagentDispatchRecord 结构', () => {
  it('创建完整记录并验证所有字段', async () => {
    const dispatch = await import('../src/core/dispatch.js');
    const record: dispatch.SubagentDispatchRecord = {
      taskId: 'build-tsc',
      dependencies: [],
      inputPaths: ['src/core/dispatch.ts'],
      expectedOutputs: ['dist/core/dispatch.js'],
      subagentType: 'builder',
      verifyCommand: 'npx tsc --noEmit',
    };
    expect(record.taskId).toBe('build-tsc');
    expect(record.dependencies).toEqual([]);
    expect(record.inputPaths).toContain('src/core/dispatch.ts');
    expect(record.expectedOutputs).toContain('dist/core/dispatch.js');
    expect(record.subagentType).toBe('builder');
    expect(record.verifyCommand).toBe('npx tsc --noEmit');
  });

  it('支持可选字段 status / modifiedFiles / verificationEvidence', async () => {
    const dispatch = await import('../src/core/dispatch.js');
    const record: dispatch.SubagentDispatchRecord = {
      taskId: 'test-build',
      dependencies: ['build-tsc'],
      inputPaths: [],
      expectedOutputs: [],
      subagentType: 'tester',
      verifyCommand: 'npx vitest run',
      status: 'success',
      modifiedFiles: ['src/core/dispatch.ts'],
      verificationEvidence: 'all tests passed',
    };
    expect(record.status).toBe('success');
    expect(record.modifiedFiles).toEqual(['src/core/dispatch.ts']);
    expect(record.verificationEvidence).toBe('all tests passed');
  });

  it('依赖数组可包含多个 taskId', async () => {
    const dispatch = await import('../src/core/dispatch.js');
    const record: dispatch.SubagentDispatchRecord = {
      taskId: 'integration',
      dependencies: ['build-tsc', 'build-assets'],
      inputPaths: [],
      expectedOutputs: [],
      subagentType: 'tester',
      verifyCommand: 'echo ok',
    };
    expect(record.dependencies).toHaveLength(2);
    expect(record.dependencies).toContain('build-tsc');
    expect(record.dependencies).toContain('build-assets');
  });
});

describe('DispatchPlan 结构', () => {
  it('包含 phase / records / generatedAt', async () => {
    const dispatch = await import('../src/core/dispatch.js');
    const plan: dispatch.DispatchPlan = {
      phase: 'build',
      records: [],
      generatedAt: new Date().toISOString(),
    };
    expect(plan.phase).toBe('build');
    expect(plan.records).toEqual([]);
    expect(plan.generatedAt).toBeTruthy();
  });

  it('可包含多条 SubagentDispatchRecord', async () => {
    const dispatch = await import('../src/core/dispatch.js');
    const plan: dispatch.DispatchPlan = {
      phase: 'build',
      records: [
        {
          taskId: 'a',
          dependencies: [],
          inputPaths: [],
          expectedOutputs: [],
          subagentType: 'builder',
          verifyCommand: 'echo a',
        },
        {
          taskId: 'b',
          dependencies: ['a'],
          inputPaths: [],
          expectedOutputs: [],
          subagentType: 'tester',
          verifyCommand: 'echo b',
        },
      ],
      generatedAt: new Date().toISOString(),
    };
    expect(plan.records).toHaveLength(2);
    expect(plan.records[1].dependencies).toContain('a');
  });
});

describe('BuildOrchestrator', () => {
  it('generateDispatchPlan 返回有效 DispatchPlan', async () => {
    const { BuildOrchestrator } = await import('../src/core/dispatch.js');
    const orch = new BuildOrchestrator('test-change', ['src/core/dispatch.ts']);
    const plan = orch.generateDispatchPlan();
    expect(plan.phase).toBe('build');
    expect(plan.records.length).toBeGreaterThan(0);
    expect(plan.generatedAt).toBeTruthy();
  });

  it('生成的记录包含 build-tsc / build-assets / test-build', async () => {
    const { BuildOrchestrator } = await import('../src/core/dispatch.js');
    const orch = new BuildOrchestrator('test-change', ['src/core/dispatch.ts']);
    const plan = orch.generateDispatchPlan();
    const taskIds = plan.records.map((r) => r.taskId);
    expect(taskIds).toContain('build-tsc');
    expect(taskIds).toContain('build-assets');
    expect(taskIds).toContain('test-build');
  });

  it('build-tsc 无依赖', async () => {
    const { BuildOrchestrator } = await import('../src/core/dispatch.js');
    const orch = new BuildOrchestrator('test-change', ['src/core/dispatch.ts']);
    const plan = orch.generateDispatchPlan();
    const tsc = plan.records.find((r) => r.taskId === 'build-tsc')!;
    expect(tsc.dependencies).toEqual([]);
  });

  it('build-assets 依赖 build-tsc', async () => {
    const { BuildOrchestrator } = await import('../src/core/dispatch.js');
    const orch = new BuildOrchestrator('test-change', ['src/core/dispatch.ts']);
    const plan = orch.generateDispatchPlan();
    const assets = plan.records.find((r) => r.taskId === 'build-assets')!;
    expect(assets.dependencies).toContain('build-tsc');
  });

  it('test-build 依赖 build-tsc', async () => {
    const { BuildOrchestrator } = await import('../src/core/dispatch.js');
    const orch = new BuildOrchestrator('test-change', ['src/core/dispatch.ts']);
    const plan = orch.generateDispatchPlan();
    const testTask = plan.records.find((r) => r.taskId === 'test-build')!;
    expect(testTask.dependencies).toContain('build-tsc');
  });

  it('inputPaths 只筛选 .ts 文件', async () => {
    const { BuildOrchestrator } = await import('../src/core/dispatch.js');
    const orch = new BuildOrchestrator('test-change', ['src/core/dispatch.ts', 'README.md']);
    const plan = orch.generateDispatchPlan();
    const tsc = plan.records.find((r) => r.taskId === 'build-tsc')!;
    expect(tsc.inputPaths).toContain('src/core/dispatch.ts');
    expect(tsc.inputPaths).not.toContain('README.md');
  });

  it('recordPlan 返回有效 DispatchReport', async () => {
    const { BuildOrchestrator } = await import('../src/core/dispatch.js');
    const orch = new BuildOrchestrator('test-change', ['src/core/dispatch.ts']);
    const plan = orch.generateDispatchPlan();
    const report = orch.recordPlan(plan);
    expect(report.plan).toBe(plan);
    expect(report.successCount).toBe(0);
    expect(report.failCount).toBe(0);
    expect(report.allModifiedFiles).toEqual([]);
  });
});

describe('ArchiveReportService', () => {
  it('generateReport 返回非空 markdown 字符串', async () => {
    const { BuildOrchestrator, ArchiveReportService } = await import('../src/core/dispatch.js');
    const svc = new ArchiveReportService();
    const orch = new BuildOrchestrator('test-change', ['src/core/dispatch.ts']);
    const plan = orch.generateDispatchPlan();
    const report = orch.recordPlan(plan);
    const md = svc.generateReport(report);
    expect(md.length).toBeGreaterThan(0);
    expect(md).toContain('# 子代理调度报告');
  });

  it('报告中包含任务详情', async () => {
    const { BuildOrchestrator, ArchiveReportService } = await import('../src/core/dispatch.js');
    const svc = new ArchiveReportService();
    const orch = new BuildOrchestrator('test-change', ['src/core/dispatch.ts']);
    const plan = orch.generateDispatchPlan();
    const report = orch.recordPlan(plan);
    const md = svc.generateReport(report);
    expect(md).toContain('build-tsc');
    expect(md).toContain('build-assets');
    expect(md).toContain('test-build');
  });

  it('报告中包含状态图标（待定）', async () => {
    const { BuildOrchestrator, ArchiveReportService } = await import('../src/core/dispatch.js');
    const svc = new ArchiveReportService();
    const orch = new BuildOrchestrator('test-change', ['src/core/dispatch.ts']);
    const plan = orch.generateDispatchPlan();
    const report = orch.recordPlan(plan);
    const md = svc.generateReport(report);
    expect(md).toContain('⏳');
  });

  it('报告包含修改文件汇总', async () => {
    const { ArchiveReportService } = await import('../src/core/dispatch.js');
    const svc = new ArchiveReportService();
    const report = {
      plan: {
        phase: 'build' as const,
        changeName: 'test',
        records: [],
        generatedAt: new Date().toISOString(),
      },
      results: [],
      verifications: [],
      successCount: 2,
      failCount: 0,
      allModifiedFiles: ['src/core/dispatch.ts', 'src/core/openspec.ts'],
    };
    const md = svc.generateReport(report);
    expect(md).toContain('src/core/dispatch.ts');
    expect(md).toContain('src/core/openspec.ts');
    expect(md).toContain('## 修改文件汇总');
  });

  it('无修改文件时显示提示信息', async () => {
    const { ArchiveReportService } = await import('../src/core/dispatch.js');
    const svc = new ArchiveReportService();
    const report = {
      plan: {
        phase: 'build' as const,
        changeName: 'test',
        records: [],
        generatedAt: new Date().toISOString(),
      },
      results: [],
      verifications: [],
      successCount: 0,
      failCount: 0,
      allModifiedFiles: [],
    };
    const md = svc.generateReport(report);
    expect(md).toContain('无修改文件');
  });

  it('报告包含验证证据段落', async () => {
    const { ArchiveReportService } = await import('../src/core/dispatch.js');
    const svc = new ArchiveReportService();
    const report = {
      plan: {
        phase: 'build' as const,
        changeName: 'test',
        records: [
          {
            taskId: 'lint',
            dependencies: [],
            inputPaths: [],
            expectedOutputs: [],
            subagentType: 'tester' as const,
            verifyCommand: 'npx tsc --noEmit',
            status: 'success' as const,
            verificationEvidence: 'no errors',
          },
        ],
        generatedAt: new Date().toISOString(),
      },
      results: [],
      verifications: [
        {
          taskId: 'lint',
          passed: true,
          evidence: 'no errors',
          timestamp: new Date().toISOString(),
        },
      ],
      successCount: 1,
      failCount: 0,
      allModifiedFiles: [],
    };
    const md = svc.generateReport(report);
    expect(md).toContain('## 验证证据');
    expect(md).toContain('lint');
    expect(md).toContain('✅ 通过');
  });
});

describe('PhaseGuard', () => {
  it('canTransition 允许合法的阶段转换', async () => {
    const { PhaseGuard } = await import('../src/core/dispatch.js');
    const guard = new PhaseGuard();
    expect(guard.canTransition('clarify', 'design').allowed).toBe(true);
    expect(guard.canTransition('design', 'build').allowed).toBe(true);
    expect(guard.canTransition('build', 'verify').allowed).toBe(true);
    expect(guard.canTransition('verify', 'archive').allowed).toBe(true);
  });

  it('canTransition 拒绝不合法的阶段转换', async () => {
    const { PhaseGuard } = await import('../src/core/dispatch.js');
    const guard = new PhaseGuard();
    const result = guard.canTransition('clarify', 'build');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('canTransition 拒绝逆向转换', async () => {
    const { PhaseGuard } = await import('../src/core/dispatch.js');
    const guard = new PhaseGuard();
    expect(guard.canTransition('build', 'design').allowed).toBe(false);
    expect(guard.canTransition('verify', 'build').allowed).toBe(false);
  });

  it('canTransition 拒绝从 archive 出发', async () => {
    const { PhaseGuard } = await import('../src/core/dispatch.js');
    const guard = new PhaseGuard();
    const result = guard.canTransition('archive', 'clarify');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('无后续阶段');
  });

  it('build → verify 阻塞: failCount > 0', async () => {
    const { PhaseGuard } = await import('../src/core/dispatch.js');
    const guard = new PhaseGuard();
    const report = {
      plan: { phase: 'build' as const, changeName: '', records: [], generatedAt: '' },
      results: [],
      verifications: [],
      successCount: 0,
      failCount: 2,
      allModifiedFiles: [],
    };
    const result = guard.canTransition('build', 'verify', report);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('失败');
  });

  it('build → verify 阻塞: 有 fail 状态的 records', async () => {
    const { PhaseGuard } = await import('../src/core/dispatch.js');
    const guard = new PhaseGuard();
    const report = {
      plan: {
        phase: 'build' as const,
        changeName: '',
        records: [
          {
            taskId: 'fail-task',
            dependencies: [],
            inputPaths: [],
            expectedOutputs: [],
            subagentType: 'builder' as const,
            verifyCommand: '',
            status: 'fail' as const,
          },
        ],
        generatedAt: '',
      },
      results: [],
      verifications: [],
      successCount: 0,
      failCount: 0,
      allModifiedFiles: [],
    };
    const result = guard.canTransition('build', 'verify', report);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('fail-task');
  });

  it('build → verify 阻塞: 有 failed verification', async () => {
    const { PhaseGuard } = await import('../src/core/dispatch.js');
    const guard = new PhaseGuard();
    const report = {
      plan: { phase: 'build' as const, changeName: '', records: [], generatedAt: '' },
      results: [],
      verifications: [{ taskId: 'v1', passed: false, evidence: 'failed', timestamp: '' }],
      successCount: 0,
      failCount: 0,
      allModifiedFiles: [],
    };
    const result = guard.canTransition('build', 'verify', report);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('验证证据');
  });

  it('build → verify 允许: 报告为空（无失败）', async () => {
    const { PhaseGuard } = await import('../src/core/dispatch.js');
    const guard = new PhaseGuard();
    const report = {
      plan: { phase: 'build' as const, changeName: '', records: [], generatedAt: '' },
      results: [],
      verifications: [],
      successCount: 0,
      failCount: 0,
      allModifiedFiles: [],
    };
    const result = guard.canTransition('build', 'verify', report);
    expect(result.allowed).toBe(true);
  });

  it('VALID_TRANSITIONS 包含所有合法转换', async () => {
    const { PhaseGuard } = await import('../src/core/dispatch.js');
    expect(PhaseGuard.VALID_TRANSITIONS).toHaveLength(4);
    expect(PhaseGuard.VALID_TRANSITIONS).toContainEqual(['clarify', 'design']);
    expect(PhaseGuard.VALID_TRANSITIONS).toContainEqual(['design', 'build']);
    expect(PhaseGuard.VALID_TRANSITIONS).toContainEqual(['build', 'verify']);
    expect(PhaseGuard.VALID_TRANSITIONS).toContainEqual(['verify', 'archive']);
  });
});
