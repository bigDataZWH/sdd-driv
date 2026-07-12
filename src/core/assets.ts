import * as path from 'path';
import { fileURLToPath } from 'url';
import { copyDir, ensureDir, fileExists } from '../utils/file-system.js';
import * as fs from 'fs';

export interface AssetSyncResult {
  copied: number;
  skipped: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DRIV_PACKAGE_ROOT = path.resolve(__dirname, '..', '..');

async function copyFileWithPolicy(
  src: string,
  dest: string,
  options: { overwrite?: boolean; skipExisting?: boolean },
): Promise<AssetSyncResult> {
  const exists = await fileExists(dest);
  if (exists && options.skipExisting) return { copied: 0, skipped: 1 };
  if (exists && !options.overwrite) return { copied: 0, skipped: 1 };

  await ensureDir(path.dirname(dest));
  await fs.promises.copyFile(src, dest);
  return { copied: 1, skipped: 0 };
}

export async function syncDrivAssets(
  baseDir: string,
  options: { overwrite?: boolean; skipExisting?: boolean } = {},
): Promise<AssetSyncResult> {
  const sourceDrivDir = path.join(DRIV_PACKAGE_ROOT, '.driv');
  const sourceConfig = path.join(sourceDrivDir, 'config.yaml');
  const sourceTemplates = path.join(sourceDrivDir, 'templates');

  if (!(await fileExists(sourceConfig))) {
    throw new Error(`Driv 默认配置不存在: ${sourceConfig}`);
  }
  if (!(await fileExists(sourceTemplates))) {
    throw new Error(`Driv 默认模板目录不存在: ${sourceTemplates}`);
  }

  const targetDrivDir = path.join(baseDir, '.driv');
  await ensureDir(targetDrivDir);

  const configResult = await copyFileWithPolicy(
    sourceConfig,
    path.join(targetDrivDir, 'config.yaml'),
    options,
  );
  const templatesResult = await copyDir(sourceTemplates, path.join(targetDrivDir, 'templates'), {
    ...options,
    ignore: ['custom'],
  });

  return {
    copied: configResult.copied + templatesResult.copied,
    skipped: configResult.skipped + templatesResult.skipped,
  };
}
