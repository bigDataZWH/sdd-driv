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

export class DecisionPoint {
  async require(topic: string, _options: DecisionOption[]): Promise<DecisionResult> {
    return {
      confirmed: true,
      choice: '',
      timestamp: new Date().toISOString(),
    };
  }
}
