import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'clean-code-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('CleanCodeChecker', () => {
  describe('3.1 - 类型定义', () => {
    it('应导出 CleanCodeChecker 类', async () => {
      const mod = await import('../src/core/clean-code-checker.js');
      expect(mod.CleanCodeChecker).toBeDefined();
    });

    it('应导出 CleanCodeResult、CodeIssue、CleanCodeRule 类型（作为类型使用）', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const result = await checker.check('class lowerCase {}');
      expect(result.issues.length).toBeGreaterThanOrEqual(1);
      expect(typeof result.score).toBe('number');
      expect(typeof result.passed).toBe('boolean');
      expect(typeof result.issues).toBe('object');
      expect(typeof result.categoryScores).toBe('object');
    });
  });

  describe('3.2 - 规则注册与启用/禁用', () => {
    it('应默认注册所有内置规则', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const rules = checker.getRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.find((r) => r.name === 'class-pascal-case')).toBeDefined();
      expect(rules.find((r) => r.name === 'empty-catch')).toBeDefined();
      expect(rules.find((r) => r.name === 'hardcoded-secret')).toBeDefined();
    });

    it('应能注册自定义规则', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      checker.registerRule({
        name: 'custom-rule',
        check: () => [],
        enabled: true,
        severity: 'minor',
      });
      const rule = checker.getRule('custom-rule');
      expect(rule).toBeDefined();
      expect(rule!.name).toBe('custom-rule');
    });

    it('应能启用和禁用规则', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      checker.disableRule('class-pascal-case');
      expect(checker.getRule('class-pascal-case')!.enabled).toBe(false);
      checker.enableRule('class-pascal-case');
      expect(checker.getRule('class-pascal-case')!.enabled).toBe(true);
    });

    it('禁用规则后不会产生违规', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const badCode = 'class lowerCase {}';
      checker.disableRule('class-pascal-case');
      const result = await checker.check(badCode);
      const pascalIssues = result.issues.filter((i) => i.rule === 'class-pascal-case');
      expect(pascalIssues).toHaveLength(0);
    });
  });

  describe('3.3 - 命名规范规则', () => {
    it('应检测非 PascalCase 的类名', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = 'class lowerCaseClass {}';
      const result = await checker.check(code);
      const issues = result.issues.filter((i) => i.rule === 'class-pascal-case');
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0].severity).toBe('major');
    });

    it('应接受 PascalCase 的类名', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = 'class UserService {}';
      const result = await checker.check(code);
      const issues = result.issues.filter((i) => i.rule === 'class-pascal-case');
      expect(issues).toHaveLength(0);
    });

    it('应检测非 camelCase 的变量名', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = 'const Bad_Var = 1;\nlet Another-Bad = 2;';
      const result = await checker.check(code);
      const issues = result.issues.filter((i) => i.rule === 'var-camel-case');
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    it('应检测非 UPPER_SNAKE_CASE 的常量', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = 'const lowerCaseConst = 1;\nconst also_bad = 2;';
      const result = await checker.check(code);
      const issues = result.issues.filter((i) => i.rule === 'const-upper-snake-case');
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    it('应接受 UPPER_SNAKE_CASE 的常量', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = 'const MAX_COUNT = 100;\nconst API_ENDPOINT = "/api";';
      const result = await checker.check(code);
      const issues = result.issues.filter((i) => i.rule === 'const-upper-snake-case');
      expect(issues).toHaveLength(0);
    });
  });

  describe('3.4 - 函数设计规则', () => {
    it('应检测超过 50 行的函数', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const lines: string[] = ['function longFunc() {'];
      for (let i = 0; i < 55; i++) lines.push(`  const x${i} = ${i};`);
      lines.push('}');
      const result = await checker.check(lines.join('\n'));
      const issues = result.issues.filter((i) => i.rule === 'function-length');
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    it('应接受 50 行以内的函数', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const lines: string[] = ['function shortFunc() {'];
      for (let i = 0; i < 48; i++) lines.push(`  const x${i} = ${i};`);
      lines.push('}');
      const result = await checker.check(lines.join('\n'));
      const issues = result.issues.filter((i) => i.rule === 'function-length');
      expect(issues).toHaveLength(0);
    });

    it('字符串和注释中的 {} 不应被误计数影响函数边界检测', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const lines: string[] = ['function trickyFunc() {'];
      // 字符串与注释中出现的不成对 { } 不应被朴素计数器误认为函数边界
      lines.push('  const s = "{ not a brace";');
      lines.push('  const t = "also } here";');
      lines.push('  /* } */');
      lines.push('  // trailing } line comment');
      // 补足超过 50 行的真实函数体
      for (let i = 0; i < 52; i++) lines.push(`  const x${i} = ${i};`);
      lines.push('}');
      const result = await checker.check(lines.join('\n'));
      const issues = result.issues.filter((i) => i.rule === 'function-length');
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    it('应检测超过 5 个参数的函数', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = 'function tooManyParams(a, b, c, d, e, f) {}';
      const result = await checker.check(code);
      const issues = result.issues.filter((i) => i.rule === 'param-count');
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    it('应检测圈复杂度超过 10 的函数', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = `function complex(x) {
        if (x > 0) { x++; }
        if (x > 1) { x++; }
        if (x > 2) { x++; }
        if (x > 3) { x++; }
        if (x > 4) { x++; }
        if (x > 5) { x++; }
        if (x > 6) { x++; }
        if (x > 7) { x++; }
        if (x > 8) { x++; }
        if (x > 9) { x++; }
        if (x > 10) { x++; }
      }`;
      const result = await checker.check(code);
      const issues = result.issues.filter((i) => i.rule === 'cyclomatic-complexity');
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    it('应接受圈复杂度 ≤10 的函数', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = `function simple(x) {
        if (x > 0) { return x; }
        return 0;
      }`;
      const result = await checker.check(code);
      const issues = result.issues.filter((i) => i.rule === 'cyclomatic-complexity');
      expect(issues).toHaveLength(0);
    });
  });

  describe('3.5 - 代码结构规则', () => {
    it('应检测超过 500 行的类', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const lines: string[] = ['class HugeClass {'];
      for (let i = 0; i < 510; i++) lines.push(`  // line ${i}`);
      lines.push('}');
      const result = await checker.check(lines.join('\n'));
      const issues = result.issues.filter((i) => i.rule === 'class-length');
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    it('应接受 500 行以内的类', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const lines: string[] = ['class SmallClass {'];
      for (let i = 0; i < 100; i++) lines.push(`  // line ${i}`);
      lines.push('}');
      const result = await checker.check(lines.join('\n'));
      const issues = result.issues.filter((i) => i.rule === 'class-length');
      expect(issues).toHaveLength(0);
    });

    it('应检测嵌套深度超过 4 层', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = `function deep() {
        if (true) {
          if (true) {
            if (true) {
              if (true) {
                if (true) {
                  console.log("too deep");
                }
              }
            }
          }
        }
      }`;
      const result = await checker.check(code);
      const issues = result.issues.filter((i) => i.rule === 'nesting-depth');
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    it('应检测重复代码', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const duplicateBlock = `  const x = 1;
  const y = 2;
  const z = 3;
  console.log(x);
  console.log(y);
  console.log(z);`;
      const code = `function first() {
${duplicateBlock}
}
function second() {
${duplicateBlock}
}`;
      const result = await checker.check(code);
      const issues = result.issues.filter((i) => i.rule === 'duplicate-code');
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3.6 - 注释、空 catch、密钥规则', () => {
    it('应检测缺少注释的公开 API', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = `export function doSomething() {
  return 42;
}`;
      const result = await checker.check(code);
      const issues = result.issues.filter((i) => i.rule === 'comment-quality');
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    it('应接受有注释的公开 API', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = `/**
 * 执行某项操作
 */
export function doSomething() {
  return 42;
}`;
      const result = await checker.check(code);
      const issues = result.issues.filter((i) => i.rule === 'comment-quality');
      expect(issues).toHaveLength(0);
    });

    it('应检测空 catch 块', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = `try {
  doSomething();
} catch (e) {}`;
      const result = await checker.check(code);
      const issues = result.issues.filter((i) => i.rule === 'empty-catch');
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0].severity).toBe('critical');
    });

    it('应检测硬编码密钥', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = "const apiKey = 'sk-1234567890abcdef';";
      const result = await checker.check(code);
      const issues = result.issues.filter((i) => i.rule === 'hardcoded-secret');
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0].severity).toBe('critical');
    });
  });

  describe('4.1-4.2 - 评分与通过条件', () => {
    it('所有规则通过时得分为 100', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = `class UserService {
  getUser() {
    return { id: 1 };
  }
}

const MAX_RETRIES = 3;

/**
 * 处理数据
 */
export function processData(input: string): string {
  return input.trim();
}

try {
  processData('hello');
} catch (err) {
  console.error(err);
}`;
      const result = await checker.check(code);
      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
    });

    it('存在违规时降低分数', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const lines: string[] = ['function longFunc() {'];
      for (let i = 0; i < 55; i++) lines.push(`  const x${i} = ${i};`);
      lines.push('}');
      const result = await checker.check(lines.join('\n'));
      expect(result.score).toBeLessThan(100);
    });

    it('总分 ≥80 且无 critical 问题则通过', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = `class UserService {
  process() { return 1; }
}

const APP_NAME = "test";

/**
 * 运行服务
 */
export function run() {
  const x = 1;
  if (x > 0) return x;
  return 0;
}`;
      const result = await checker.check(code);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.passed).toBe(true);
    });

    it('存在 critical 问题时即使分数足够也不通过', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const code = 'try { exec(); } catch (e) {}';
      const result = await checker.check(code);
      expect(result.passed).toBe(false);
    });
  });

  describe('4.3-4.5 - 报告生成', () => {
    it('应生成 clean-code-report.md', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const result = await checker.check('class ok {}');
      await checker.generateReports(result, tempDir);

      const mdPath = path.join(tempDir, 'clean-code-report.md');
      expect(existsSync(mdPath)).toBe(true);
      const content = readFileSync(mdPath, 'utf-8');
      expect(content).toContain('Clean Code');
      expect(content).toContain('评分');
    });

    it('应生成 clean-code-issues.json', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const result = await checker.check('try { exec(); } catch (e) {}');
      await checker.generateReports(result, tempDir);

      const jsonPath = path.join(tempDir, 'clean-code-issues.json');
      expect(existsSync(jsonPath)).toBe(true);
      const content = JSON.parse(readFileSync(jsonPath, 'utf-8'));
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
    });

    it('应生成 clean-code-fix-history.json', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const result = await checker.check('class ok {}');
      await checker.generateReports(result, tempDir);

      const histPath = path.join(tempDir, 'clean-code-fix-history.json');
      expect(existsSync(histPath)).toBe(true);
      const content = JSON.parse(readFileSync(histPath, 'utf-8'));
      expect(Array.isArray(content)).toBe(true);
    });
  });

  describe('4.6 - 写入 .driv.yaml.phases.build', () => {
    it('结果应包含 clean-code 状态用于写入 build 阶段', async () => {
      const { CleanCodeChecker } = await import('../src/core/clean-code-checker.js');
      const checker = new CleanCodeChecker();
      const result = await checker.check('class UserService {}');
      expect(result.passed).toBeDefined();
      expect(result.score).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });
  });
});
