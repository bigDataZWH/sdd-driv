import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { getDrivSkills } from './update.js';
const DRIV_DIRS = ['.driv', '.driv/templates'];
const EXTRA_SKILLS = ['openspec-propose', 'openspec-apply', 'openspec-explore', 'openspec-archive'];
export async function uninstallCommand(targetPath, options = {}) {
    const scope = options.scope ?? 'project';
    const baseDir = scope === 'global' ? os.homedir() : path.resolve(targetPath);
    const log = options.json ? () => undefined : console.log;
    const result = { skillsRemoved: 0, commandsRemoved: 0, dirsRemoved: 0 };
    if (!options.json) {
        log(`\n  Driv Uninstall (scope: ${scope})`);
        log(`  Target: ${baseDir}\n`);
    }
    // Collect all driv skills to remove
    const skillNames = [...getDrivSkills(), ...EXTRA_SKILLS];
    const commandsDir = path.join(baseDir, '.opencode', 'commands');
    const skillsDir = path.join(baseDir, '.opencode', 'skills');
    // Preview
    const existingSkills = skillNames.filter((name) => fs.existsSync(path.join(skillsDir, name, 'SKILL.md')));
    const existingCommands = skillNames.filter((name) => fs.existsSync(path.join(commandsDir, `${name}.md`)));
    if (existingSkills.length === 0 && existingCommands.length === 0) {
        const msg = '  No Driv installations found. Nothing to uninstall.\n';
        log(msg);
        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
        }
        return result;
    }
    if (!options.json) {
        log(`  Found:`);
        if (existingSkills.length > 0)
            log(`    Skills: ${existingSkills.length}`);
        if (existingCommands.length > 0)
            log(`    Commands: ${existingCommands.length}`);
        log('');
    }
    // Confirm
    if (!options.force && !options.json) {
        const readline = await import('readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise((resolve) => {
            rl.question('  Remove all Driv skills and commands? (y/N): ', resolve);
        });
        rl.close();
        if (answer.toLowerCase() !== 'y') {
            log('  Cancelled.\n');
            return result;
        }
    }
    // Execute removal
    for (const name of existingSkills) {
        const dir = path.join(skillsDir, name);
        await fs.promises.rm(dir, { recursive: true, force: true });
        result.skillsRemoved++;
    }
    for (const name of existingCommands) {
        const file = path.join(commandsDir, `${name}.md`);
        try {
            await fs.promises.unlink(file);
            result.commandsRemoved++;
        }
        catch {
            // file may already be gone
        }
    }
    // Remove working directories (project scope only)
    if (scope === 'project') {
        for (const dir of DRIV_DIRS) {
            const fullPath = path.join(baseDir, dir);
            if (fs.existsSync(fullPath)) {
                await fs.promises.rm(fullPath, { recursive: true, force: true });
                result.dirsRemoved++;
            }
        }
    }
    if (options.json) {
        console.log(JSON.stringify(result, null, 2));
    }
    else {
        log(`  Summary:`);
        log(`    Skills removed: ${result.skillsRemoved}`);
        log(`    Commands removed: ${result.commandsRemoved}`);
        if (result.dirsRemoved > 0)
            log(`    Working directories removed: ${result.dirsRemoved}`);
        log(`\n  Uninstall complete.\n`);
    }
    return result;
}
//# sourceMappingURL=uninstall.js.map