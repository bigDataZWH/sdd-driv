import { Command, Option } from 'commander';
import { createRequire } from 'module';
import { initCommand } from '../commands/init.js';
import { statusCommand } from '../commands/status.js';
import { doctorCommand } from '../commands/doctor.js';
import { updateCommand } from '../commands/update.js';
import { uninstallCommand } from '../commands/uninstall.js';
import { reviewCommand } from '../commands/review.js';
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
        try {
            await initCommand(targetPath, [], {
                yes: options.yes,
                scope: options.scope,
                skipExisting: options.skipExisting,
                overwrite: options.overwrite,
                json: options.json,
            });
        }
        catch (error) {
            if (error instanceof Error && error.name === 'ExitPromptError') {
                console.log('\n  Cancelled.\n');
                process.exit(0);
            }
            throw error;
        }
    });
    program
        .command('status [path]')
        .description('Show active changes and workflow status')
        .option('--json', 'Output as JSON')
        .action(async (targetPath = '.', options) => {
        await statusCommand(targetPath, options);
    });
    program
        .command('doctor [path]')
        .description('Diagnose Driv installation health')
        .option('--json', 'Output as JSON')
        .addOption(new Option('--scope <scope>', 'Diagnosis scope').choices(['auto', 'global', 'project']))
        .action(async (targetPath = '.', options) => {
        await doctorCommand(targetPath, {
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
        .addOption(new Option('--skip-npm', 'Skip npm package self-update').hideHelp())
        .action(async (targetPath = '.', options) => {
        try {
            await updateCommand(targetPath, {
                overwrite: options.overwrite,
                json: options.json,
                scope: options.scope,
                language: options.language,
                skipNpm: options.skipNpm,
            });
        }
        catch (error) {
            if (error instanceof Error && error.name === 'ExitPromptError') {
                console.log('\n  Cancelled.\n');
                process.exit(0);
            }
            throw error;
        }
    });
    program
        .command('uninstall [path]')
        .description('Remove Driv skills and commands from your project or global scope')
        .option('--json', 'Output as JSON')
        .addOption(new Option('--scope <scope>', 'Uninstall scope').choices(['global', 'project']))
        .option('--force', 'Skip confirmation prompts')
        .action(async (targetPath = '.', options) => {
        try {
            await uninstallCommand(targetPath, {
                json: options.json,
                scope: options.scope,
                force: options.force,
            });
        }
        catch (error) {
            if (error instanceof Error && error.name === 'ExitPromptError') {
                console.log('\n  Cancelled.\n');
                process.exit(0);
            }
            throw error;
        }
    });
    program
        .command('review')
        .description('Manage Driv reviews (requirement, technical, code)')
        .option('--json', 'Output as JSON')
        .addOption(new Option('--type <type>', 'Review type').choices(['requirement', 'technical', 'code']))
        .option('--change <name>', 'Specify change name')
        .action(async (options) => {
        try {
            await reviewCommand(process.cwd(), {
                json: options.json,
                type: options.type,
                change: options.change,
            });
        }
        catch (error) {
            if (error instanceof Error && error.name === 'ExitPromptError') {
                console.log('\n  Cancelled.\n');
                process.exit(0);
            }
            throw error;
        }
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