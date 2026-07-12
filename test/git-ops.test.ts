import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('GitOps (2.1-2.5)', () => {
  let tmpDir: string;
  let GitOpsImpl: any;
  let ScriptExec: any;
  let exec: any;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driv-git-'));

    const gitOpsModule = await import('../src/core/git-ops.js');
    const scriptExecModule = await import('../src/utils/script-exec.js');
    GitOpsImpl = gitOpsModule.GitOpsImpl;
    ScriptExec = scriptExecModule.ScriptExec;

    exec = new ScriptExec();
    await exec.exec('git', ['init'], { cwd: tmpDir });
    await exec.exec('git', ['config', 'user.email', 'test@test.com'], { cwd: tmpDir });
    await exec.exec('git', ['config', 'user.name', 'Test'], { cwd: tmpDir });
    await fs.promises.writeFile(path.join(tmpDir, 'README.md'), '# Test');
    await exec.exec('git', ['add', '.'], { cwd: tmpDir });
    await exec.exec('git', ['commit', '-m', 'initial'], { cwd: tmpDir });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('2.1 status', () => {
    it('clean repo 返回 dirty: false', async () => {
      const gitOps = new GitOpsImpl(exec, tmpDir);
      const status = await gitOps.status();
      expect(status.dirty).toBe(false);
      expect(status.untracked).toEqual([]);
      expect(status.modified).toEqual([]);
    });

    it('未跟踪文件时返回 dirty: true', async () => {
      await fs.promises.writeFile(path.join(tmpDir, 'new.txt'), 'new file');
      const gitOps = new GitOpsImpl(exec, tmpDir);
      const status = await gitOps.status();
      expect(status.dirty).toBe(true);
      expect(status.untracked).toContain('new.txt');
    });

    it('修改文件时返回 dirty: true 并列出 modified', async () => {
      await fs.promises.writeFile(path.join(tmpDir, 'README.md'), 'modified content');
      const gitOps = new GitOpsImpl(exec, tmpDir);
      const status = await gitOps.status();
      expect(status.dirty).toBe(true);
      expect(status.modified).toContain('README.md');
    });

    it('返回当前分支名', async () => {
      const gitOps = new GitOpsImpl(exec, tmpDir);
      const status = await gitOps.status();
      expect(status.branch).toBeTruthy();
      expect(typeof status.branch).toBe('string');
    });
  });

  describe('2.1 getHeadSha', () => {
    it('返回有效的 40 位 SHA', async () => {
      const gitOps = new GitOpsImpl(exec, tmpDir);
      const sha = await gitOps.getHeadSha();
      expect(sha).toMatch(/^[0-9a-f]{40}$/);
    });

    it('commit 后 SHA 发生变化', async () => {
      const gitOps = new GitOpsImpl(exec, tmpDir);
      const shaBefore = await gitOps.getHeadSha();
      await fs.promises.writeFile(path.join(tmpDir, 'second.txt'), 'second');
      await exec.exec('git', ['add', '.'], { cwd: tmpDir });
      await exec.exec('git', ['commit', '-m', 'second'], { cwd: tmpDir });
      const shaAfter = await gitOps.getHeadSha();
      expect(shaAfter).not.toBe(shaBefore);
    });
  });

  describe('2.1 getChangedFiles', () => {
    it('返回 baseRef 和 headRef 之间的变更文件', async () => {
      const initBranch = (
        await exec.exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: tmpDir })
      ).stdout.trim();
      const gitOps = new GitOpsImpl(exec, tmpDir);
      await gitOps.createBranch('feature');
      await gitOps.checkoutBranch('feature');
      await fs.promises.writeFile(path.join(tmpDir, 'feature.txt'), 'feature data');
      await exec.exec('git', ['add', '.'], { cwd: tmpDir });
      await exec.exec('git', ['commit', '-m', 'feature commit'], { cwd: tmpDir });
      const files = await gitOps.getChangedFiles(initBranch, 'feature');
      expect(files).toContain('feature.txt');
    });

    it('单参数模式返回与 HEAD 的差异', async () => {
      const gitOps = new GitOpsImpl(exec, tmpDir);
      await fs.promises.writeFile(path.join(tmpDir, 'new-file.txt'), 'data');
      await exec.exec('git', ['add', '.'], { cwd: tmpDir });
      await exec.exec('git', ['commit', '-m', 'new file'], { cwd: tmpDir });
      const files = await gitOps.getChangedFiles('HEAD~1');
      expect(files).toContain('new-file.txt');
    });
  });

  describe('2.2 createBranch / checkoutBranch', () => {
    it('创建新分支并切换', async () => {
      const gitOps = new GitOpsImpl(exec, tmpDir);
      await gitOps.createBranch('dev-branch');
      await gitOps.checkoutBranch('dev-branch');
      const status = await gitOps.status();
      expect(status.branch).toBe('dev-branch');
    });

    it('创建分支后仍在原分支', async () => {
      const gitOps = new GitOpsImpl(exec, tmpDir);
      const statusBefore = await gitOps.status();
      await gitOps.createBranch('feature-x');
      const statusAfter = await gitOps.status();
      expect(statusAfter.branch).toBe(statusBefore.branch);
    });
  });

  describe('2.2-2.3 mergeBranch', () => {
    async function setupFeature(gitOps: any, exec: any, branchName: string, fileName: string) {
      await gitOps.createBranch(branchName);
      await gitOps.checkoutBranch(branchName);
      await fs.promises.writeFile(path.join(tmpDir, fileName), 'data');
      await exec.exec('git', ['add', '.'], { cwd: tmpDir });
      await exec.exec('git', ['commit', '-m', branchName], { cwd: tmpDir });
    }

    it('merge 策略合并分支并保留提交', async () => {
      const initBranch = (
        await exec.exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: tmpDir })
      ).stdout.trim();
      const gitOps = new GitOpsImpl(exec, tmpDir);
      await setupFeature(gitOps, exec, 'feature-a', 'merge-file.txt');
      await gitOps.checkoutBranch(initBranch);
      await gitOps.mergeBranch('feature-a', 'merge');
      const files = await gitOps.getChangedFiles('HEAD~1');
      expect(files).toContain('merge-file.txt');
    });

    it('squash 策略暂存变更但不自动提交', async () => {
      const initBranch = (
        await exec.exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: tmpDir })
      ).stdout.trim();
      const gitOps = new GitOpsImpl(exec, tmpDir);
      await setupFeature(gitOps, exec, 'feature-b', 'squash-file.txt');
      await gitOps.checkoutBranch(initBranch);
      await gitOps.mergeBranch('feature-b', 'squash');
      const staged = await exec.exec('git', ['diff', '--cached', '--name-only'], { cwd: tmpDir });
      expect(staged.stdout.trim()).toContain('squash-file.txt');
    });

    it('retain 策略不执行合并', async () => {
      const initBranch = (
        await exec.exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: tmpDir })
      ).stdout.trim();
      const gitOps = new GitOpsImpl(exec, tmpDir);
      const shaBefore = await gitOps.getHeadSha();
      await setupFeature(gitOps, exec, 'feature-c', 'retain-file.txt');
      await gitOps.checkoutBranch(initBranch);
      await gitOps.mergeBranch('feature-c', 'retain');
      const shaAfter = await gitOps.getHeadSha();
      expect(shaAfter).toBe(shaBefore);
    });

    it('rebase 策略先将功能分支变基再合并', async () => {
      const initBranch = (
        await exec.exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: tmpDir })
      ).stdout.trim();
      const gitOps = new GitOpsImpl(exec, tmpDir);
      await setupFeature(gitOps, exec, 'feature-d', 'rebase-file.txt');
      await gitOps.checkoutBranch(initBranch);
      await gitOps.mergeBranch('feature-d', 'rebase');
      const files = await gitOps.getChangedFiles('HEAD~1');
      expect(files).toContain('rebase-file.txt');
    });
  });

  describe('2.5 脏工作区检测', () => {
    it('status.dirty 正确反映未提交变更', async () => {
      const gitOps = new GitOpsImpl(exec, tmpDir);
      expect((await gitOps.status()).dirty).toBe(false);
      await fs.promises.writeFile(path.join(tmpDir, 'dirty.txt'), 'dirty');
      expect((await gitOps.status()).dirty).toBe(true);
      await exec.exec('git', ['add', '.'], { cwd: tmpDir });
      expect((await gitOps.status()).dirty).toBe(true);
    });
  });

  describe('2.5 mock ScriptExec 验证命令参数', () => {
    it('mock exec 验证 status 调用 git status --porcelain', async () => {
      let callIndex = 0;
      const mockExec = {
        exec: async (cmd: string, args: string[], _opts?: any) => {
          callIndex++;
          expect(cmd).toBe('git');
          if (callIndex === 1) {
            expect(args).toContain('status');
            expect(args).toContain('--porcelain');
            return { stdout: '', stderr: '', exitCode: 0 };
          }
          expect(args).toContain('rev-parse');
          return { stdout: 'main\n', stderr: '', exitCode: 0 };
        },
      };
      const gitOps = new GitOpsImpl(mockExec, tmpDir);
      const status = await gitOps.status();
      expect(status.dirty).toBe(false);
      expect(status.branch).toBe('main');
    });

    it('mock exec 验证 createBranch 调用 git branch', async () => {
      const mockExec = {
        exec: async (cmd: string, args: string[], _opts?: any) => {
          expect(cmd).toBe('git');
          expect(args).toContain('branch');
          expect(args).toContain('test-mock');
          return { stdout: '', stderr: '', exitCode: 0 };
        },
      };
      const gitOps = new GitOpsImpl(mockExec, tmpDir);
      await expect(gitOps.createBranch('test-mock')).resolves.toBeUndefined();
    });

    it('mock exec 验证 mergeBranch 参数', async () => {
      let callCount = 0;
      const mockExec = {
        exec: async (cmd: string, args: string[], _opts?: any) => {
          callCount++;
          if (callCount === 1) {
            expect(cmd).toBe('git');
            expect(args).toContain('merge');
            expect(args).toContain('--squash');
            expect(args).toContain('mock-branch');
          }
          return { stdout: '', stderr: '', exitCode: 0 };
        },
      };
      const gitOps = new GitOpsImpl(mockExec, tmpDir);
      await expect(gitOps.mergeBranch('mock-branch', 'squash')).resolves.toBeUndefined();
      expect(callCount).toBe(1);
    });
  });
});
