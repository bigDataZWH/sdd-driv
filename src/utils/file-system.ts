import * as fs from 'fs';
import * as path from 'path';

function isWithinRoot(target: string, root: string): boolean {
  const rel = path.relative(root, target);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

export class FileSystem {
  readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  async ensureDir(dir: string): Promise<void> {
    await fs.promises.mkdir(path.resolve(dir), { recursive: true });
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const resolved = path.resolve(filePath);
    if (!isWithinRoot(resolved, this.root)) {
      throw new Error(`Path ${resolved} is outside project root ${this.root}`);
    }
    await this.ensureDir(path.dirname(resolved));
    await fs.promises.writeFile(resolved, content, 'utf-8');
  }

  async readFile(filePath: string): Promise<string> {
    const resolved = path.resolve(filePath);
    if (!isWithinRoot(resolved, this.root)) {
      throw new Error(`Path ${resolved} is outside project root ${this.root}`);
    }
    return fs.promises.readFile(resolved, 'utf-8');
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(path.resolve(filePath));
      return true;
    } catch {
      return false;
    }
  }

  async copyFile(src: string, dest: string): Promise<void> {
    await this.ensureDir(path.dirname(path.resolve(dest)));
    await fs.promises.copyFile(path.resolve(src), path.resolve(dest));
  }

  async listDir(dir: string): Promise<string[]> {
    const entries = await fs.promises.readdir(path.resolve(dir), { withFileTypes: true });
    return entries.map((e) => e.name);
  }

  async readJson<T = unknown>(filePath: string): Promise<T> {
    const content = await this.readFile(filePath);
    return JSON.parse(content) as T;
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.promises.mkdir(dir, { recursive: true });
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, content, 'utf-8');
}

export async function readDir(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  return entries.map((e) => e.name);
}

export async function readJson<T = unknown>(filePath: string): Promise<T> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export async function copyFile(src: string, dest: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await fs.promises.copyFile(src, dest);
}

export async function removeFile(filePath: string): Promise<boolean> {
  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function removeDir(dirPath: string): Promise<boolean> {
  try {
    await fs.promises.rm(dirPath, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export async function isDirEmpty(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.promises.readdir(dirPath);
    return entries.length === 0;
  } catch {
    return true;
  }
}

export async function copyDir(
  srcDir: string,
  destDir: string,
  options: { overwrite?: boolean; skipExisting?: boolean; ignore?: string[] } = {},
): Promise<{ copied: number; skipped: number }> {
  let copied = 0;
  let skipped = 0;

  const rootSrcDir = srcDir;

  async function copyEntries(currentSrcDir: string, currentDestDir: string) {
    await fs.promises.mkdir(currentDestDir, { recursive: true });
    const entries = await fs.promises.readdir(currentSrcDir, { withFileTypes: true });

    for (const entry of entries) {
      const src = path.join(currentSrcDir, entry.name);
      const dest = path.join(currentDestDir, entry.name);
      const relativeSrc = path.relative(rootSrcDir, src).replace(/\\/g, '/');

      if (
        options.ignore?.some(
          (pattern) => relativeSrc === pattern || relativeSrc.startsWith(`${pattern}/`),
        )
      ) {
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
