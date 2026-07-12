import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ArchiveService', () => {
  let tmpDir: string;
  let archiveService: InstanceType<any>;
  let FileSystem: any;
  let YamlParser: any;
  let StateMachine: any;
  let ArchiveService: any;
  let PathResolver: any;

  const changeName = 'test-change';

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-test-'));

    const fsModule = await import('../src/utils/file-system.js');
    const parserModule = await import('../src/utils/yaml-parser.js');
    const smModule = await import('../src/core/state-machine.js');
    const archiveModule = await import('../src/core/archive-service.js');
    const resolverModule = await import('../src/core/path-resolver.js');

    FileSystem = fsModule.FileSystem;
    YamlParser = parserModule.YamlParser;
    StateMachine = smModule.StateMachine;
    ArchiveService = archiveModule.ArchiveService;
    PathResolver = resolverModule.PathResolver;

    const fsImpl = new FileSystem(tmpDir);
    const parser = new YamlParser(fsImpl);
    const resolver = new PathResolver(tmpDir);
    const sm = new StateMachine(fsImpl, parser, resolver);
    archiveService = new ArchiveService(fsImpl, sm, parser, tmpDir);

    // Initialize change
    await sm.initChange(changeName);

    // Set up a fully-verified state
    const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
    const statePath = path.join(changeDir, '.driv.yaml');
    const { parse } = await import('yaml');
    const raw = fs.readFileSync(statePath, 'utf-8');
    const state = parse(raw);

    // Advance to archive phase with verify completed
    await sm.transition(changeName, 'design');
    await sm.transition(changeName, 'build');
    await sm.transition(changeName, 'verify');
    await sm.transition(changeName, 'archive');

    // Set verify-related fields
    state.phases.verify.status = 'completed';
    state.verifyResult = 'pass';
    state.verifiedAt = new Date().toISOString();
    state.archived = false;
    // Re-write state
    fs.writeFileSync(statePath, (await import('yaml')).stringify(state), 'utf-8');

    // Create source artifacts
    fs.mkdirSync(path.join(changeDir, 'specs', 'test-capability'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Proposal', 'utf-8');
    fs.writeFileSync(path.join(changeDir, 'design.md'), '# Design', 'utf-8');
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '# Tasks', 'utf-8');
    fs.writeFileSync(
      path.join(changeDir, 'specs', 'test-capability', 'spec.md'),
      '## ADDED Requirements\n\n### Requirement: Test feature\nThe system SHALL test.\n',
      'utf-8',
    );
    fs.mkdirSync(path.join(changeDir, 'reviews'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'reviews', 'review-1.md'), '# Review 1', 'utf-8');
    fs.mkdirSync(path.join(changeDir, 'reports'), { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, 'reports', 'verification-report.md'),
      '# Report',
      'utf-8',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('4.1 checkPreconditions', () => {
    it('返回空列表当所有前置条件满足时', async () => {
      const failures = await archiveService.checkPreconditions(changeName);
      expect(failures).toEqual([]);
    });

    it('当 change 不存在时报 change_not_found', async () => {
      const failures = await archiveService.checkPreconditions('nonexistent');
      expect(failures).toContain('change_not_found');
    });

    it('当 verify 未完成时报 verify_not_completed', async () => {
      // Reset verify status
      const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
      const statePath = path.join(changeDir, '.driv.yaml');
      const { parse, stringify } = await import('yaml');
      const state = parse(fs.readFileSync(statePath, 'utf-8'));
      state.phases.verify.status = 'in-progress';
      fs.writeFileSync(statePath, stringify(state), 'utf-8');

      const failures = await archiveService.checkPreconditions(changeName);
      expect(failures).toContain('verify_not_completed');
    });

    it('当 change 已归档时报 already_archived', async () => {
      const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
      const statePath = path.join(changeDir, '.driv.yaml');
      const { parse, stringify } = await import('yaml');
      const state = parse(fs.readFileSync(statePath, 'utf-8'));
      state.archived = true;
      fs.writeFileSync(statePath, stringify(state), 'utf-8');

      const failures = await archiveService.checkPreconditions(changeName);
      expect(failures).toContain('already_archived');
    });

    it('当验证报告不存在时报 verification_report_missing', async () => {
      const reportPath = path.join(
        tmpDir,
        'openspec',
        'changes',
        changeName,
        'reports',
        'verification-report.md',
      );
      fs.unlinkSync(reportPath);

      const failures = await archiveService.checkPreconditions(changeName);
      expect(failures).toContain('verification_report_missing');
    });
  });

  describe('4.2-4.7 archive', () => {
    it('归档复制所有工件到正确位置', async () => {
      const result = await archiveService.archive(changeName);

      expect(result.archived).toBe(true);
      expect(result.errors).toEqual([]);

      // Check archive directory exists
      const archiveDir = result.archivePath;
      expect(fs.existsSync(archiveDir)).toBe(true);

      // Check artifacts copied
      expect(fs.existsSync(path.join(archiveDir, 'proposal.md'))).toBe(true);
      expect(fs.existsSync(path.join(archiveDir, 'design.md'))).toBe(true);
      expect(fs.existsSync(path.join(archiveDir, 'tasks.md'))).toBe(true);
      expect(fs.existsSync(path.join(archiveDir, 'reports', 'verification-report.md'))).toBe(true);
      expect(fs.existsSync(path.join(archiveDir, 'reviews', 'review-1.md'))).toBe(true);
      expect(fs.existsSync(path.join(archiveDir, 'specs', 'test-capability', 'spec.md'))).toBe(
        true,
      );
      expect(fs.existsSync(path.join(archiveDir, '.driv.yaml'))).toBe(true);

      // Check content integrity
      expect(fs.readFileSync(path.join(archiveDir, 'proposal.md'), 'utf-8')).toBe('# Proposal');
    });

    it('当前置条件不满足时归档失败', async () => {
      const result = await archiveService.archive('nonexistent');
      expect(result.archived).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('4.4 mergeDeltaSpec', () => {
    it('append 策略添加新 requirement 到主 spec', async () => {
      // Create a delta spec with append strategy
      const deltaSpecDir = path.join(
        tmpDir,
        'openspec',
        'changes',
        changeName,
        'specs',
        'driv-core',
      );
      fs.mkdirSync(deltaSpecDir, { recursive: true });
      fs.writeFileSync(
        path.join(deltaSpecDir, 'spec.md'),
        '## ADDED Requirements\n\n### Requirement: Core logging\nThe system SHALL log all operations.\n',
        'utf-8',
      );

      const merged = await archiveService.mergeDeltaSpec(changeName);
      expect(merged).toBe(true);

      // Main spec should exist now (created from delta)
      const mainSpecPath = path.join(tmpDir, 'openspec', 'specs', 'driv-core', 'spec.md');
      expect(fs.existsSync(mainSpecPath)).toBe(true);

      const mainSpec = fs.readFileSync(mainSpecPath, 'utf-8');
      expect(mainSpec).toContain('Core logging');
    });

    it('update 策略替换已存在的 requirement', async () => {
      // Create a main spec first
      const mainSpecDir = path.join(tmpDir, 'openspec', 'specs', 'driv-core');
      fs.mkdirSync(mainSpecDir, { recursive: true });
      fs.writeFileSync(
        path.join(mainSpecDir, 'spec.md'),
        '## Overview\n\n### Requirement: Core logging\nThe system SHALL log info.\n\n### Requirement: Auth\nThe system SHALL authenticate.\n',
        'utf-8',
      );

      // Create a delta spec with update strategy and a matching requirement name
      const deltaSpecDir = path.join(
        tmpDir,
        'openspec',
        'changes',
        changeName,
        'specs',
        'driv-core',
      );
      fs.mkdirSync(deltaSpecDir, { recursive: true });
      fs.writeFileSync(
        path.join(deltaSpecDir, 'spec.md'),
        '## UPDATED Requirements\n\n### Requirement: Core logging\nThe system SHALL log ALL levels.\n',
        'utf-8',
      );

      const merged = await archiveService.mergeDeltaSpec(changeName);
      expect(merged).toBe(true);

      const mainSpec = fs.readFileSync(mainSpecDir + '/spec.md', 'utf-8');
      expect(mainSpec).toContain('log ALL levels');
      expect(mainSpec).toContain('Auth');
      // Backup should exist
      expect(fs.existsSync(mainSpecDir + '/spec.md.backup')).toBe(true);
    });
  });

  describe('4.7 rollback', () => {
    it('文件复制失败时回滚清理', async () => {
      // Create a scenario: archive copies files but we trigger rollback
      const archiveDir = path.join(tmpDir, 'openspec', 'archive', '2026-06-28-test-change');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.writeFileSync(path.join(archiveDir, 'proposal.md'), '# Partially-copied', 'utf-8');

      await archiveService.rollback(changeName);

      // Archive dir should be removed
      expect(fs.existsSync(archiveDir)).toBe(false);
    });

    it('归档不存在时报错', async () => {
      await expect(archiveService.rollback('nonexistent')).rejects.toThrow();
    });
  });

  describe('4.6 knowledge index', () => {
    it('归档后创建知识库索引', async () => {
      await archiveService.archive(changeName);

      const indexPath = path.join(tmpDir, 'openspec', 'archive', 'INDEX.md');
      expect(fs.existsSync(indexPath)).toBe(true);

      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      expect(indexContent).toContain(changeName);
      expect(indexContent).toContain('proposal.md');
      expect(indexContent).toContain('design.md');
      expect(indexContent).toContain('tasks.md');
    });
  });
});
