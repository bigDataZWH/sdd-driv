/**
 * driv 子代理契约
 * OpenCode Subagent 间的标准化通信协议
 * 包括子代理调度记录、调度计划、编排器、报告服务和阶段门禁
 */
/** Build 编排器 - 生成 subagent 调度计划 */
export class BuildOrchestrator {
    changeName;
    sourcePaths;
    constructor(changeName, sourcePaths) {
        this.changeName = changeName;
        this.sourcePaths = sourcePaths;
    }
    generateDispatchPlan() {
        const records = [
            {
                taskId: 'build-tsc',
                dependencies: [],
                inputPaths: this.sourcePaths.filter((p) => p.endsWith('.ts')),
                expectedOutputs: this.sourcePaths.map((p) => p.replace(/\.ts$/, '.js').replace(/^src/, 'dist')),
                subagentType: 'builder',
                verifyCommand: 'npx tsc --noEmit',
            },
            {
                taskId: 'build-assets',
                dependencies: ['build-tsc'],
                inputPaths: ['assets/'],
                expectedOutputs: [],
                subagentType: 'builder',
                verifyCommand: 'test -d assets',
            },
            {
                taskId: 'test-build',
                dependencies: ['build-tsc'],
                inputPaths: this.sourcePaths.filter((p) => p.endsWith('.ts')),
                expectedOutputs: [],
                subagentType: 'tester',
                verifyCommand: 'npx vitest run',
            },
        ];
        return {
            changeName: this.changeName,
            phase: 'build',
            records,
            generatedAt: new Date().toISOString(),
        };
    }
    recordPlan(plan) {
        const startedAt = new Date().toISOString();
        const results = plan.records.map((r) => ({
            recordId: r.taskId,
            status: 'pending',
            output: '',
            startedAt,
        }));
        return {
            plan,
            results,
            verifications: [],
            successCount: 0,
            failCount: 0,
            allModifiedFiles: [],
        };
    }
}
/** 归档报告服务 - 生成调度报告 markdown */
export class ArchiveReportService {
    generateReport(report) {
        const lines = [
            '# 子代理调度报告',
            '',
            `- 变更: ${report.plan.changeName || '(未指定)'}`,
            `- 阶段: ${report.plan.phase}`,
            `- 生成时间: ${report.plan.generatedAt}`,
            `- 总任务数: ${report.plan.records.length}`,
            `- 成功: ${report.successCount}`,
            `- 失败: ${report.failCount}`,
            '',
            '## 任务详情',
            '',
        ];
        for (const record of report.plan.records) {
            const status = record.status ?? 'pending';
            const statusIcon = status === 'success' ? '✅' : status === 'fail' ? '❌' : '⏳';
            lines.push(`### ${statusIcon} ${record.taskId}`);
            lines.push('');
            lines.push(`- 状态: ${status}`);
            lines.push(`- 子代理类型: ${record.subagentType}`);
            lines.push(`- 依赖: ${record.dependencies.length ? record.dependencies.join(', ') : '无'}`);
            lines.push(`- 验证命令: \`${record.verifyCommand}\``);
            if (record.modifiedFiles?.length) {
                lines.push('- 修改文件:');
                for (const f of record.modifiedFiles) {
                    lines.push(`  - ${f}`);
                }
            }
            if (record.verificationEvidence) {
                lines.push(`- 验证证据: \`${record.verificationEvidence}\``);
            }
            lines.push('');
        }
        const verification = report.verifications.map((v) => `- ${v.taskId}: ${v.passed ? '✅ 通过' : '❌ 失败'} (${v.evidence})`);
        if (verification.length) {
            lines.push('## 验证证据', '', ...verification, '');
        }
        lines.push('## 修改文件汇总', '');
        if (report.allModifiedFiles.length) {
            for (const f of report.allModifiedFiles) {
                lines.push(`- ${f}`);
            }
        }
        else {
            lines.push('无修改文件。');
        }
        lines.push('');
        return lines.join('\n');
    }
}
/** 阶段门禁 - 控制阶段间转换 */
export class PhaseGuard {
    static PHASE_ORDER = [
        'clarify',
        'design',
        'build',
        'verify',
        'archive',
    ];
    static PHASE_TRANSITIONS = new Map([
        ['clarify', ['design']],
        ['design', ['build']],
        ['build', ['verify']],
        ['verify', ['archive']],
        ['archive', []],
    ]);
    static VALID_TRANSITIONS = [
        ['clarify', 'design'],
        ['design', 'build'],
        ['build', 'verify'],
        ['verify', 'archive'],
    ];
    canTransition(from, to, report) {
        const transitions = PhaseGuard.PHASE_TRANSITIONS.get(from);
        if (!transitions || transitions.length === 0) {
            return { allowed: false, reason: `阶段 ${from} 无后续阶段` };
        }
        if (!transitions.includes(to)) {
            return { allowed: false, reason: `不允许从 ${from} 转换到 ${to}` };
        }
        if (from === 'build' && to === 'verify' && report) {
            if (report.failCount > 0) {
                return {
                    allowed: false,
                    reason: `Build 阶段有 ${report.failCount} 个子代理任务失败，无法进入 Verify`,
                };
            }
            const missingEvidence = report.verifications.filter((v) => !v.passed);
            if (missingEvidence.length > 0) {
                return { allowed: false, reason: `存在 ${missingEvidence.length} 个缺少验证证据的任务` };
            }
            const failedRecords = report.plan.records.filter((r) => r.status === 'fail');
            if (failedRecords.length > 0) {
                return {
                    allowed: false,
                    reason: `子代理任务失败: ${failedRecords.map((r) => r.taskId).join(', ')}`,
                };
            }
        }
        return { allowed: true };
    }
}
//# sourceMappingURL=dispatch.js.map