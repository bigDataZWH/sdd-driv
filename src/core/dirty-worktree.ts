import { execFile } from 'child_process';
import { promisify } from 'util';
import { OPENSPEC_CHANGES_DIR } from './types.js';

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
      const changes = this.classifyPaths(lines, changeName);
      return { dirty: true, changes };
    } catch {
      return { dirty: false, changes: [] };
    }
  }

  classifyPaths(lines: string[], changeName: string): WorktreeChange[] {
    return lines.map((line) => {
      // git status --porcelain 输出格式: "XY filename"，XY 为 2 字符状态码
      const x = line[0];
      const y = line[1];
      let p = line.slice(3).trim();
      let type: WorktreeChange['type'] = 'modified';
      if (x === '?' || y === '?') {
        type = 'untracked';
      } else if (x === 'A' || y === 'A') {
        type = 'added';
      } else if (x === 'D' || y === 'D') {
        type = 'deleted';
      }
      if (p.startsWith('"') && p.endsWith('"')) {
        p = p.slice(1, -1);
      }
      let category: WorktreeChange['category'] = 'unknown';
      if (p.includes(`changes/${changeName}/`)) {
        category = 'change';
      } else if (p.includes(`${OPENSPEC_CHANGES_DIR}/`)) {
        category = 'user';
      }
      return { path: p, type, category };
    });
  }
}
