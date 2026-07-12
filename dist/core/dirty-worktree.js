export class DirtyWorktreeChecker {
    async check(_changeName) {
        return { dirty: false, changes: [] };
    }
    classifyPaths(_paths, _changeName) {
        return [];
    }
}
//# sourceMappingURL=dirty-worktree.js.map