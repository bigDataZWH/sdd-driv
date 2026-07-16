import { Command, Option } from 'commander';
import { createRequire } from 'module';
import { initCommand } from '../commands/init.js';
import { statusCommand } from '../commands/status.js';
import { doctorCommand } from '../commands/doctor.js';
import { updateCommand } from '../commands/update.js';
import { uninstallCommand } from '../commands/uninstall.js';
import { reviewCommand } from '../commands/review.js';
import { bundleCommand } from '../commands/bundle.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

export interface StatusInput {
  change: string;
  phase: string;
  gates: string[];
  reports: string[];
  nextStep: string;
}

export function registerCommands(): string[] {
  return ['init', 'status', 'doctor', 'update', 'uninstall', 'review', 'bundle'];
}

export function formatStatusOutput(input: StatusInput): string {
  return [
    `Change: ${input.change}`,
    `Phase: ${input.phase}`,
    `Gates: ${input.gates.join(', ') || 'none'}`,
    `Reports: ${input.reports.join(', ') || 'none'}`,
    `Next: ${input.nextStep}`,
  ].join('\n');
}

export async function doctorCheck(
  projectPath = process.cwd(),
): Promise<import('../commands/doctor.js').DoctorResult[]> {
  const { doctorCommand } = await import('../commands/doctor.js');
  return doctorCommand(projectPath, { scope: 'auto' });
}

export function createProgram(): Command {
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
    .option('--offline', 'Offline mode: skip all network operations, use offline fallbacks')
    .option('--bundle <path>', 'Offline bundle directory (use with --offline)')
    .addOption(new Option('--scope <scope>', 'Install scope').choices(['global', 'project']))
    .action(async (targetPath = '.', options) => {
      try {
        await initCommand(targetPath, [], {
          yes: options.yes,
          scope: options.scope,
          skipExisting: options.skipExisting,
          overwrite: options.overwrite,
          json: options.json,
          offline: options.offline,
          bundle: options.bundle,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'ExitPromptError') {
          console.log('\n  Cancelled.\n');
          process.exit(0);
        }
        throw error;
      }
    });

  program
    .command('bundle [path]')
    .description('Prepare an offline bundle with driv and its dependencies')
    .option('--no-network', 'Only bundle driv itself, skip network downloads')
    .option('--skip-driv', 'Skip bundling driv tarball')
    .option('--skip-openspec', 'Skip bundling openspec tarball')
    .option('--skip-codegraph', 'Skip bundling codegraph tarball')
    .option('--skip-superpowers', 'Skip bundling superpowers skills')
    .option('--json', 'Output as JSON')
    .action(async (targetPath = '.', options) => {
      await bundleCommand(targetPath, {
        noNetwork: options.noNetwork,
        skipDriv: options.skipDriv,
        skipOpenspec: options.skipOpenspec,
        skipCodegraph: options.skipCodegraph,
        skipSuperpowers: options.skipSuperpowers,
        json: options.json,
      });
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
    .addOption(
      new Option('--scope <scope>', 'Diagnosis scope').choices(['auto', 'global', 'project']),
    )
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
      } catch (error) {
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
      } catch (error) {
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
      } catch (error) {
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