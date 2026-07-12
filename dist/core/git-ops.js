export class GitOpsImpl {
    exec;
    cwd;
    constructor(exec, cwd) {
        this.exec = exec;
        this.cwd = cwd;
    }
    async status() {
        const result = await this.exec.exec('git', ['status', '--porcelain'], { cwd: this.cwd });
        const lines = result.stdout.split('\n').filter((l) => l.trim().length > 0);
        const untracked = [];
        const modified = [];
        for (const line of lines) {
            const prefix = line.slice(0, 2);
            const file = this.extractFilePath(line);
            if (prefix === '??') {
                untracked.push(file);
            }
            else if (prefix[0] !== ' ' || prefix[1] !== ' ') {
                modified.push(file);
            }
        }
        const branchResult = await this.exec.exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
            cwd: this.cwd,
        });
        const branch = branchResult.stdout.trim();
        return { dirty: lines.length > 0, branch, untracked, modified };
    }
    async getHeadSha() {
        const result = await this.exec.exec('git', ['rev-parse', 'HEAD'], { cwd: this.cwd });
        return result.stdout.trim();
    }
    async getChangedFiles(baseRef, headRef) {
        const args = ['diff', '--name-only'];
        if (headRef) {
            args.push(`${baseRef}...${headRef}`);
        }
        else {
            args.push(baseRef);
        }
        const result = await this.exec.exec('git', args, { cwd: this.cwd });
        return result.stdout
            .split('\n')
            .filter((l) => l.trim())
            .map((l) => l.trim());
    }
    async createBranch(name) {
        await this.exec.exec('git', ['branch', name], { cwd: this.cwd });
    }
    async checkoutBranch(name) {
        await this.exec.exec('git', ['checkout', name], { cwd: this.cwd });
    }
    async mergeBranch(name, strategy = 'merge') {
        switch (strategy) {
            case 'merge':
                await this.exec.exec('git', ['merge', name], { cwd: this.cwd });
                break;
            case 'squash':
                await this.exec.exec('git', ['merge', '--squash', name], { cwd: this.cwd });
                break;
            case 'rebase': {
                const currentBranch = (await this.status()).branch;
                await this.exec.exec('git', ['checkout', name], { cwd: this.cwd });
                await this.exec.exec('git', ['rebase', currentBranch], { cwd: this.cwd });
                await this.exec.exec('git', ['checkout', currentBranch], { cwd: this.cwd });
                await this.exec.exec('git', ['merge', '--ff-only', name], { cwd: this.cwd });
                break;
            }
            case 'retain':
                break;
        }
    }
    extractFilePath(line) {
        const trimmed = line.slice(3).trim();
        const arrowIndex = trimmed.indexOf(' -> ');
        if (arrowIndex !== -1) {
            return trimmed.slice(arrowIndex + 4).trim();
        }
        return trimmed;
    }
}
//# sourceMappingURL=git-ops.js.map