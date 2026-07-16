import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { ensureDir, fileExists, writeFile, copyDir, readJson } from '../utils/file-system.js';
import { execFileSafe, getNpmExecutable } from './openspec.js';
import { getNpxExecutable } from '../utils/platform.js';
import { getPlatformSkillsDir, PLATFORMS, type Platform } from './platforms.js';
import { installSuperpowersForPlatforms } from './superpowers.js';
import type { InstallScope } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DRIV_PACKAGE_ROOT = path.resolve(__dirname, '..', '..');

/** 离线包内容清单 */
export interface BundleManifest {
  drivVersion: string;
  createdAt: string;
  contents: {
    /** driv 自身 npm tarball（相对 bundle 根的路径），用于离线机器安装 driv */
    driv?: string;
    /** openspec npm tarball */
    openspec?: string;
    /** codegraph npm tarball */
    codegraph?: string;
    /** superpowers skills 目录（相对 bundle 根），内含 skills/<name>/SKILL.md */
    superpowers?: string;
  };
}

export interface ResolvedBundle {
  bundlePath: string;
  manifest: BundleManifest;
  /** 各组件的绝对路径 */
  drivTarball: string | null;
  openspecTarball: string | null;
  codegraphTarball: string | null;
  superpowersDir: string | null;
}

const BUNDLE_MANIFEST_FILE = 'bundle.json';
const SUPERPOWERS_DEFAULT_DIR = 'superpowers';

/**
 * 读取离线包目录，返回解析后的组件路径。
 * 若目录不存在或无清单，返回 null（调用方可据此判断是否提供了有效 bundle）。
 */
export async function resolveBundle(bundlePath: string): Promise<ResolvedBundle | null> {
  if (!bundlePath) return null;
  const abs = path.resolve(bundlePath);
  if (!(await fileExists(abs))) return null;

  const manifestPath = path.join(abs, BUNDLE_MANIFEST_FILE);
  let manifest: BundleManifest;
  if (await fileExists(manifestPath)) {
    manifest = (await readJson(manifestPath)) as BundleManifest;
  } else {
    // 无清单时按约定探测：driv-*.tgz / openspec-*.tgz / codegraph-*.tgz / superpowers/
    manifest = { drivVersion: '', createdAt: '', contents: {} };
  }

  const c = manifest.contents ?? {};
  const resolve = async (rel?: string): Promise<string | null> => {
    if (!rel) return null;
    const p = path.isAbsolute(rel) ? rel : path.join(abs, rel);
    return (await fileExists(p)) ? p : null;
  };

  const drivTarball = c.driv
    ? (await resolve(c.driv))
    : await findFirstTarball(abs, 'driv-');
  const openspecTarball = c.openspec
    ? (await resolve(c.openspec))
    : await findFirstTarball(abs, 'openspec-');
  const codegraphTarball = c.codegraph
    ? (await resolve(c.codegraph))
    : await findFirstTarball(abs, 'codegraph-');
  const superpowersDir = c.superpowers
    ? (await resolve(c.superpowers))
    : (await fileExists(path.join(abs, SUPERPOWERS_DEFAULT_DIR)))
      ? path.join(abs, SUPERPOWERS_DEFAULT_DIR)
      : null;

  return {
    bundlePath: abs,
    manifest,
    drivTarball,
    openspecTarball,
    codegraphTarball,
    superpowersDir,
  };
}

/** 在 bundle 目录中按前缀查找第一个 .tgz 文件 */
async function findFirstTarball(dir: string, prefix: string): Promise<string | null> {
  if (!(await fileExists(dir))) return null;
  try {
    const entries = await fs.promises.readdir(dir);
    const match = entries.find((e: string) => e.startsWith(prefix) && e.endsWith('.tgz'));
    return match ? path.join(dir, match) : null;
  } catch {
    return null;
  }
}

/**
 * 离线安装 OpenSpec：写入最小化 openspec/config.yaml，不依赖 npx。
 * 等价于 init 非交互模式的 offline 路径。
 */
export async function installOpenSpecOffline(targetPath: string): Promise<'installed' | 'skipped'> {
  const openspecDir = path.join(targetPath, 'openspec');
  if (await fileExists(path.join(openspecDir, 'config.yaml'))) {
    return 'skipped';
  }
  await ensureDir(openspecDir);
  await ensureDir(path.join(openspecDir, 'changes'));
  await ensureDir(path.join(openspecDir, 'specs'));
  await writeFile(
    path.join(openspecDir, 'config.yaml'),
    'profile: custom\ntools:\n  - opencode\n',
  );
  return 'installed';
}

/**
 * 离线安装 Superpowers：从 bundle 的 superpowers/skills/ 复制到各平台 skills 目录。
 * bundle 目录结构：<superpowersDir>/skills/<skillName>/SKILL.md
 */
export async function installSuperpowersOffline(
  baseDir: string,
  scope: InstallScope,
  platformIds: string[],
  bundle: ResolvedBundle,
): Promise<{ status: 'installed' | 'skipped' | 'failed'; copied: number }> {
  if (!bundle.superpowersDir) return { status: 'skipped', copied: 0 };
  const sourceSkillsDir = path.join(bundle.superpowersDir, 'skills');
  if (!(await fileExists(sourceSkillsDir))) return { status: 'skipped', copied: 0 };

  const selectedPlatforms = PLATFORMS.filter((p) => platformIds.includes(p.id));
  let totalCopied = 0;
  let anyInstalled = false;

  for (const platform of selectedPlatforms) {
    const platformSkillsDir = getPlatformSkillsDir(platform, scope);
    const destSkillsRoot = path.join(baseDir, platformSkillsDir, 'skills');
    const result = await copyDir(sourceSkillsDir, destSkillsRoot, { overwrite: true });
    totalCopied += result.copied;
    if (result.copied > 0) anyInstalled = true;
  }

  return {
    status: anyInstalled ? 'installed' : 'skipped',
    copied: totalCopied,
  };
}

/**
 * 离线安装 CodeGraph：从 bundle 中的本地 tarball 执行 npm install。
 * npm install <local-tarball> 不需要网络。
 */
export async function installCodegraphOffline(
  scope: InstallScope,
  targetPath: string,
  bundle: ResolvedBundle,
): Promise<'installed' | 'failed' | 'skipped'> {
  if (!bundle.codegraphTarball) return 'skipped';

  try {
    const npmCmd = getNpmExecutable();
    if (scope !== 'global') {
      // 确保 package.json 存在，避免 npm 向上查找根盘
      const pkgJsonPath = path.join(targetPath, 'package.json');
      if (!(await fileExists(pkgJsonPath))) {
        await writeFile(
          pkgJsonPath,
          JSON.stringify(
            {
              name: path.basename(targetPath).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
              version: '1.0.0',
              private: true,
            },
            null,
            2,
          ) + '\n',
        );
      }
    }
    const args =
      scope === 'global'
        ? ['install', '-g', bundle.codegraphTarball]
        : ['install', '--prefix', targetPath, bundle.codegraphTarball];
    const cwd = scope === 'global' ? os.homedir() : targetPath;
    await execFileSafe(npmCmd, args, {
      cwd,
      stdio: 'inherit',
      timeout: 300_000,
    });
    return 'installed';
  } catch {
    return 'failed';
  }
}

export interface PrepareBundleOptions {
  /** 是否打包 driv 自身 tarball */
  includeDriv?: boolean;
  /** 是否打包 openspec tarball */
  includeOpenspec?: boolean;
  /** 是否打包 codegraph tarball */
  includeCodegraph?: boolean;
  /** 是否打包 superpowers skills */
  includeSuperpowers?: boolean;
  /** 跳过需联网的组件（仅做本地 driv 打包） */
  noNetwork?: boolean;
}

export interface PrepareBundleResult {
  bundlePath: string;
  manifest: BundleManifest;
  driv?: string;
  openspec?: string;
  codegraph?: string;
  superpowers?: string;
  errors: string[];
}

const DEFAULT_BUNDLE_OPTIONS: Required<PrepareBundleOptions> = {
  includeDriv: true,
  includeOpenspec: true,
  includeCodegraph: true,
  includeSuperpowers: true,
  noNetwork: false,
};

/**
 * 预打包离线包：在联网环境下下载所有依赖到指定目录。
 * 产物结构：
 *   <bundlePath>/bundle.json
 *   <bundlePath>/driv-<version>.tgz          (npm pack)
 *   <bundlePath>/openspec-<version>.tgz       (npm pack @fission-ai/openspec)
 *   <bundlePath>/codegraph-<version>.tgz      (npm pack @colbymchenry/codegraph)
 *   <bundlePath>/superpowers/skills/<name>/   (npx skills add 到临时目录后复制)
 */
export async function prepareBundle(
  bundlePath: string,
  options: PrepareBundleOptions = {},
): Promise<PrepareBundleResult> {
  const opts = { ...DEFAULT_BUNDLE_OPTIONS, ...options };
  const abs = path.resolve(bundlePath);
  await ensureDir(abs);

  const manifest: BundleManifest = {
    drivVersion: '',
    createdAt: new Date().toISOString(),
    contents: {},
  };
  const errors: string[] = [];
  const result: PrepareBundleResult = { bundlePath: abs, manifest, errors };

  // 1. driv 自身 tarball
  if (opts.includeDriv) {
    try {
      const tgz = await npmPack(DRIV_PACKAGE_ROOT, abs);
      if (tgz) {
        manifest.contents.driv = path.basename(tgz);
        result.driv = tgz;
      }
    } catch (e) {
      errors.push(`driv pack failed: ${(e as Error).message}`);
    }
  }

  // 以下组件需要联网；noNetwork 模式跳过
  if (opts.noNetwork) {
    await finalizeBundle(abs, manifest);
    return result;
  }

  // 2. openspec tarball
  if (opts.includeOpenspec) {
    try {
      const tgz = await npmPackPackage('@fission-ai/openspec', abs);
      if (tgz) {
        manifest.contents.openspec = path.basename(tgz);
        result.openspec = tgz;
      }
    } catch (e) {
      errors.push(`openspec pack failed: ${(e as Error).message}`);
    }
  }

  // 3. codegraph tarball
  if (opts.includeCodegraph) {
    try {
      const tgz = await npmPackPackage('@colbymchenry/codegraph', abs);
      if (tgz) {
        manifest.contents.codegraph = path.basename(tgz);
        result.codegraph = tgz;
      }
    } catch (e) {
      errors.push(`codegraph pack failed: ${(e as Error).message}`);
    }
  }

  // 4. superpowers skills
  if (opts.includeSuperpowers) {
    try {
      const spDir = path.join(abs, SUPERPOWERS_DEFAULT_DIR);
      const skillsDir = await captureSuperpowersSkills(spDir);
      if (skillsDir) {
        manifest.contents.superpowers = SUPERPOWERS_DEFAULT_DIR;
        result.superpowers = skillsDir;
      }
    } catch (e) {
      errors.push(`superpowers capture failed: ${(e as Error).message}`);
    }
  }

  await finalizeBundle(abs, manifest);
  return result;
}

async function finalizeBundle(abs: string, manifest: BundleManifest): Promise<void> {
  await writeFile(path.join(abs, BUNDLE_MANIFEST_FILE), JSON.stringify(manifest, null, 2) + '\n');
}

/** 在指定目录执行 npm pack，返回生成的 tarball 绝对路径 */
async function npmPack(cwd: string, destDir: string): Promise<string | null> {
  const npmCmd = getNpmExecutable();
  // npm pack --pack-destination <dir> 在 npm 7+ 支持
  await execFileSafe(npmCmd, ['pack', '--pack-destination', destDir], {
    cwd,
    stdio: ['inherit', 'inherit', 'pipe'],
    timeout: 120_000,
  });
  // 找到 destDir 下最新生成的 .tgz（用 mtime 排序，避免字典序选错）
  const entries = await fs.promises.readdir(destDir);
  const tgzs = entries.filter((e: string) => e.endsWith('.tgz'));
  if (tgzs.length === 0) return null;
  let latest = tgzs[0];
  let latestMtime = 0;
  for (const e of tgzs) {
    const stat = await fs.promises.stat(path.join(destDir, e));
    if (stat.mtimeMs > latestMtime) {
      latestMtime = stat.mtimeMs;
      latest = e;
    }
  }
  return path.join(destDir, latest);
}

/** 对远程包执行 npm pack <pkg>，下载到 destDir */
async function npmPackPackage(pkg: string, destDir: string): Promise<string | null> {
  const npmCmd = getNpmExecutable();
  const stdout = await execFileSafe(
    npmCmd,
    ['pack', pkg, '--pack-destination', destDir],
    {
      cwd: destDir,
      stdio: ['inherit', 'inherit', 'pipe'],
      timeout: 180_000,
    },
  );
  // npm pack 会输出 tarball 文件名（可能带路径）
  const name = stdout.trim().split('\n').pop()?.trim();
  if (name) {
    const p = path.isAbsolute(name) ? name : path.join(destDir, path.basename(name));
    if (await fileExists(p)) return p;
  }
  // 兜底：扫描 destDir（用 await fs.promises.stat 避免阻塞事件循环）
  const entries = await fs.promises.readdir(destDir);
  const tgzNames = entries.filter((e: string) => e.endsWith('.tgz'));
  if (tgzNames.length === 0) return null;
  const stats = await Promise.all(
    tgzNames.map(async (e: string) => ({
      name: e,
      mtime: (await fs.promises.stat(path.join(destDir, e))).mtimeMs,
    })),
  );
  const tgz = stats.sort(
    (a: { name: string; mtime: number }, b: { name: string; mtime: number }) => b.mtime - a.mtime,
  )[0];
  return tgz ? path.join(destDir, tgz.name) : null;
}

/**
 * 在临时目录中执行 superpowers 在线安装，然后将 skills 目录复制到 bundle。
 */
async function captureSuperpowersSkills(bundleSuperpowersDir: string): Promise<string | null> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'driv-bundle-sp-'));
  try {
    // 用 opencode 作为 agent 安装到临时项目
    const status = await installSuperpowersForPlatforms(tmpDir, 'project', ['opencode']);
    if (status !== 'installed') return null;

    const sourceSkills = path.join(tmpDir, '.opencode', 'skills');
    if (!(await fileExists(sourceSkills))) return null;

    const destSkills = path.join(bundleSuperpowersDir, 'skills');
    await ensureDir(destSkills);
    await copyDir(sourceSkills, destSkills, { overwrite: true });
    return destSkills;
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}

export { getNpxExecutable };
export type { Platform };
