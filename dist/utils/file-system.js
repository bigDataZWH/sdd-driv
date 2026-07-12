import * as fs from 'fs';
import * as path from 'path';
function isWithinRoot(target, root) {
    const rel = path.relative(root, target);
    return !rel.startsWith('..') && !path.isAbsolute(rel);
}
export class FileSystem {
    root;
    constructor(root) {
        this.root = path.resolve(root);
    }
    async ensureDir(dir) {
        await fs.promises.mkdir(path.resolve(dir), { recursive: true });
    }
    async writeFile(filePath, content) {
        const resolved = path.resolve(filePath);
        if (!isWithinRoot(resolved, this.root)) {
            throw new Error(`Path ${resolved} is outside project root ${this.root}`);
        }
        await this.ensureDir(path.dirname(resolved));
        await fs.promises.writeFile(resolved, content, 'utf-8');
    }
    async readFile(filePath) {
        const resolved = path.resolve(filePath);
        if (!isWithinRoot(resolved, this.root)) {
            throw new Error(`Path ${resolved} is outside project root ${this.root}`);
        }
        return fs.promises.readFile(resolved, 'utf-8');
    }
    async exists(filePath) {
        try {
            await fs.promises.access(path.resolve(filePath));
            return true;
        }
        catch {
            return false;
        }
    }
    async copyFile(src, dest) {
        await this.ensureDir(path.dirname(path.resolve(dest)));
        await fs.promises.copyFile(path.resolve(src), path.resolve(dest));
    }
    async listDir(dir) {
        const entries = await fs.promises.readdir(path.resolve(dir), { withFileTypes: true });
        return entries.map((e) => e.name);
    }
    async readJson(filePath) {
        const content = await this.readFile(filePath);
        return JSON.parse(content);
    }
}
export async function fileExists(filePath) {
    try {
        await fs.promises.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
export async function ensureDir(dir) {
    await fs.promises.mkdir(dir, { recursive: true });
}
export async function writeFile(filePath, content) {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf-8');
}
export async function readDir(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    return entries.map((e) => e.name);
}
export async function readJson(filePath) {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content);
}
export async function copyFile(src, dest) {
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.copyFile(src, dest);
}
export async function copyDir(srcDir, destDir, options = {}) {
    let copied = 0;
    let skipped = 0;
    const rootSrcDir = srcDir;
    async function copyEntries(currentSrcDir, currentDestDir) {
        await fs.promises.mkdir(currentDestDir, { recursive: true });
        const entries = await fs.promises.readdir(currentSrcDir, { withFileTypes: true });
        for (const entry of entries) {
            const src = path.join(currentSrcDir, entry.name);
            const dest = path.join(currentDestDir, entry.name);
            const relativeSrc = path.relative(rootSrcDir, src).replace(/\\/g, '/');
            if (options.ignore?.some((pattern) => relativeSrc === pattern || relativeSrc.startsWith(`${pattern}/`))) {
                continue;
            }
            if (entry.isDirectory()) {
                await copyEntries(src, dest);
                continue;
            }
            const exists = await fileExists(dest);
            if (exists && options.skipExisting) {
                skipped++;
                continue;
            }
            if (exists && !options.overwrite) {
                skipped++;
                continue;
            }
            await fs.promises.mkdir(path.dirname(dest), { recursive: true });
            await fs.promises.copyFile(src, dest);
            copied++;
        }
    }
    await copyEntries(srcDir, destDir);
    return { copied, skipped };
}
//# sourceMappingURL=file-system.js.map