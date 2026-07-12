export class SubagentProgressTracker {
    records = new Map();
    start(change, taskId) {
        const record = {
            change,
            taskId,
            startedAt: new Date().toISOString(),
            redEvidence: '',
            greenEvidence: '',
            reviewStatus: 'pending',
            fixRounds: 0,
        };
        this.records.set(`${change}:${taskId}`, record);
        return record;
    }
    recordRedEvidence(change, taskId, evidence) {
        const key = `${change}:${taskId}`;
        const record = this.records.get(key);
        if (record) {
            record.redEvidence = evidence;
        }
    }
    recordGreenEvidence(change, taskId, evidence) {
        const key = `${change}:${taskId}`;
        const record = this.records.get(key);
        if (record) {
            record.greenEvidence = evidence;
        }
    }
    complete(change, taskId, reviewStatus) {
        const key = `${change}:${taskId}`;
        const record = this.records.get(key);
        if (record) {
            record.reviewStatus = reviewStatus;
            record.completedAt = new Date().toISOString();
        }
        return record;
    }
    getProgress(change, taskId) {
        return this.records.get(`${change}:${taskId}`);
    }
    serialize() {
        return Array.from(this.records.values());
    }
}
//# sourceMappingURL=subagent-progress.js.map