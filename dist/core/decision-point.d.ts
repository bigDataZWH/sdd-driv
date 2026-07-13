export interface DecisionOption {
    key: string;
    label: string;
    description: string;
}
export interface DecisionResult {
    confirmed: boolean;
    choice: string;
    timestamp: string;
    message?: string;
}
export interface DecisionPointNode {
    id: string;
    name: string;
    phase: string;
    description: string;
}
export declare const DECISION_POINTS: {
    readonly DP_0: {
        readonly id: "DP-0";
        readonly name: "需求确认";
        readonly phase: "clarify";
        readonly description: "需求澄清后确认需求理解";
    };
    readonly DP_1: {
        readonly id: "DP-1";
        readonly name: "提案确认";
        readonly phase: "clarify";
        readonly description: "proposal.md 生成后确认";
    };
    readonly DP_2: {
        readonly id: "DP-2";
        readonly name: "规格确认";
        readonly phase: "clarify";
        readonly description: "specs 生成后确认";
    };
    readonly DP_3: {
        readonly id: "DP-3";
        readonly name: "设计确认";
        readonly phase: "design";
        readonly description: "详细设计后确认";
    };
    readonly DP_4: {
        readonly id: "DP-4";
        readonly name: "任务确认";
        readonly phase: "clarify";
        readonly description: "tasks.md 生成后确认";
    };
    readonly DP_5: {
        readonly id: "DP-5";
        readonly name: "契约确认";
        readonly phase: "design";
        readonly description: "handoff 签署后确认";
    };
    readonly DP_6: {
        readonly id: "DP-6";
        readonly name: "批次确认";
        readonly phase: "build";
        readonly description: "每批执行前后确认";
    };
    readonly DP_7: {
        readonly id: "DP-7";
        readonly name: "收尾确认";
        readonly phase: "archive";
        readonly description: "归档前确认";
    };
};
export declare class DecisionPoint {
    require(topic: string, options: DecisionOption[]): Promise<DecisionResult>;
    confirm(topic: string, choice?: string): Promise<DecisionResult>;
    private resolveNode;
}
