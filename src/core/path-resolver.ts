import * as path from 'path';

export class PathResolver {
  readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  get openspecDir(): string {
    return path.join(this.root, 'openspec');
  }

  get changesDir(): string {
    return path.join(this.openspecDir, 'changes');
  }

  changeDir(name: string): string {
    return path.join(this.changesDir, name);
  }

  stateFile(name: string): string {
    return path.join(this.changeDir(name), '.driv.yaml');
  }

  handoffDir(name: string): string {
    return path.join(this.changeDir(name), '.driv', 'handoff');
  }

  normalize(p: string): string {
    return p.replace(/\\/g, '/');
  }
}
