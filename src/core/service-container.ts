import { FileSystem } from '../utils/file-system.js';
import { YamlParser } from '../utils/yaml-parser.js';
import { ScriptExec } from '../utils/script-exec.js';
import { PathResolver } from './path-resolver.js';
import { StateMachine } from './state-machine.js';
import { TemplateManager } from './template-manager.js';
import { PhaseGuardImpl } from './phase-guard.js';
import { HandoffManager } from './handoff-manager.js';
import { ReviewSystemImpl } from './review-system.js';
import { DirtyWorktreeChecker } from './dirty-worktree.js';
import { BuildOrchestrator } from './build-orchestrator.js';
import { GitOps, GitOpsImpl } from './git-ops.js';

export interface ServiceContainer {
  fs: FileSystem;
  parser: YamlParser;
  resolver: PathResolver;
  stateMachine: StateMachine;
  templateManager: TemplateManager;
  phaseGuard: PhaseGuardImpl;
  handoffManager: HandoffManager;
  reviewSystem: ReviewSystemImpl;
  buildOrchestrator: BuildOrchestrator;
  gitOps: GitOps;
  scriptExec: ScriptExec;
}

export function createServices(root: string): ServiceContainer {
  const fs = new FileSystem(root);
  const parser = new YamlParser(fs);
  const resolver = new PathResolver(root);
  const stateMachine = new StateMachine(fs, parser, resolver);
  const templateManager = new TemplateManager(fs, root);
  const handoffManager = new HandoffManager(fs, resolver, parser);
  const phaseGuard = new PhaseGuardImpl(
    new DirtyWorktreeChecker(root),
    handoffManager,
    fs,
    undefined,
    templateManager,
  );
  const reviewSystem = new ReviewSystemImpl(fs, templateManager, stateMachine, resolver);
  const scriptExec = new ScriptExec();
  const gitOps = new GitOpsImpl(scriptExec, root);
  const buildOrchestrator = new BuildOrchestrator(fs, stateMachine, gitOps, resolver, handoffManager);
  return { fs, parser, resolver, stateMachine, templateManager, phaseGuard, handoffManager, reviewSystem, buildOrchestrator, gitOps, scriptExec };
}
