import { Command, Option } from 'commander';
import { createRequire } from 'module';
import { initCommand } from '../commands/init.js';
import { statusCommand } from '../commands/status.js';
import { doctorCommand } from '../commands/doctor.js';
import { updateCommand } from '../commands/update.js';
import { uninstallCommand } from '../commands/uninstall.js';
import * as path from 'path';
const require = createRequire(import.meta.url);
const { version } = require('../../package.json');
export function registerCommands() {
    return ['init', 'status', 'doctor', 'update', 'uninstall', 'review'];
}
export function formatStatusOutput(input) {
    return [
        `Change: ${input.change}`,
        `Phase: ${input.phase}`,
        `Gates: ${input.gates.join(', ') || 'none'}`,
        `Reports: ${input.reports.join(', ') || 'none'}`,
        `Next: ${input.nextStep}`,
    ].join('\n');
}
export async function doctorCheck(projectPath = process.cwd()) {
    const { doctorCommand } = await import('../commands/doctor.js');
    return doctorCommand(projectPath, { scope: 'auto' });
}
export function createProgram() {
    const program = new Command();
    program
        .name('driv')
        .description('Driv - OpenSpec + Superpowers workflow integration tool')
        .version(version);
    program
        .command('init [path]')
        .description('Initialize Driv workflow in your project')
        .option('--yes', 'Auto-install missing components, skip existing')
        .option('--skip-existing', 'Never overwrite existing components')
        .option('--overwrite', 'Overwrite existing files')
        .option('--json', 'Output as JSON')
        .addOption(new Option('--scope <scope>', 'Install scope').choices(['global', 'project']))
        .action(async (targetPath = '.', options) => {
        const resolved = path.resolve(targetPath);
        const result = await initCommand(resolved, ['opencode'], {
            yes: options.yes,
            scope: options.scope,
            skipExisting: options.skipExisting,
            overwrite: options.overwrite,
            json: options.json,
        });
        if (options.json) {
            // JSON output done inside initCommand
            return;
        }
    });
    program
        .command('status [path]')
        .description('Show active changes and workflow status')
        .option('--json', 'Output as JSON')
        .action(async (targetPath = '.', options) => {
        await statusCommand(path.resolve(targetPath), options);
    });
    program
        .command('doctor [path]')
        .description('Diagnose Driv installation health')
        .option('--json', 'Output as JSON')
        .addOption(new Option('--scope <scope>', 'Diagnosis scope').choices(['auto', 'global', 'project']))
        .action(async (targetPath = '.', options) => {
        await doctorCommand(path.resolve(targetPath), {
            scope: options.scope,
            json: options.json,
        });
    });
    program
        .command('update [path]')
        .description('Update Driv skill files to latest version')
        .option('--json', 'Output as JSON')
        .option('--overwrite', 'Overwrite existing commands')
        .addOption(new Option('--scope <scope>', 'Install scope').choices(['global', 'project']))
        .addOption(new Option('--language <lang>', 'Language for skills').choices(['en', 'zh']))
        .action(async (targetPath = '.', options) => {
        await updateCommand(path.resolve(targetPath), {
            overwrite: options.overwrite,
            json: options.json,
            scope: options.scope,
            language: options.language,
        });
    });
    program
        .command('uninstall [path]')
        .description('Remove Driv skills and commands from your project or global scope')
        .option('--json', 'Output as JSON')
        .addOption(new Option('--scope <scope>', 'Uninstall scope').choices(['global', 'project']))
        .option('--force', 'Skip confirmation prompts')
        .action(async (targetPath = '.', options) => {
        await uninstallCommand(path.resolve(targetPath), {
            json: options.json,
            scope: options.scope,
            force: options.force,
        });
    });
    program
        .command('review')
        .description('Review command placeholder')
        .action(() => {
        console.log('Review not implemented yet');
    });
    return program;
}
async function main(argv = process.argv) {
    await createProgram().parseAsync(argv);
}
export { main };
const isDirectRun = process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index.ts');
if (isDirectRun) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map