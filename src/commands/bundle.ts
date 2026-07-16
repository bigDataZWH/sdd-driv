import * as path from 'path';
import { getPackageVersion } from '../core/manifest.js';
import { prepareBundle, type PrepareBundleOptions } from '../core/offline.js';

export interface BundleOptions {
  /** 仅打包 driv 自身，跳过联网下载 */
  noNetwork?: boolean;
  /** 跳过 openspec 打包 */
  skipOpenspec?: boolean;
  /** 跳过 codegraph 打包 */
  skipCodegraph?: boolean;
  /** 跳过 superpowers 打包 */
  skipSuperpowers?: boolean;
  /** 跳过 driv 自身打包 */
  skipDriv?: boolean;
  /** JSON 输出 */
  json?: boolean;
}

export interface BundleResult {
  bundlePath: string;
  manifest: {
    drivVersion: string;
    createdAt: string;
    contents: Record<string, string>;
  };
  errors: string[];
}

export async function bundleCommand(
  bundlePath: string,
  options: BundleOptions = {},
): Promise<BundleResult> {
  const log = options.json ? () => undefined : console.log;
  const target = path.resolve(bundlePath);

  if (!options.json) {
    log(`\n  Driv offline bundle`);
    log(`  Version: ${await getPackageVersion()}`);
    log(`  Output: ${target}\n`);
  }

  const prepareOptions: PrepareBundleOptions = {
    includeDriv: !options.skipDriv,
    includeOpenspec: !options.skipOpenspec && !options.noNetwork,
    includeCodegraph: !options.skipCodegraph && !options.noNetwork,
    includeSuperpowers: !options.skipSuperpowers && !options.noNetwork,
    noNetwork: options.noNetwork,
  };

  const result = await prepareBundle(target, prepareOptions);

  if (!options.json) {
    log(`  Bundle prepared at: ${result.bundlePath}`);
    if (result.driv) log(`    driv:         ${path.basename(result.driv)}`);
    if (result.openspec) log(`    openspec:     ${path.basename(result.openspec)}`);
    if (result.codegraph) log(`    codegraph:    ${path.basename(result.codegraph)}`);
    if (result.superpowers) log(`    superpowers:  ${result.superpowers}`);
    if (result.errors.length > 0) {
      log(`\n  Warnings:`);
      for (const err of result.errors) log(`    - ${err}`);
    }
    log(`\n  Usage on offline machine:`);
    log(`    1. Copy this bundle directory to the offline machine`);
    log(`    2. Install driv:  npm install -g <bundle>/driv-*.tgz`);
    log(`    3. Run init:      driv init --offline --bundle <bundle>\n`);
  }

  return {
    bundlePath: result.bundlePath,
    manifest: result.manifest,
    errors: result.errors,
  };
}
