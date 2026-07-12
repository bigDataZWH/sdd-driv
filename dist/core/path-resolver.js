import * as path from 'path';
export class PathResolver {
    root;
    constructor(root) {
        this.root = root;
    }
    get openspecDir() {
        return path.join(this.root, 'openspec');
    }
    get changesDir() {
        return path.join(this.openspecDir, 'changes');
    }
    changeDir(name) {
        return path.join(this.changesDir, name);
    }
    stateFile(name) {
        return path.join(this.changeDir(name), '.driv.yaml');
    }
    handoffDir(name) {
        return path.join(this.changeDir(name), '.driv', 'handoff');
    }
    normalize(p) {
        return p.replace(/\\/g, '/');
    }
}
//# sourceMappingURL=path-resolver.js.map