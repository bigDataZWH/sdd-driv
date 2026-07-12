import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { version: pkgVersion } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8'));
const DEFAULT_MANIFEST = {
    version: '1',
    packageVersion: pkgVersion,
    assetsVersion: '1',
    skills: [
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
    ],
    skillsZh: [
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
    ],
    rules: [],
    hooks: {},
    languages: [
        { id: 'en', name: 'English', skillsDir: 'skills' },
        { id: 'zh', name: '中文', skillsDir: 'skills' },
    ],
    createdAt: new Date().toISOString(),
};
const MANIFEST_FILENAME = 'manifest.json';
export function getDefaultManifest() {
    return { ...DEFAULT_MANIFEST, createdAt: new Date().toISOString() };
}
export async function loadManifest(root) {
    const assetsDir = path.join(root, 'assets');
    const manifestPath = path.join(assetsDir, MANIFEST_FILENAME);
    try {
        const content = await fs.promises.readFile(manifestPath, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return getDefaultManifest();
    }
}
export async function writeManifest(root, manifest) {
    const assetsDir = path.join(root, 'assets');
    await fs.promises.mkdir(assetsDir, { recursive: true });
    await fs.promises.writeFile(path.join(assetsDir, MANIFEST_FILENAME), JSON.stringify(manifest, null, 2), 'utf-8');
}
export function getPackageVersion() {
    return pkgVersion;
}
export function getManifestSkills(manifest, useZh) {
    return useZh ? manifest.skillsZh : manifest.skills;
}
export async function ensureManifest(root, options) {
    const existing = await loadManifest(root);
    const manifest = {
        ...existing,
        version: '1',
        packageVersion: pkgVersion,
        assetsVersion: existing.assetsVersion || '1',
        createdAt: existing.createdAt || new Date().toISOString(),
    };
    if (!options.overwrite && Object.keys(existing).length > 1) {
        return existing;
    }
    manifest.rules = existing.rules || [];
    manifest.hooks = existing.hooks || {};
    manifest.languages = existing.languages || DEFAULT_MANIFEST.languages;
    await writeManifest(root, manifest);
    return manifest;
}
//# sourceMappingURL=manifest.js.map