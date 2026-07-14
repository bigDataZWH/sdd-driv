import * as fs from 'fs';
import { FileSystem } from '../utils/file-system.js';
import { YamlParser } from '../utils/yaml-parser.js';
import { PathResolver } from './path-resolver.js';
import { Phase, ChangeState, createDefaultState } from './types.js';

const PHASE_ORDER: Phase[] = ['clarify', 'design', 'build', 'verify', 'archive'];

function validateChangeState(data: unknown): ChangeState {
  if (!data || typeof data !== 'object') throw new Error('Invalid state: not an object');
  const obj = data as Record<string, unknown>;
  if (!obj.change || typeof obj.change !== 'string')
    throw new Error('Invalid state: missing change');
  if (!obj.phase || typeof obj.phase !== 'string') throw new Error('Invalid state: missing phase');
  if (!obj.phases || typeof obj.phases !== 'object') throw new Error('Invalid state: missing phases');
  return data as unknown as ChangeState;
}

export class StateMachine {
  private fs: FileSystem;
  private parser: YamlParser;
  private resolver: PathResolver;
  private stateCache = new Map<string, ChangeState>();
  private stateMtime = new Map<string, number>();
  private stateSize = new Map<string, number>();

  constructor(fs: FileSystem, parser: YamlParser, resolver: PathResolver) {
    this.fs = fs;
    this.parser = parser;
    this.resolver = resolver;
  }

  async initChange(changeName: string): Promise<void> {
    const state = createDefaultState(changeName);
    const yamlContent = this.parser.stringify(state);
    const filePath = this.resolver.stateFile(changeName);
    await this.fs.writeFile(filePath, yamlContent);
    this.stateCache.delete(changeName);
    this.stateMtime.delete(changeName);
    this.stateSize.delete(changeName);
  }

  clearCache(changeName?: string): void {
    if (changeName) {
      this.stateCache.delete(changeName);
      this.stateMtime.delete(changeName);
      this.stateSize.delete(changeName);
    } else {
      this.stateCache.clear();
      this.stateMtime.clear();
      this.stateSize.clear();
    }
  }

  async getState(changeName: string): Promise<ChangeState> {
    const filePath = this.resolver.stateFile(changeName);
    const stat = await fs.promises.stat(filePath);
    const mtime = stat.mtimeMs;
    const size = stat.size;
    const cached = this.stateCache.get(changeName);
    if (
      cached !== undefined &&
      this.stateMtime.get(changeName) === mtime &&
      this.stateSize.get(changeName) === size
    ) {
      return cached;
    }
    const data = await this.parser.readFile(filePath);
    const state = validateChangeState(data);
    this.stateCache.set(changeName, state);
    this.stateMtime.set(changeName, mtime);
    this.stateSize.set(changeName, size);
    return state;
  }

  private async writeState(changeName: string, state: ChangeState): Promise<void> {
    const filePath = this.resolver.stateFile(changeName);
    const yamlContent = this.parser.stringify(state);
    await this.fs.writeFile(filePath, yamlContent);
    const stat = await fs.promises.stat(filePath);
    this.stateCache.set(changeName, state);
    this.stateMtime.set(changeName, stat.mtimeMs);
    this.stateSize.set(changeName, stat.size);
  }

  private async updateState(
    changeName: string,
    mutator: (state: ChangeState) => void,
  ): Promise<void> {
    const state = await this.getState(changeName);
    mutator(state);
    await this.writeState(changeName, state);
  }

  async validate(changeName: string): Promise<boolean> {
    try {
      const state = await this.getState(changeName);
      if (!state.change || typeof state.change !== 'string') return false;
      if (!state.workflow || typeof state.workflow !== 'string') return false;
      if (!state.phase || !PHASE_ORDER.includes(state.phase)) return false;
      if (!state.phases || typeof state.phases !== 'object') return false;
      for (const phase of PHASE_ORDER) {
        if (!state.phases[phase] || typeof state.phases[phase] !== 'object') return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async setField(changeName: string, field: string, value: unknown): Promise<void> {
    await this.updateState(changeName, (state) => {
      this.parser.setField(state as unknown as Record<string, unknown>, field, value);
    });
  }

  async transition(changeName: string, toPhase: string): Promise<void> {
    const state = await this.getState(changeName);
    const currentPhase = state.phase;
    const currentIndex = PHASE_ORDER.indexOf(currentPhase);
    const targetIndex = PHASE_ORDER.indexOf(toPhase as Phase);

    if (targetIndex < 0) {
      throw new Error(`无效的阶段: ${toPhase}`);
    }
    if (currentIndex < 0) {
      throw new Error(`无效的当前阶段: ${currentPhase}`);
    }
    if (targetIndex !== currentIndex + 1) {
      throw new Error(`不允许从 ${currentPhase} 转换到 ${toPhase}，只能顺序向前转换`);
    }

    const now = new Date().toISOString();

    state.phases[currentPhase].status = 'completed';
    state.phases[currentPhase].completedAt = now;

    state.phases[toPhase as Phase].status = 'in-progress';
    state.phases[toPhase as Phase].startedAt = now;

    state.phase = toPhase as Phase;

    await this.writeState(changeName, state);
  }

  assessScale(tasks: string[], changedFiles: string[]): string {
    if (tasks.length >= 3 || changedFiles.length >= 4) {
      return 'full';
    }
    return 'light';
  }

  async setPrdPath(changeName: string, prdPath: string): Promise<void> {
    await this.updateState(changeName, (state) => {
      state.openspec.prd = prdPath;
      state.phases.clarify.artifacts.prd = prdPath;
    });
  }

  async setProposalPath(changeName: string, proposalPath: string): Promise<void> {
    await this.updateState(changeName, (state) => {
      state.openspec.proposal = proposalPath;
      state.phases.design.artifacts.proposal = proposalPath;
    });
  }

  async setDesignPath(changeName: string, designPath: string): Promise<void> {
    await this.updateState(changeName, (state) => {
      state.openspec.design = designPath;
      state.phases.design.artifacts.design = designPath;
    });
  }

  async setTasksPath(changeName: string, tasksPath: string): Promise<void> {
    await this.updateState(changeName, (state) => {
      state.openspec.tasks = tasksPath;
      state.phases.design.artifacts.tasks = tasksPath;
    });
  }

  async setSpecsPaths(changeName: string, specsPaths: string[]): Promise<void> {
    await this.updateState(changeName, (state) => {
      state.openspec.specs = specsPaths;
      state.phases.design.artifacts.specs = specsPaths.join(',');
    });
  }

  async setDesignConverted(changeName: string, value: string): Promise<void> {
    await this.updateState(changeName, (state) => {
      state.phases.design.artifacts['design-converted'] = value;
    });
  }

  async setDetailedDesignCompleted(changeName: string): Promise<void> {
    await this.updateState(changeName, (state) => {
      state.phases.design.artifacts['detailed-design-completed'] = 'true';
    });
  }

  async setBrainstormingPath(changeName: string, brainstormingPath: string): Promise<void> {
    await this.updateState(changeName, (state) => {
      state.superpowers.brainstorming = brainstormingPath;
      state.phases.design.artifacts.brainstorming = brainstormingPath;
    });
  }
}
