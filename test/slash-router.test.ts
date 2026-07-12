import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const ROOT = process.cwd();

describe('registerSlashCommands', () => {
  it('返回全部 8 个 driv 命令', async () => {
    const { registerSlashCommands } = await import('../src/core/slash-router.js');
    const commands = registerSlashCommands();
    expect(commands).toHaveLength(8);
    expect(commands).toContain('/driv-clarify');
    expect(commands).toContain('/driv-design');
    expect(commands).toContain('/driv-build');
    expect(commands).toContain('/driv-verify');
    expect(commands).toContain('/driv-archive');
    expect(commands).toContain('/driv-review');
    expect(commands).toContain('/driv-cleancode');
    expect(commands).toContain('/driv');
  });
});

describe('executeSlashCommand', () => {
  async function setupTmp() {
    return await fs.promises.mkdtemp(path.join(os.tmpdir(), 'slash-router-test-'));
  }

  it('返回 /driv-clarify 的正确 phase（不再在 root 创建 .driv.yaml）', async () => {
    const { executeSlashCommand } = await import('../src/core/slash-router.js');
    const tmp = await setupTmp();
    try {
      const result = await executeSlashCommand('/driv-clarify', { cwd: tmp });
      expect(result.success).toBe(true);
      expect(result.name).toBe('/driv-clarify');
      expect(result.phase).toBe('clarify');

      // .driv.yaml 由 StateMachine.initChange() 在 openspec/changes/<name>/ 下管理
      const statePath = path.join(tmp, '.driv.yaml');
      expect(fs.existsSync(statePath)).toBe(false);
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  });

  it('返回 /driv-design 的正确 phase', async () => {
    const { executeSlashCommand } = await import('../src/core/slash-router.js');
    const result = await executeSlashCommand('/driv-design', { cwd: ROOT });
    expect(result.success).toBe(true);
    expect(result.name).toBe('/driv-design');
    expect(result.phase).toBe('design');
    expect(result.skillPath).toContain(path.join('.opencode', 'skills', 'driv-design', 'SKILL.md'));
  });

  it('返回 /driv-build 的正确 phase', async () => {
    const { executeSlashCommand } = await import('../src/core/slash-router.js');
    const result = await executeSlashCommand('/driv-build', { cwd: ROOT });
    expect(result.success).toBe(true);
    expect(result.phase).toBe('build');
  });

  it('返回 /driv-verify 的正确 phase', async () => {
    const { executeSlashCommand } = await import('../src/core/slash-router.js');
    const result = await executeSlashCommand('/driv-verify', { cwd: ROOT });
    expect(result.success).toBe(true);
    expect(result.phase).toBe('verify');
  });

  it('返回 /driv-archive 的正确 phase', async () => {
    const { executeSlashCommand } = await import('../src/core/slash-router.js');
    const result = await executeSlashCommand('/driv-archive', { cwd: ROOT });
    expect(result.success).toBe(true);
    expect(result.phase).toBe('archive');
  });

  it('返回 /driv-review 的正确 phase', async () => {
    const { executeSlashCommand } = await import('../src/core/slash-router.js');
    const result = await executeSlashCommand('/driv-review', { cwd: ROOT });
    expect(result.success).toBe(true);
    expect(result.phase).toBe('review');
  });

  it('返回 /driv-cleancode 的正确 phase', async () => {
    const { executeSlashCommand } = await import('../src/core/slash-router.js');
    const result = await executeSlashCommand('/driv-cleancode', { cwd: ROOT });
    expect(result.success).toBe(true);
    expect(result.phase).toBe('cleancode');
  });

  it('返回 /driv 的正确 phase', async () => {
    const { executeSlashCommand } = await import('../src/core/slash-router.js');
    const result = await executeSlashCommand('/driv', { cwd: ROOT });
    expect(result.success).toBe(true);
    expect(result.phase).toBe('status');
  });

  it('未知命令返回 error', async () => {
    const { executeSlashCommand } = await import('../src/core/slash-router.js');
    const result = await executeSlashCommand('/unknown');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.phase).toBe('unknown');
  });

  it('root .driv.yaml 不受 slash 命令影响', async () => {
    const { executeSlashCommand } = await import('../src/core/slash-router.js');
    const tmp = await setupTmp();
    try {
      const statePath = path.join(tmp, '.driv.yaml');
      await fs.promises.mkdir(path.dirname(statePath), { recursive: true });
      await fs.promises.writeFile(statePath, 'custom: state', 'utf-8');

      await executeSlashCommand('/driv-clarify', { cwd: tmp });

      const content = fs.readFileSync(statePath, 'utf-8');
      expect(content).toBe('custom: state');
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  });
});
