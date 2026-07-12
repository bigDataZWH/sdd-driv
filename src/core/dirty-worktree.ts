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
  async check(_changeName: string): Promise<DirtyWorktreeResult> {
    return { dirty: false, changes: [] };
  }

  classifyPaths(_paths: string[], _changeName: string): WorktreeChange[] {
    return [];
  }
}
