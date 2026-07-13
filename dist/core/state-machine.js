import { createDefaultState } from './types.js';
const PHASE_ORDER = ['clarify', 'design', 'build', 'verify', 'archive'];
export class StateMachine {
    fs;
    parser;
    resolver;
    constructor(fs, parser, resolver) {
        this.fs = fs;
        this.parser = parser;
        this.resolver = resolver;
    }
    async initChange(changeName) {
        const state = createDefaultState(changeName);
        const yamlContent = this.parser.stringify(state);
        const filePath = this.resolver.stateFile(changeName);
        await this.fs.writeFile(filePath, yamlContent);
    }
    async getState(changeName) {
        const filePath = this.resolver.stateFile(changeName);
        const data = await this.parser.readFile(filePath);
        return data;
    }
    async validate(changeName) {
        try {
            const state = await this.getState(changeName);
            if (!state.change || typeof state.change !== 'string')
                return false;
            if (!state.workflow || typeof state.workflow !== 'string')
                return false;
            if (!state.phase || !PHASE_ORDER.includes(state.phase))
                return false;
            if (!state.phases || typeof state.phases !== 'object')
                return false;
            for (const phase of PHASE_ORDER) {
                if (!state.phases[phase] || typeof state.phases[phase] !== 'object')
                    return false;
            }
            return true;
        }
        catch {
            return false;
        }
    }
    async setField(changeName, field, value) {
        const filePath = this.resolver.stateFile(changeName);
        const data = await this.parser.readFile(filePath);
        this.parser.setField(data, field, value);
        const yamlContent = this.parser.stringify(data);
        await this.fs.writeFile(filePath, yamlContent);
    }
    async transition(changeName, toPhase) {
        const state = await this.getState(changeName);
        const currentPhase = state.phase;
        const currentIndex = PHASE_ORDER.indexOf(currentPhase);
        const targetIndex = PHASE_ORDER.indexOf(toPhase);
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
        state.phases[toPhase].status = 'in-progress';
        state.phases[toPhase].startedAt = now;
        state.phase = toPhase;
        const filePath = this.resolver.stateFile(changeName);
        const yamlContent = this.parser.stringify(state);
        await this.fs.writeFile(filePath, yamlContent);
    }
    assessScale(tasks, changedFiles) {
        if (tasks.length >= 3 || changedFiles.length >= 4) {
            return 'full';
        }
        return 'light';
    }
    async setDesignPath(changeName, designPath) {
        const state = await this.getState(changeName);
        state.openspec.design = designPath;
        state.phases.clarify.artifacts.design = designPath;
        const filePath = this.resolver.stateFile(changeName);
        const yamlContent = this.parser.stringify(state);
        await this.fs.writeFile(filePath, yamlContent);
    }
    async setSpecsPaths(changeName, specsPaths) {
        const state = await this.getState(changeName);
        state.openspec.specs = specsPaths;
        state.phases.clarify.artifacts.specs = specsPaths.join(',');
        const filePath = this.resolver.stateFile(changeName);
        const yamlContent = this.parser.stringify(state);
        await this.fs.writeFile(filePath, yamlContent);
    }
    async setDetailedDesignCompleted(changeName) {
        const state = await this.getState(changeName);
        state.phases.design.artifacts['detailed-design-completed'] = 'true';
        const filePath = this.resolver.stateFile(changeName);
        const yamlContent = this.parser.stringify(state);
        await this.fs.writeFile(filePath, yamlContent);
    }
    async setBrainstormingPath(changeName, brainstormingPath) {
        const state = await this.getState(changeName);
        state.superpowers.brainstorming = brainstormingPath;
        state.phases.design.artifacts.brainstorming = brainstormingPath;
        const filePath = this.resolver.stateFile(changeName);
        const yamlContent = this.parser.stringify(state);
        await this.fs.writeFile(filePath, yamlContent);
    }
}
//# sourceMappingURL=state-machine.js.map