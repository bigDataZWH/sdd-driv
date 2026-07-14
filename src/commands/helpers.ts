import * as path from 'path';
import { promises as fs } from 'fs';
import { fileExists } from '../utils/file-system.js';

export async function listActiveChangeNames(root: string): Promise<string[]> {
  const changesDir = path.join(root, 'openspec', 'changes');
  if (!(await fileExists(changesDir))) return [];

  const entries = await fs.readdir(changesDir, { withFileTypes: true });
  const names: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const statePath = path.join(changesDir, entry.name, '.driv.yaml');
    if (await fileExists(statePath)) {
      names.push(entry.name);
    }
  }

  return names;
}
