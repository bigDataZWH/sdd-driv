export interface EARSValidationResult {
  valid: boolean;
  issues: string[];
}

const MODAL_VERBS = '(shall|SHALL|SHOULD|MUST|WILL|MAY)';

const EARS_PATTERNS: RegExp[] = [
  // Ubiquitous: The system shall <action>
  new RegExp(`^\\s*(?:the\\s+)?system\\s+${MODAL_VERBS}\\s+.+`, 'i'),
  // Event-driven: When <trigger>, the system shall <action>
  new RegExp(`^\\s*when\\s+.+,\\s*(?:the\\s+)?system\\s+${MODAL_VERBS}\\s+.+`, 'i'),
  // State-driven: While <state>, the system shall <action>
  new RegExp(`^\\s*while\\s+.+,\\s*(?:the\\s+)?system\\s+${MODAL_VERBS}\\s+.+`, 'i'),
  // Optional feature: Where <feature is included>, the system shall <action>
  new RegExp(`^\\s*where\\s+.+,\\s*(?:the\\s+)?system\\s+${MODAL_VERBS}\\s+.+`, 'i'),
  // Unwanted behavior: If <trigger>, then the system shall <response>
  new RegExp(`^\\s*if\\s+.+,\\s*then\\s+(?:the\\s+)?system\\s+${MODAL_VERBS}\\s+.+`, 'i'),
];

const MODAL_RE = new RegExp(`\\b${MODAL_VERBS}\\b`, 'i');

export function validateEARS(content: string): EARSValidationResult {
  const issues: string[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    // 跳过标题、表格分隔、HTML 注释、列表符号等
    if (/^(#|>|<!--|-|\||\d+\.)/.test(trimmed)) continue;
    // 仅检查包含模态动词的语句（疑似需求语句）
    if (!MODAL_RE.test(trimmed)) continue;

    const matches = EARS_PATTERNS.some((p) => p.test(trimmed));
    if (!matches) {
      const preview = trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed;
      issues.push(`行 ${i + 1}: 不符合 EARS 句式: ${preview}`);
    }
  }

  return { valid: issues.length === 0, issues };
}
