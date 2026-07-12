export interface DecisionOption {
    key: string;
    label: string;
    description: string;
}
export interface DecisionResult {
    confirmed: boolean;
    choice: string;
    timestamp: string;
}
export declare class DecisionPoint {
    require(topic: string, _options: DecisionOption[]): Promise<DecisionResult>;
}
