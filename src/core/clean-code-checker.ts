import * as fs from 'fs';
import * as path from 'path';

export interface CodeIssue {
  rule: string;
  file?: string;
  line?: number;
  severity: 'critical' | 'major' | 'minor' | 'info';
  message: string;
}

export interface CleanCodeRule {
  name: string;
  check: (content: string, filePath?: string) => CodeIssue[];
  enabled: boolean;
  severity: 'critical' | 'major' | 'minor' | 'info';
}

export interface CleanCodeResult {
  score: number;
  passed: boolean;
  issues: CodeIssue[];
  categoryScores: Record<string, number>;
}

interface RuleCategory {
  rules: string[];
  weight: number;
}

const CATEGORIES: Record<string, RuleCategory> = {
  naming: { rules: ['class-pascal-case', 'var-camel-case', 'const-upper-snake-case'], weight: 10 },
  function: { rules: ['function-length', 'param-count', 'cyclomatic-complexity'], weight: 25 },
  structure: { rules: ['class-length', 'nesting-depth', 'duplicate-code'], weight: 20 },
  comments: { rules: ['comment-quality'], weight: 10 },
  errors: { rules: ['empty-catch'], weight: 15 },
  security: { rules: ['hardcoded-secret'], weight: 20 },
};

const MAX_RAW = Object.values(CATEGORIES).reduce((s, c) => s + c.weight, 0);

const RULE_CATEGORY: Record<string, string> = {};
for (const [cat, info] of Object.entries(CATEGORIES)) {
  for (const rule of info.rules) {
    RULE_CATEGORY[rule] = cat;
  }
}

function makeIssue(
  rule: string,
  severity: CodeIssue['severity'],
  message: string,
  filePath?: string,
  line?: number,
): CodeIssue {
  return { rule, severity, message, file: filePath, line };
}

const UPPER_SNAKE_RE = /^[A-Z][A-Z0-9_]*$/;
const CAMEL_CASE_RE = /^[a-z][a-zA-Z0-9]*$/;

/** P3: 阈值集中定义，便于维护与调优 */
const LIMITS = {
  /** 函数最大行数 */
  FUNCTION_LENGTH: 50,
  /** 函数最大参数数 */
  PARAM_COUNT: 5,
  /** 最大圈复杂度 */
  CYCLOMATIC_COMPLEXITY: 10,
  /** 类最大行数 */
  CLASS_LENGTH: 500,
  /** 最大嵌套深度 */
  NESTING_DEPTH: 4,
  /** 重复代码块最小行数 */
  DUPLICATE_BLOCK: 8,
  /** 通过分数 */
  PASS_SCORE: 80,
} as const;

function checkClassPascalCase(content: string, filePath?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const re = /class\s+(\w+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const name = match[1];
    if (name[0] !== name[0].toUpperCase()) {
      const lineNum = content.slice(0, match.index).split('\n').length;
      issues.push(
        makeIssue(
          'class-pascal-case',
          'major',
          `类名 "${name}" 应使用 PascalCase`,
          filePath,
          lineNum,
        ),
      );
    }
  }
  return issues;
}

function checkVarCamelCase(content: string, filePath?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const re = /(?:let|var|const)\s+(\w+)\s*[=;]/g;
  const upperSnakeConsts = new Set<string>();
  const constRe = /const\s+(\w+)\s*[=;]/g;
  let m: RegExpExecArray | null;
  while ((m = constRe.exec(content)) !== null) {
    if (UPPER_SNAKE_RE.test(m[1])) {
      upperSnakeConsts.add(m[1]);
    }
  }
  const re2 = /(?:let|var)\s+(\w+)/g;
  while ((m = re2.exec(content)) !== null) {
    const name = m[1];
    if (!CAMEL_CASE_RE.test(name)) {
      const lineNum = content.slice(0, m.index).split('\n').length;
      issues.push(
        makeIssue('var-camel-case', 'major', `变量 "${name}" 应使用 camelCase`, filePath, lineNum),
      );
    }
  }
  const constRe2 = /const\s+(\w+)/g;
  while ((m = constRe2.exec(content)) !== null) {
    const name = m[1];
    if (!UPPER_SNAKE_RE.test(name) && !CAMEL_CASE_RE.test(name)) {
      const lineNum = content.slice(0, m.index).split('\n').length;
      issues.push(
        makeIssue(
          'var-camel-case',
          'major',
          `常量/变量 "${name}" 应使用 camelCase 或 UPPER_SNAKE_CASE`,
          filePath,
          lineNum,
        ),
      );
    }
  }
  return issues;
}

function checkConstUpperSnakeCase(content: string, filePath?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const re = /const\s+(\w+)\s*=\s*(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const name = m[1];
    const value = m[2].trim();
    // 跳过 camelCase const（由 var-camel-case 检查）
    if (CAMEL_CASE_RE.test(name)) continue;
    // 仅对字面量常量（数字/字符串/布尔/null）要求 UPPER_SNAKE
    const isLiteral = /^['"`]/.test(value) || /^\d/.test(value) || /^(true|false|null)\b/.test(value);
    if (!isLiteral) continue;
    if (!UPPER_SNAKE_RE.test(name)) {
      const lineNum = content.slice(0, m.index).split('\n').length;
      issues.push(
        makeIssue(
          'const-upper-snake-case',
          'major',
          `常量 "${name}" 应使用 UPPER_SNAKE_CASE`,
          filePath,
          lineNum,
        ),
      );
    }
  }
  return issues;
}

interface FuncBlock {
  startLine: number;
  bodyStart: number;
  bodyEnd: number;
}

/** 把字符串和注释内容替换为等长空格，便于准确计数括号/关键词 */
function stripStringsAndComments(content: string): string {
  let result = '';
  let i = 0;
  let inString: false | '"' | "'" | '`' = false;
  while (i < content.length) {
    const ch = content[i];
    const next = content[i + 1];
    // 行注释
    if (!inString && ch === '/' && next === '/') {
      const end = content.indexOf('\n', i);
      const lineEnd = end === -1 ? content.length : end;
      result += ' '.repeat(lineEnd - i);
      i = lineEnd;
      continue;
    }
    // 块注释
    if (!inString && ch === '/' && next === '*') {
      const end = content.indexOf('*/', i + 2);
      const blockEnd = end === -1 ? content.length : end + 2;
      for (let j = i; j < blockEnd; j++) {
        result += content[j] === '\n' ? '\n' : ' ';
      }
      i = blockEnd;
      continue;
    }
    // 字符串
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = ch;
      result += ' ';
      i++;
      continue;
    }
    if (inString) {
      if (ch === '\\') {
        result += '  ';
        i += 2;
        continue;
      }
      if (ch === inString) {
        inString = false;
      }
      result += ch === '\n' ? '\n' : ' ';
      i++;
      continue;
    }
    result += ch;
    i++;
  }
  return result;
}

function findFunctionBodies(content: string): FuncBlock[] {
  const blocks: FuncBlock[] = [];
  const lines = content.split('\n');
  // 命名函数声明 + 箭头函数 + 函数表达式 + 方法简写
  const funcRes = [
    /function\s+\w+\s*\(/,
    /(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/,
    /(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?function\s*\(/,
    /^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/,
  ];
  for (let i = 0; i < lines.length; i++) {
    const matched = funcRes.some((re) => re.test(lines[i]));
    if (matched) {
      const bodyStart = lines[i].includes('{') ? i : findBlockStart(lines, i);
      if (bodyStart < 0) continue;
      const bodyEnd = findMatchingBrace(lines, bodyStart);
      if (bodyEnd > 0) {
        blocks.push({ startLine: i, bodyStart, bodyEnd });
      }
    }
  }
  return blocks;
}

function findBlockStart(lines: string[], fromLine: number): number {
  for (let i = fromLine; i < lines.length; i++) {
    if (lines[i].includes('{')) return i;
  }
  return -1;
}

function findMatchingBrace(lines: string[], startLine: number): number {
  let depth = 0;
  let started = false;
  let inString: false | '"' | "'" | '`' = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = startLine; i < lines.length; i++) {
    if (inLineComment) inLineComment = false; // 新行重置行注释
    for (let j = 0; j < lines[i].length; j++) {
      const ch = lines[i][j];
      const next = lines[i][j + 1];
      // 处理注释
      if (!inString && !inBlockComment && ch === '/' && next === '/') {
        inLineComment = true;
        break; // 行剩余部分是注释
      }
      if (!inString && !inLineComment && ch === '/' && next === '*') {
        inBlockComment = true;
        j++; // 跳过 *
        continue;
      }
      if (inBlockComment && ch === '*' && next === '/') {
        inBlockComment = false;
        j++; // 跳过 /
        continue;
      }
      if (inBlockComment || inLineComment) continue;
      // 处理字符串
      if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
        inString = ch;
        continue;
      }
      if (inString && ch === inString && lines[i][j - 1] !== '\\') {
        inString = false;
        continue;
      }
      if (inString) continue;
      // 统计真实 { }
      if (ch === '{') {
        depth++;
        started = true;
      } else if (ch === '}') {
        depth--;
      }
    }
    if (started && depth === 0 && !inBlockComment) return i;
  }
  return -1;
}

function checkFunctionLength(content: string, filePath?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const funcs = findFunctionBodies(content);
  for (const f of funcs) {
    const lineCount = f.bodyEnd - f.bodyStart + 1;
    if (lineCount > LIMITS.FUNCTION_LENGTH) {
      const funcLine = content.split('\n')[f.startLine]?.trim() || 'anonymous';
      issues.push(
        makeIssue(
          'function-length',
          'major',
          `函数 "${funcLine}" 有 ${lineCount} 行（超过 ${LIMITS.FUNCTION_LENGTH} 行限制）`,
          filePath,
          f.startLine + 1,
        ),
      );
    }
  }
  return issues;
}

function checkParamCount(content: string, filePath?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const re = /function\s+\w+\s*\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const params = m[1].trim();
    const count = params
      ? params
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean).length
      : 0;
    if (count > LIMITS.PARAM_COUNT) {
      const lineNum = content.slice(0, m.index).split('\n').length;
      issues.push(
        makeIssue(
          'param-count',
          'major',
          `函数有 ${count} 个参数（超过 ${LIMITS.PARAM_COUNT} 个限制）`,
          filePath,
          lineNum,
        ),
      );
    }
  }
  const arrowRe = /(?:const|let|var)\s+\w+\s*=\s*\(([^)]*)\)\s*=>/g;
  while ((m = arrowRe.exec(content)) !== null) {
    const params = m[1].trim();
    const count = params
      ? params
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean).length
      : 0;
    if (count > LIMITS.PARAM_COUNT) {
      const lineNum = content.slice(0, m.index).split('\n').length;
      issues.push(
        makeIssue(
          'param-count',
          'major',
          `箭头函数有 ${count} 个参数（超过 ${LIMITS.PARAM_COUNT} 个限制）`,
          filePath,
          lineNum,
        ),
      );
    }
  }
  return issues;
}

function checkCyclomaticComplexity(content: string, filePath?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const funcs = findFunctionBodies(content);
  for (const f of funcs) {
    const body = content
      .split('\n')
      .slice(f.bodyStart, f.bodyEnd + 1)
      .join('\n');
    // 清洗字符串和注释，避免误计数
    const cleaned = stripStringsAndComments(body);
    let complexity = 1;
    const patterns = [
      /\bif\s*\(/g,
      /\belse\s+if\b/g,
      /\bswitch\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bcatch\s*\(/g,
      /\bcase\s+\w+:/g,
      /\b&&\b/g,
      /\b\|\|\b/g,
    ];
    for (const pattern of patterns) {
      const re = new RegExp(pattern.source, 'g');
      let pm: RegExpExecArray | null;
      while ((pm = re.exec(cleaned)) !== null) {
        complexity++;
      }
    }
    if (complexity > LIMITS.CYCLOMATIC_COMPLEXITY) {
      const funcLine = content.split('\n')[f.startLine]?.trim() || 'anonymous';
      issues.push(
        makeIssue(
          'cyclomatic-complexity',
          'major',
          `函数 "${funcLine}" 圈复杂度为 ${complexity}（超过 ${LIMITS.CYCLOMATIC_COMPLEXITY} 限制）`,
          filePath,
          f.startLine + 1,
        ),
      );
    }
  }
  return issues;
}

interface ClassBlock {
  name: string;
  startLine: number;
  endLine: number;
}

function findClassBlocks(content: string): ClassBlock[] {
  const blocks: ClassBlock[] = [];
  const lines = content.split('\n');
  const classRe = /class\s+(\w+)/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(classRe);
    if (m) {
      const bodyStart = lines[i].includes('{') ? i : findBlockStart(lines, i + 1);
      if (bodyStart < 0) continue;
      const bodyEnd = findMatchingBrace(lines, bodyStart);
      if (bodyEnd > 0) {
        blocks.push({ name: m[1], startLine: i, endLine: bodyEnd });
      }
    }
  }
  return blocks;
}

function getExportedFuncNames(content: string): Set<string> {
  const names = new Set<string>();
  const re = /(?:^|\n)\s*export\s+(?:async\s+)?function\s+(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    names.add(m[1]);
  }
  return names;
}

function checkClassLength(content: string, filePath?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const classes = findClassBlocks(content);
  for (const c of classes) {
    const lineCount = c.endLine - c.startLine + 1;
    if (lineCount > LIMITS.CLASS_LENGTH) {
      issues.push(
        makeIssue(
          'class-length',
          'major',
          `类 "${c.name}" 有 ${lineCount} 行（超过 ${LIMITS.CLASS_LENGTH} 行限制）`,
          filePath,
          c.startLine + 1,
        ),
      );
    }
  }
  return issues;
}

function checkNestingDepth(content: string, filePath?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  // 清洗字符串和注释，避免对象字面量、模板字符串中的 {} 被误计数
  const cleaned = stripStringsAndComments(content);
  const lines = cleaned.split('\n');
  let maxDepth = 0;
  let currentDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') currentDepth++;
      else if (ch === '}') currentDepth--;
    }
    if (currentDepth > maxDepth) maxDepth = currentDepth;
  }
  if (maxDepth > LIMITS.NESTING_DEPTH) {
    issues.push(
      makeIssue('nesting-depth', 'major', `代码嵌套深度为 ${maxDepth}（超过 ${LIMITS.NESTING_DEPTH} 层限制）`, filePath),
    );
  }
  return issues;
}

function checkDuplicateCode(content: string, filePath?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const lines = content.split('\n');
  const minBlock = LIMITS.DUPLICATE_BLOCK;
  const importRe = /^\s*(import\s|export\s|const\s+\w+\s*=\s*require\s*\(|\/\/)/;
  const seen = new Map<string, number[]>();
  for (let i = 0; i <= lines.length - minBlock; i++) {
    const block = lines.slice(i, i + minBlock).join('\n');
    const trimmed = block.trim();
    if (!trimmed) continue;
    // 跳过纯 import/require/comment 窗口
    const blockLines = lines.slice(i, i + minBlock);
    if (blockLines.every((l) => importRe.test(l) || l.trim() === '')) continue;
    if (!seen.has(trimmed)) {
      seen.set(trimmed, [i]);
    } else {
      const positions = seen.get(trimmed)!;
      if (positions.length === 1) {
        issues.push(
          makeIssue(
            'duplicate-code',
            'minor',
            `发现重复代码块（第 ${positions[0] + 1} 行附近）`,
            filePath,
            i + 1,
          ),
        );
      }
      positions.push(i);
    }
  }
  return issues;
}

function hasCommentAbove(lines: string[], funcLineIdx: number): boolean {
  for (let i = funcLineIdx - 1; i >= 0 && i >= funcLineIdx - 5; i--) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('/**') || trimmed.startsWith('//') || trimmed.startsWith('*'))
      return true;
    if (trimmed === '') continue;
    return false;
  }
  return false;
}

function checkCommentQuality(content: string, filePath?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const lines = content.split('\n');
  const exportedFuncs = getExportedFuncNames(content);
  const funcRe = /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = funcRe.exec(content)) !== null) {
    const name = m[1];
    const lineNum = content.slice(0, m.index).split('\n').length;
    const idx = lineNum - 1;
    if (!exportedFuncs.has(name)) continue;
    if (idx === 0 || !hasCommentAbove(lines, idx)) {
      issues.push(
        makeIssue(
          'comment-quality',
          'minor',
          `导出函数 "${name}" 缺少 JSDoc 注释`,
          filePath,
          lineNum,
        ),
      );
    }
  }
  return issues;
}

function checkEmptyCatch(content: string, filePath?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const seenLines = new Set<number>();
  // 统一用通用正则，避免单行/多行正则同时匹配导致重复扣分
  const re = /catch\s*\([^)]*\)\s*\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const body = m[1].trim();
    if (body === '' || body === '\n' || body === '\r\n') {
      const lineNum = content.slice(0, m.index).split('\n').length;
      if (seenLines.has(lineNum)) continue;
      seenLines.add(lineNum);
      issues.push(
        makeIssue(
          'empty-catch',
          'critical',
          '发现空 catch 块，应至少记录错误日志',
          filePath,
          lineNum,
        ),
      );
    }
  }
  return issues;
}

function checkHardcodedSecret(content: string, filePath?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const secretPatterns = [
    /(?:password|passwd)\s*[:=]\s*['"][^'"]+['"]/gi,
    /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]+['"]/gi,
    /(?:secret)\s*[:=]\s*['"][^'"]+['"]/gi,
    /(?:token)\s*[:=]\s*['"][A-Za-z0-9_\-]{8,}['"]/gi,
    /(?:access[_-]?key|accesskey)\s*[:=]\s*['"][^'"]+['"]/gi,
    /(?:private[_-]?key|privatekey)\s*[:=]\s*['"][^'"]+['"]/gi,
    /['"](?:sk-|pk-|test-|live_)[A-Za-z0-9_\-]{8,}['"]/g,
  ];
  // 白名单前缀：测试/mock/example 值不算硬编码密钥
  const whitelistRe = /^(test_|example_|mock_|fake_)/i;
  // 低熵值（长度<12 或无混合大小写+数字）不算高熵密钥
  const isLowEntropy = (val: string): boolean => {
    if (val.length < 12) return true;
    const hasUpper = /[A-Z]/.test(val);
    const hasLower = /[a-z]/.test(val);
    const hasDigit = /\d/.test(val);
    const hasSymbol = /[^A-Za-z0-9]/.test(val);
    return !(hasUpper && hasLower && hasDigit && hasSymbol);
  };
  // 常见非密钥变量名白名单
  const benignNameRe = /csrf|csrfToken/i;
  for (const pattern of secretPatterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(content)) !== null) {
      const matched = m[0];
      // 提取引号内的值
      const valMatch = matched.match(/['"]([^'"]+)['"]/);
      const val = valMatch ? valMatch[1] : '';
      if (whitelistRe.test(val)) continue;
      if (benignNameRe.test(matched) && isLowEntropy(val)) continue;
      const lineNum = content.slice(0, m.index).split('\n').length;
      issues.push(
        makeIssue(
          'hardcoded-secret',
          'critical',
          '发现疑似硬编码密钥，应从环境变量或密钥管理服务获取',
          filePath,
          lineNum,
        ),
      );
    }
  }
  return issues;
}

function calculateScore(issues: CodeIssue[]): {
  score: number;
  passed: boolean;
  categoryScores: Record<string, number>;
} {
  const categoryScores: Record<string, number> = {};
  const severityDeduction: Record<string, number> = {
    critical: 10,
    major: 5,
    minor: 2,
    info: 1,
  };

  const deductions: Record<string, number> = {};
  let hasCritical = false;
  for (const issue of issues) {
    if (issue.severity === 'critical') hasCritical = true;
    const cat = RULE_CATEGORY[issue.rule] || 'naming';
    deductions[cat] = (deductions[cat] || 0) + (severityDeduction[issue.severity] || 2);
  }

  for (const [cat, info] of Object.entries(CATEGORIES)) {
    const deduction = deductions[cat] || 0;
    categoryScores[cat] = Math.max(0, info.weight - deduction);
  }

  const rawTotal = Object.values(categoryScores).reduce((s, v) => s + v, 0);
  const normalizedScore = Math.round((rawTotal / MAX_RAW) * 100);
  const passed = normalizedScore >= LIMITS.PASS_SCORE && !hasCritical;

  return { score: normalizedScore, passed, categoryScores };
}

export class CleanCodeChecker {
  private rules: Map<string, CleanCodeRule> = new Map();

  constructor() {
    this.registerDefaultRules();
  }

  private registerDefaultRules(): void {
    this.registerRule({
      name: 'class-pascal-case',
      check: checkClassPascalCase,
      enabled: true,
      severity: 'major',
    });
    this.registerRule({
      name: 'var-camel-case',
      check: checkVarCamelCase,
      enabled: true,
      severity: 'major',
    });
    this.registerRule({
      name: 'const-upper-snake-case',
      check: checkConstUpperSnakeCase,
      enabled: true,
      severity: 'major',
    });
    this.registerRule({
      name: 'function-length',
      check: checkFunctionLength,
      enabled: true,
      severity: 'major',
    });
    this.registerRule({
      name: 'param-count',
      check: checkParamCount,
      enabled: true,
      severity: 'major',
    });
    this.registerRule({
      name: 'cyclomatic-complexity',
      check: checkCyclomaticComplexity,
      enabled: true,
      severity: 'major',
    });
    this.registerRule({
      name: 'class-length',
      check: checkClassLength,
      enabled: true,
      severity: 'major',
    });
    this.registerRule({
      name: 'nesting-depth',
      check: checkNestingDepth,
      enabled: true,
      severity: 'major',
    });
    this.registerRule({
      name: 'duplicate-code',
      check: checkDuplicateCode,
      enabled: true,
      severity: 'minor',
    });
    this.registerRule({
      name: 'comment-quality',
      check: checkCommentQuality,
      enabled: true,
      severity: 'minor',
    });
    this.registerRule({
      name: 'empty-catch',
      check: checkEmptyCatch,
      enabled: true,
      severity: 'critical',
    });
    this.registerRule({
      name: 'hardcoded-secret',
      check: checkHardcodedSecret,
      enabled: true,
      severity: 'critical',
    });
  }

  registerRule(rule: CleanCodeRule): void {
    this.rules.set(rule.name, rule);
  }

  enableRule(name: string): void {
    const rule = this.rules.get(name);
    if (rule) rule.enabled = true;
  }

  disableRule(name: string): void {
    const rule = this.rules.get(name);
    if (rule) rule.enabled = false;
  }

  getRule(name: string): CleanCodeRule | undefined {
    return this.rules.get(name);
  }

  getRules(): CleanCodeRule[] {
    return Array.from(this.rules.values());
  }

  async check(content: string, filePath?: string): Promise<CleanCodeResult> {
    const allIssues: CodeIssue[] = [];
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      const issues = rule.check(content, filePath);
      allIssues.push(...issues);
    }
    const { score, passed, categoryScores } = calculateScore(allIssues);
    return { score, passed, issues: allIssues, categoryScores };
  }

  async generateReports(result: CleanCodeResult, outputDir: string): Promise<void> {
    await fs.promises.mkdir(outputDir, { recursive: true });

    const md = this.generateMarkdownReport(result);
    await fs.promises.writeFile(path.join(outputDir, 'clean-code-report.md'), md, 'utf-8');

    const issuesJson = JSON.stringify(result.issues, null, 2);
    await fs.promises.writeFile(
      path.join(outputDir, 'clean-code-issues.json'),
      issuesJson,
      'utf-8',
    );

    const fixHistory: unknown[] = [];
    await fs.promises.writeFile(
      path.join(outputDir, 'clean-code-fix-history.json'),
      JSON.stringify(fixHistory, null, 2),
      'utf-8',
    );
  }

  private generateMarkdownReport(result: CleanCodeResult): string {
    const lines: string[] = [];
    lines.push('# Clean Code 质量报告');
    lines.push('');
    lines.push(`- **总分**: ${result.score}/100`);
    lines.push(`- **通过**: ${result.passed ? '✅ 通过' : '❌ 未通过'}`);
    lines.push(`- **问题总数**: ${result.issues.length}`);
    lines.push('');

    lines.push('## 各维度评分');
    lines.push('');
    lines.push('| 维度 | 得分 | 权重 |');
    lines.push('|---|---|---:|');
    for (const [cat, info] of Object.entries(CATEGORIES)) {
      const catNames: Record<string, string> = {
        naming: '命名规范',
        function: '函数设计',
        structure: '代码结构',
        comments: '注释规范',
        errors: '错误处理',
        security: '安全规范',
      };
      const name = catNames[cat] || cat;
      const catScore = result.categoryScores[cat] || 0;
      const pct = MAX_RAW > 0 ? Math.round((catScore / info.weight) * 100) : 0;
      lines.push(`| ${name} | ${pct}% | ${info.weight}% |`);
    }
    lines.push('');

    if (result.issues.length > 0) {
      lines.push('## 发现的问题');
      lines.push('');
      lines.push('| 规则 | 严重程度 | 描述 |');
      lines.push('|---|---|---|');
      for (const issue of result.issues) {
        const sevLabels: Record<string, string> = {
          critical: '🔴 Critical',
          major: '🟠 Major',
          minor: '🟡 Minor',
          info: '🔵 Info',
        };
        const sev = sevLabels[issue.severity] || issue.severity;
        lines.push(
          `| ${issue.rule} | ${sev} | ${issue.message}${issue.file ? ` (${issue.file})` : ''}${issue.line ? `:${issue.line}` : ''} |`,
        );
      }
      lines.push('');
    }

    lines.push('## 通过条件');
    lines.push('');
    if (result.passed) {
      lines.push('✅ **通过**: 总分 ≥80 且无未修复的 critical 问题');
    } else {
      const criticalCount = result.issues.filter((i) => i.severity === 'critical').length;
      if (result.score < 80) {
        lines.push(`❌ **未通过**: 总分 ${result.score} < 80`);
      }
      if (criticalCount > 0) {
        lines.push(`❌ **未通过**: 存在 ${criticalCount} 个 critical 问题`);
      }
    }

    return lines.join('\n');
  }
}
