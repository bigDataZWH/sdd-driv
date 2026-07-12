import { FileSystem } from '../utils/file-system.js';
import { YamlParser } from '../utils/yaml-parser.js';
import { PathResolver } from './path-resolver.js';
import { Phase, ChangeState, createDefaultState } from './types.js';

const PHASE_ORDER: Phase[] = ['clarify', 'design', 'build', 'verify', 'archive'];

export class StateMachine {
  private fs: FileSystem;
  private parser: YamlParser;
  private resolver: PathResolver;

  constructor(fs: FileSystem, parser: YamlParser, resolver: PathResolver) {
    this.fs = fs;
    this.parser = parser;
    this.resolver = resolver;
  }

  async initChange(changeName: string): Promise<void> {
    const state = createDefaultState(changeName);
    const yamlContent = this.parser.stringify(state as unknown as Record<string, unknown>);
    const filePath = this.resolver.stateFile(changeName);
    await this.fs.writeFile(filePath, yamlContent);
  }

  async getState(changeName: string): Promise<ChangeState> {
    const filePath = this.resolver.stateFile(changeName);
    const data = await this.parser.readFile(filePath);
    return data as unknown as ChangeState;
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
    const filePath = this.resolver.stateFile(changeName);
    const data = await this.parser.readFile(filePath);
    this.parser.setField(data, field, value);
    const yamlContent = this.parser.stringify(data);
    await this.fs.writeFile(filePath, yamlContent);
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

    const filePath = this.resolver.stateFile(changeName);
    const yamlContent = this.parser.stringify(state as unknown as Record<string, unknown>);
    await this.fs.writeFile(filePath, yamlContent);
  }

  assessScale(tasks: string[], changedFiles: string[]): string {
    if (tasks.length >= 3 || changedFiles.length >= 4) {
      return 'full';
    }
    return 'light';
  }

  async setDesignPath(changeName: string, designPath: string): Promise<void> {
    const state = await this.getState(changeName);
    state.openspec.design = designPath;
    state.phases.clarify.artifacts.design = designPath;
    const filePath = this.resolver.stateFile(changeName);
    const yamlContent = this.parser.stringify(state as unknown as Record<string, unknown>);
    await this.fs.writeFile(filePath, yamlContent);
  }

  async setSpecsPaths(changeName: string, specsPaths: string[]): Promise<void> {
    const state = await this.getState(changeName);
    state.openspec.specs = specsPaths;
    state.phases.clarify.artifacts.specs = specsPaths.join(',');
    const filePath = this.resolver.stateFile(changeName);
    const yamlContent = this.parser.stringify(state as unknown as Record<string, unknown>);
    await this.fs.writeFile(filePath, yamlContent);
  }

  async setDesignConverted(changeName: string): Promise<void> {
    const state = await this.getState(changeName);
    state.phases.clarify.artifacts['design-converted'] = 'true';
    const filePath = this.resolver.stateFile(changeName);
    const yamlContent = this.parser.stringify(state as unknown as Record<string, unknown>);
    await this.fs.writeFile(filePath, yamlContent);
  }

  async setDetailedDesignCompleted(changeName: string): Promise<void> {
    const state = await this.getState(changeName);
    state.phases.design.artifacts['detailed-design-completed'] = 'true';
    const filePath = this.resolver.stateFile(changeName);
    const yamlContent = this.parser.stringify(state as unknown as Record<string, unknown>);
    await this.fs.writeFile(filePath, yamlContent);
  }
}
