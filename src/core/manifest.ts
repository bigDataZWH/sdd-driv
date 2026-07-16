import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { DrivManifest, InstallOptions } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_JSON_PATH = path.join(__dirname, '..', '..', 'package.json');

const DEFAULT_SKILLS = [
  'driv',
  'driv-clarify',
  'driv-design',
  'driv-build',
  'driv-verify',
  'driv-archive',
  'driv-review',
  'driv-cleancode',
  'driv-hotfix',
  'driv-tweak',
];

const DEFAULT_LANGUAGES = [
  { id: 'en', name: 'English', skillsDir: 'skills' },
  { id: 'zh', name: '中文', skillsDir: 'skills' },
];

const DEFAULT_RULES = ['rules/driv-phase-guard.md'];

const DEFAULT_HOOKS: DrivManifest['hooks'] = {
  'scripts/driv-validate.sh': {
    matcher: 'Write|Edit',
    description: 'Driv Phase Guard - Validate workflow state before writing code',
  },
};

function buildDefaultManifest(packageVersion: string): DrivManifest {
  return {
    version: '1',
    packageVersion,
    assetsVersion: '1',
    skills: [...DEFAULT_SKILLS],
    skillsZh: [...DEFAULT_SKILLS],
    rules: [...DEFAULT_RULES],
    hooks: Object.fromEntries(
      Object.entries(DEFAULT_HOOKS).map(([k, v]) => [k, { ...v }]),
    ),
    languages: DEFAULT_LANGUAGES.map((l) => ({ ...l })),
    createdAt: new Date().toISOString(),
  };
}

let cachedPkgVersion: string | null = null;

const MANIFEST_FILENAME = 'manifest.json';

export async function getPackageVersion(): Promise<string> {
  if (cachedPkgVersion !== null) return cachedPkgVersion;
  try {
    const content = await fs.promises.readFile(PACKAGE_JSON_PATH, 'utf-8');
    const pkg = JSON.parse(content) as { version: string };
    cachedPkgVersion = pkg.version;
    return cachedPkgVersion;
  } catch {
    cachedPkgVersion = '0.0.0';
    return cachedPkgVersion;
  }
}

let cachedManifest: DrivManifest | null = null;

export async function getManifest(): Promise<DrivManifest> {
  if (!cachedManifest) {
    const version = await getPackageVersion();
    cachedManifest = buildDefaultManifest(version);
  }
  return { ...cachedManifest, createdAt: new Date().toISOString() };
}

export function getDefaultManifest(): DrivManifest {
  return buildDefaultManifest(cachedPkgVersion ?? '0.0.0');
}

export async function loadManifest(root: string): Promise<DrivManifest> {
  const assetsDir = path.join(root, 'assets');
  const manifestPath = path.join(assetsDir, MANIFEST_FILENAME);
  try {
    const content = await fs.promises.readFile(manifestPath, 'utf-8');
    return JSON.parse(content) as DrivManifest;
  } catch {
    return getManifest();
  }
}

export async function writeManifest(root: string, manifest: DrivManifest): Promise<void> {
  const assetsDir = path.join(root, 'assets');
  await fs.promises.mkdir(assetsDir, { recursive: true });
  await fs.promises.writeFile(
    path.join(assetsDir, MANIFEST_FILENAME),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );
}

export function getManifestSkills(manifest: DrivManifest, useZh: boolean): string[] {
  return useZh ? manifest.skillsZh : manifest.skills;
}

export async function ensureManifest(root: string, options: InstallOptions): Promise<DrivManifest> {
  const existing = await loadManifest(root);
  const packageVersion = await getPackageVersion();
  const manifest: DrivManifest = {
    ...existing,
    version: '1',
    packageVersion,
    assetsVersion: existing.assetsVersion || '1',
    createdAt: existing.createdAt || new Date().toISOString(),
  };
  if (!options.overwrite && Object.keys(existing).length > 1) {
    return existing;
  }
  manifest.rules = existing.rules || [];
  manifest.hooks = existing.hooks || {};
  manifest.languages = existing.languages || DEFAULT_LANGUAGES.map((l) => ({ ...l }));
  await writeManifest(root, manifest);
  return manifest;
}
