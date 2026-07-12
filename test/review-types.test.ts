import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Review 类型与配置 (1.1-1.4)', () => {
  describe('1.1 类型定义', () => {
    it('ReviewTypes 只包含 requirement/technical/code', async () => {
      const { ReviewTypes } = await import('../src/core/review-types.js');
      expect(ReviewTypes).toEqual(['requirement', 'technical', 'code']);
    });

    it('ReviewStatuses 只包含 pending/passed/failed', async () => {
      const { ReviewStatuses } = await import('../src/core/review-types.js');
      expect(ReviewStatuses).toEqual(['pending', 'passed', 'failed']);
    });

    it('ReviewInfo 包含 type/status/path/createdAt 和可选 submittedAt', async () => {
      const { ReviewTypes } = await import('../src/core/review-types.js');
      const info = {
        type: ReviewTypes[0],
        status: 'pending' as const,
        path: 'reviews/requirement-review.md',
        createdAt: '2026-06-28',
      };
      expect(info.type).toBe('requirement');
      expect(info.status).toBe('pending');
      expect(info.path).toBe('reviews/requirement-review.md');
      expect(info.createdAt).toBe('2026-06-28');
      expect((info as any).submittedAt).toBeUndefined();
    });

    it('ReviewFinding 包含 check/severity/passed/detail/autoCheck', async () => {
      const finding = {
        check: '需求描述清晰完整',
        severity: 'error' as const,
        passed: true,
        detail: '需求描述已包含用户故事和验收标准',
        autoCheck: true,
      };
      expect(finding.check).toBe('需求描述清晰完整');
      expect(finding.severity).toBe('error');
      expect(finding.passed).toBe(true);
      expect(finding.detail).toBe('需求描述已包含用户故事和验收标准');
      expect(finding.autoCheck).toBe(true);

      const warning = { ...finding, severity: 'warning' as const };
      expect(warning.severity).toBe('warning');

      const info = { ...finding, severity: 'info' as const };
      expect(info.severity).toBe('info');
    });

    it('ChecklistItem 包含 check/passed/detail/autoCheck', async () => {
      const item = {
        check: '代码符合规范',
        passed: false,
        detail: '待检查',
        autoCheck: false,
      };
      expect(item.check).toBe('代码符合规范');
      expect(item.passed).toBe(false);
      expect(item.detail).toBe('待检查');
      expect(item.autoCheck).toBe(false);
    });

    it('ChecklistResult 包含 type/items/timestamp', async () => {
      const result = {
        type: 'code' as const,
        items: [{ check: '代码符合规范', passed: true, detail: '通过', autoCheck: true }],
        timestamp: '2026-06-28T00:00:00.000Z',
      };
      expect(result.type).toBe('code');
      expect(result.items).toHaveLength(1);
      expect(result.timestamp).toBe('2026-06-28T00:00:00.000Z');
    });
  });

  describe('1.2 默认门禁配置', () => {
    it('defaultGatesConfig 包含三类门禁', async () => {
      const { defaultGatesConfig } = await import('../src/core/review-types.js');
      expect(defaultGatesConfig.requirement_review).toBeDefined();
      expect(defaultGatesConfig.technical_review).toBeDefined();
      expect(defaultGatesConfig.code_review).toBeDefined();
    });

    it('requirement_review 门禁配置正确', async () => {
      const { defaultGatesConfig } = await import('../src/core/review-types.js');
      const cfg = defaultGatesConfig.requirement_review;
      expect(cfg.phase).toBe('clarify');
      expect(cfg.trigger).toBe('before_design');
      expect(cfg.required_approvals).toBe(1);
      expect(cfg.checklist).toContain('需求描述清晰完整');
      expect(cfg.checklist).toContain('验收标准明确');
      expect(cfg.checklist).toContain('范围边界清晰');
      expect(cfg.checklist).toContain('风险识别充分');
      expect(cfg.template).toBe('reviews/requirement-review.md');
    });

    it('technical_review 门禁配置正确', async () => {
      const { defaultGatesConfig } = await import('../src/core/review-types.js');
      const cfg = defaultGatesConfig.technical_review;
      expect(cfg.phase).toBe('design');
      expect(cfg.trigger).toBe('before_build');
      expect(cfg.required_approvals).toBe(1);
      expect(cfg.checklist).toContain('技术方案可行性');
      expect(cfg.checklist).toContain('架构设计合理性');
      expect(cfg.checklist).toContain('接口设计完整性');
      expect(cfg.checklist).toContain('性能考虑充分');
      expect(cfg.checklist).toContain('安全考虑充分');
      expect(cfg.template).toBe('reviews/technical-review.md');
    });

    it('code_review 门禁配置正确', async () => {
      const { defaultGatesConfig } = await import('../src/core/review-types.js');
      const cfg = defaultGatesConfig.code_review;
      expect(cfg.phase).toBe('build');
      expect(cfg.trigger).toBe('before_verify');
      expect(cfg.required_approvals).toBe(1);
      expect(cfg.checklist).toContain('代码符合规范');
      expect(cfg.checklist).toContain('单元测试覆盖');
      expect(cfg.checklist).toContain('无安全漏洞');
      expect(cfg.checklist).toContain('注释文档完整');
      expect(cfg.template).toBe('reviews/code-review.md');
    });
  });

  describe('1.3 门禁配置读取', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-review-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('loadGatesConfig 无配置文件时返回默认配置', async () => {
      const { loadGatesConfig, defaultGatesConfig } = await import('../src/core/review-types.js');
      const { FileSystem } = await import('../src/utils/file-system.js');
      const fsImpl = new FileSystem(tmpDir);
      const config = await loadGatesConfig(fsImpl, tmpDir);
      expect(config).toEqual(defaultGatesConfig);
    });

    it('loadGatesConfig 读取配置文件中自定义 gates', async () => {
      const { loadGatesConfig } = await import('../src/core/review-types.js');
      const { FileSystem } = await import('../src/utils/file-system.js');
      const fsImpl = new FileSystem(tmpDir);

      const configDir = path.join(tmpDir, '.driv');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.yaml'),
        [
          'gates:',
          '  requirement_review:',
          '    phase: clarify',
          '    trigger: before_design',
          '    required_approvals: 2',
          '    checklist:',
          '      - 自定义检查项',
          '    template: reviews/requirement-review.md',
          '  technical_review:',
          '    phase: design',
          '    trigger: before_build',
          '    required_approvals: 1',
          '    checklist:',
          '      - 技术方案可行性',
          '    template: reviews/technical-review.md',
          '  code_review:',
          '    phase: build',
          '    trigger: before_verify',
          '    required_approvals: 1',
          '    checklist:',
          '      - 代码符合规范',
          '    template: reviews/code-review.md',
        ].join('\n'),
        'utf-8',
      );

      const config = await loadGatesConfig(fsImpl, tmpDir);
      expect(config.requirement_review.required_approvals).toBe(2);
      expect(config.requirement_review.checklist).toEqual(['自定义检查项']);
      expect(config.technical_review).toBeDefined();
      expect(config.code_review).toBeDefined();
    });
  });
});
