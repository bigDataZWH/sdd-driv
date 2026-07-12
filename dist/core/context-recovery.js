export class ContextRecovery {
    async recover(data) {
        const partial = !data.change || !data.phase;
        return {
            change: data.change || 'unknown',
            phase: data.phase || 'clarify',
            tasksProgress: data.openspec?.tasks ? 'available' : 'missing',
            handoffValid: data.phase !== 'clarify', // 非 clarify 阶段应有 handoff
            partial,
        };
    }
    validateHandoff(_handoffData) {
        if (!_handoffData)
            return false;
        return true;
    }
}
//# sourceMappingURL=context-recovery.js.map