import * as path from 'path';
import * as os from 'os';
import { createOpenCodeCommands } from '../core/skills.js';
import { syncDrivAssets } from '../core/assets.js';
import { loadManifest, getPackageVersion } from '../core/manifest.js';
import { getManifestSkills } from '../core/manifest.js';
const DRIV_SKILLS = [
    'driv-clarify',
    'driv-design',
    'driv-build',
    'driv-verify',
    'driv-archive',
    'driv-review',
    'driv-cleancode',
    'driv',
    'driv-hotfix',
    'driv-tweak',
];
export function getDrivSkills() {
    return [...DRIV_SKILLS];
}
export async function updateCommand(targetPath, options = {}) {
    const scope = options.scope ?? 'project';
    const baseDir = scope === 'global' ? os.homedir() : path.resolve(targetPath);
    const log = options.json ? () => undefined : console.log;
    if (!options.json) {
        log(`  Driv Update (scope: ${scope})`);
        log(`  Version: ${getPackageVersion()}\n`);
    }
    const manifest = await loadManifest(baseDir);
    const useZh = options.language === 'zh';
    const skillNames = getManifestSkills(manifest, useZh);
    const overwrite = options.overwrite ?? false;
    const commands = await createOpenCodeCommands(baseDir, skillNames, overwrite);
    const templates = scope === 'project' ? await syncDrivAssets(baseDir, { overwrite }) : { copied: 0, skipped: 0 };
    const summary = `Driv commands: ${commands.copied} updated, ${commands.skipped} skipped\nTemplates: ${templates.copied} copied, ${templates.skipped} skipped`;
    if (!options.json) {
        log(`  Commands updated: ${commands.copied}`);
        log(`  Commands skipped: ${commands.skipped}`);
        log(`  Templates copied: ${templates.copied}`);
        log(`  Templates skipped: ${templates.skipped}`);
    }
    const result = { commands, templates, scope, summary };
    if (options.json) {
        console.log(JSON.stringify(result, null, 2));
    }
    else if (commands.copied > 0) {
        log(`\n  Skills synchronized.`);
    }
    return result;
}
//# sourceMappingURL=update.js.map