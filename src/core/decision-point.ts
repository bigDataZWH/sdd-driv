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

export const DECISION_POINTS = {
  DP_0: { id: 'DP-0', name: '需求确认', phase: 'clarify', description: '需求澄清后确认需求理解' },
  DP_1: { id: 'DP-1', name: '提案确认', phase: 'clarify', description: 'proposal.md 生成后确认' },
  DP_2: { id: 'DP-2', name: '规格确认', phase: 'clarify', description: 'specs 生成后确认' },
  DP_3: { id: 'DP-3', name: '设计确认', phase: 'design', description: '详细设计后确认' },
  DP_4: { id: 'DP-4', name: '任务确认', phase: 'clarify', description: 'tasks.md 生成后确认' },
  DP_5: { id: 'DP-5', name: '契约确认', phase: 'design', description: 'handoff 签署后确认' },
  DP_6: { id: 'DP-6', name: '批次确认', phase: 'build', description: '每批执行前后确认' },
  DP_7: { id: 'DP-7', name: '收尾确认', phase: 'archive', description: '归档前确认' },
} as const;

export class DecisionPoint {
  async require(topic: string, options: DecisionOption[]): Promise<DecisionResult> {
    const dpNode = this.resolveNode(topic, options);
    return {
      confirmed: false,
      choice: '',
      timestamp: new Date().toISOString(),
      message: `${dpNode.id}: ${topic} 需用户确认`,
    };
  }

  async confirm(topic: string, choice?: string): Promise<DecisionResult> {
    return {
      confirmed: true,
      choice: choice || '',
      timestamp: new Date().toISOString(),
    };
  }

  private resolveNode(topic: string, _options: DecisionOption[]): { id: string } {
    for (const node of Object.values(DECISION_POINTS)) {
      if (topic === node.name || topic === node.id) {
        return node;
      }
    }
    return { id: 'DP-?' };
  }
}
