export class DecisionPoint {
    async require(topic, _options) {
        return {
            confirmed: true,
            choice: '',
            timestamp: new Date().toISOString(),
        };
    }
}
//# sourceMappingURL=decision-point.js.map