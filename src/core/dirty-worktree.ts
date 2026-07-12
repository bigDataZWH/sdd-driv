import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface WorktreeChange {
  path: string;
  type: 'modified' | 'added' | 'deleted' | 'untracked';
  category: 'user' | 'change' | 'unknown';
}

export interface DirtyWorktreeResult {
  dirty: boolean;
  changes: WorktreeChange[];
}

export class DirtyWorktreeChecker {
  constructor(private projectPath?: string) {}

  async check(changeName: string): Promise<DirtyWorktreeResult> {
    if (!this.projectPath) {
      return { dirty: false, changes: [] };
    }
    try {
      const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
        cwd: this.projectPath,
      });
      const lines = stdout.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        return { dirty: false, changes: [] };
      }
      const paths = lines.map((l) => l.slice(3).trim());
      const changes = this.classifyPaths(paths, changeName);
      return { dirty: true, changes };
    } catch {
      return { dirty: false, changes: [] };
    }
  }

  classifyPaths(paths: string[], changeName: string): WorktreeChange[] {
    return paths.map((p) => {
      let type: WorktreeChange['type'] = 'modified';
      if (p.startsWith('"') && p.endsWith('"')) {
        p = p.slice(1, -1);
      }
      let category: WorktreeChange['category'] = 'unknown';
      if (p.includes(`changes/${changeName}/`)) {
        category = 'change';
      } else if (p.includes('openspec/changes/')) {
        category = 'user';
      }
      return { path: p, type, category };
    });
  }
}
