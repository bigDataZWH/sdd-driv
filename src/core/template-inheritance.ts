export interface ParsedSection {
  name: string;
  level: number;
  content: string;
  children?: ParsedSection[];
}

export interface InheritanceRule {
  child: string;
  parent: string;
  strategy: 'extend' | 'override' | 'merge' | 'add' | 'replace' | 'prepend' | 'append' | 'wrap';
  sections: {
    extend?: string[];
    override?: string[];
    merge?: string[];
    add?: string[];
    replace?: string[];
    prepend?: string[];
    append?: string[];
    wrap?: string[];
  };
}

export function parseSections(markdown: string): ParsedSection[] {
  const lines = markdown.split('\n');
  const root: ParsedSection[] = [];
  const stack: { section: ParsedSection; childList: ParsedSection[] }[] = [];

  let i = 0;
  let inCodeBlock = false;
  while (i < lines.length) {
    const line = lines[i];

    // 代码块围栏切换：遇到 ``` 开头的行切换 inCodeBlock 状态
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      i++;
      continue;
    }

    // 仅在代码块外识别标题，避免代码块内的 # 注释被误识别为标题
    const match = !inCodeBlock ? line.match(/^(#{1,6})\s+(.+)/) : null;

    if (match) {
      const level = match[1].length;
      const name = match[2].trim();
      const children: ParsedSection[] = [];
      const section: ParsedSection = { name, level, content: '', children };

      while (stack.length > 0 && stack[stack.length - 1].section.level >= level) {
        stack.pop();
      }

      if (stack.length > 0) {
        stack[stack.length - 1].childList.push(section);
      } else {
        root.push(section);
      }

      stack.push({ section, childList: children });
      i++;

      const contentLines: string[] = [];
      while (i < lines.length) {
        const nextLine = lines[i];
        // 收集 content 时同步维护代码块状态，代码块内的 # 不应中断收集
        if (nextLine.startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          contentLines.push(nextLine);
          i++;
          continue;
        }
        if (!inCodeBlock && /^#{1,6}\s/.test(nextLine)) break;
        contentLines.push(nextLine);
        i++;
      }
      section.content = contentLines.join('\n').trim();
    } else {
      i++;
    }
  }

  for (const s of root) {
    cleanChildren(s);
  }

  return root;
}

function cleanChildren(section: ParsedSection): void {
  if (section.children && section.children.length === 0) {
    delete section.children;
  } else if (section.children) {
    for (const c of section.children) {
      cleanChildren(c);
    }
  }
}

function sectionToText(section: ParsedSection): string {
  const heading = '#'.repeat(section.level) + ' ' + section.name;
  const parts: string[] = [heading];
  if (section.content) {
    // 标题与正文间保留空行（markdown 惯例 \n\n），避免多次往返后格式退化为紧凑形式
    parts.push('', section.content);
  }
  if (section.children && section.children.length > 0) {
    for (const child of section.children) {
      // 子 section 前也保留空行
      parts.push('', sectionToText(child));
    }
  }
  return parts.join('\n');
}

function sectionsToText(sections: ParsedSection[]): string {
  return sections.map((s) => sectionToText(s)).join('\n');
}

export function findSectionByName(
  sections: ParsedSection[],
  name: string,
  level?: number,
): ParsedSection | undefined {
  for (const s of sections) {
    if (s.name === name && (level === undefined || s.level === level)) return s;
    if (s.children) {
      const found = findSectionByName(s.children, name, level);
      if (found) return found;
    }
  }
  return undefined;
}

function hasSection(sections: ParsedSection[], name: string): boolean {
  return findSectionByName(sections, name) !== undefined;
}

function cloneSection(section: ParsedSection): ParsedSection {
  const clone: ParsedSection = {
    name: section.name,
    level: section.level,
    content: section.content,
  };
  if (section.children && section.children.length > 0) {
    clone.children = section.children.map((c) => cloneSection(c));
  }
  return clone;
}

function replaceSection(
  sections: ParsedSection[],
  name: string,
  replacement: ParsedSection,
): boolean {
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].name === name) {
      sections[i] = cloneSection(replacement);
      return true;
    }
    if (sections[i].children) {
      if (replaceSection(sections[i].children!, name, replacement)) {
        return true;
      }
    }
  }
  return false;
}

export function applyInheritance(parent: string, child: string, rule: InheritanceRule): string {
  // 入口先剥离父子模板的 frontmatter，避免在合并结果中泄漏
  const parentFm = stripFrontmatter(parent);
  const childFm = stripFrontmatter(child);
  const parentBody = parentFm.body;
  const childBody = childFm.body;

  let result: string;
  if (rule.strategy === 'extend') {
    result = parentBody + '\n' + childBody;
  } else {
    // 其他策略基于 parseSections 处理纯正文
    result = applyStrategy(parentBody, childBody, rule);
  }

  // 保留父 frontmatter 在最前（如果有的话），子 frontmatter 不应出现
  return parentFm.frontmatter ? parentFm.frontmatter + result : result;
}

// 剥离 frontmatter，返回 frontmatter 原文（含末尾换行）与正文
function stripFrontmatter(content: string): { frontmatter: string | null; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { frontmatter: null, body: content };
  return { frontmatter: match[0], body: content.slice(match[0].length) };
}

// 处理非 extend 策略（基于 sections 解析）
function applyStrategy(parent: string, child: string, rule: InheritanceRule): string {
  const parentSections = parseSections(parent);
  const childSections = parseSections(child);

  if (rule.strategy === 'override') {
    const sectionsToOverride = rule.sections.override ?? [];
    for (const sectionName of sectionsToOverride) {
      const parentSec = findSectionByName(parentSections, sectionName);
      const childSec = findSectionByName(childSections, sectionName);
      if (parentSec && childSec) {
        replaceSection(parentSections, sectionName, childSec);
      }
    }
    return sectionsToText(parentSections);
  }

  if (rule.strategy === 'merge') {
    const sectionsToMerge = rule.sections.merge ?? [];
    for (const sectionName of sectionsToMerge) {
      const parentSec = findSectionByName(parentSections, sectionName);
      const childSec = findSectionByName(childSections, sectionName);
      if (parentSec && childSec) {
        // 合并 content：追加子 section 的正文到父 section
        if (childSec.content) {
          if (parentSec.content) {
            parentSec.content += '\n' + childSec.content;
          } else {
            parentSec.content = childSec.content;
          }
        }
        // 合并 children：追加子 section 独有的 children（同名同 level 不重复）
        if (childSec.children) {
          if (!parentSec.children) {
            parentSec.children = [];
          }
          for (const childChild of childSec.children) {
            if (
              !parentSec.children.some(
                (c) => c.name === childChild.name && c.level === childChild.level,
              )
            ) {
              parentSec.children.push(cloneSection(childChild));
            }
          }
        }
      }
    }
    return sectionsToText(parentSections);
  }

  if (rule.strategy === 'add') {
    const sectionsToAdd = rule.sections.add ?? [];
    // add 策略语义：将子模板中存在、父模板中不存在的 section 添加到根数组。
    // 保持子 section 的原 level（cloneSection 已保留 level），不强制调整层级；
    // 若父模板任意层级已存在同名 section（hasSection 全局递归判断），则跳过避免重复。
    for (const sectionName of sectionsToAdd) {
      if (!hasSection(parentSections, sectionName)) {
        const childSec = findSectionByName(childSections, sectionName);
        if (childSec) {
          parentSections.push(cloneSection(childSec));
        }
      }
    }
    return sectionsToText(parentSections);
  }

  if (rule.strategy === 'replace') {
    // 完全替换父模板中指定的 section
    const sectionsToReplace = rule.sections.replace ?? [];
    for (const sectionName of sectionsToReplace) {
      const childSec = findSectionByName(childSections, sectionName);
      if (childSec) {
        replaceSection(parentSections, sectionName, childSec);
      }
    }
    return sectionsToText(parentSections);
  }

  if (rule.strategy === 'prepend') {
    // 将子模板 section 内容前置到父模板对应 section 的 content 前
    const sectionsToPrepend = rule.sections.prepend ?? [];
    for (const sectionName of sectionsToPrepend) {
      const parentSec = findSectionByName(parentSections, sectionName);
      const childSec = findSectionByName(childSections, sectionName);
      if (parentSec && childSec) {
        parentSec.content = childSec.content + '\n' + parentSec.content;
      }
    }
    return sectionsToText(parentSections);
  }

  if (rule.strategy === 'append') {
    // 将子模板 section 内容追加到父模板对应 section 的 content 后
    const sectionsToAppend = rule.sections.append ?? [];
    for (const sectionName of sectionsToAppend) {
      const parentSec = findSectionByName(parentSections, sectionName);
      const childSec = findSectionByName(childSections, sectionName);
      if (parentSec && childSec) {
        parentSec.content = parentSec.content + '\n' + childSec.content;
      }
    }
    return sectionsToText(parentSections);
  }

  if (rule.strategy === 'wrap') {
    // wrap 策略：子模板 content 中的 {{CORE_TEMPLATE}} 占位符被替换为父模板对应 section 的 content
    const sectionsToWrap = rule.sections.wrap ?? [];
    for (const sectionName of sectionsToWrap) {
      const parentSec = findSectionByName(parentSections, sectionName);
      const childSec = findSectionByName(childSections, sectionName);
      if (parentSec && childSec) {
        // 使用 split().join() 全局替换，不要用 String.replace（只替换第一个）
        childSec.content = childSec.content
          .split('{{CORE_TEMPLATE}}')
          .join(parentSec.content);
        replaceSection(parentSections, sectionName, childSec);
      }
    }
    return sectionsToText(parentSections);
  }

  return sectionsToText(parentSections);
}

export function resolveChain(rules: InheritanceRule[], start: string): string[] {
  const childToParent = new Map<string, string>();
  const duplicates: string[] = [];
  for (const rule of rules) {
    // 检测同一 child 配置多个不同 parent 的情况，避免静默覆盖
    if (childToParent.has(rule.child) && childToParent.get(rule.child) !== rule.parent) {
      duplicates.push(rule.child);
    }
    childToParent.set(rule.child, rule.parent);
  }
  if (duplicates.length > 0) {
    console.warn(
      `[driv] 检测到子模板 '${duplicates[0]}' 配置了多个不同父模板，使用最后一条规则`,
    );
  }

  const chain: string[] = [];
  let current: string | undefined = start;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current)) {
      throw new Error(`循环引用检测: ${current} 已在继承链中`);
    }
    visited.add(current);
    chain.push(current);
    current = childToParent.get(current);
  }

  return chain.reverse();
}
