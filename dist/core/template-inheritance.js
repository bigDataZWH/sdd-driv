export function parseSections(markdown) {
    const lines = markdown.split('\n');
    const root = [];
    const stack = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const match = line.match(/^(#{1,6})\s+(.+)/);
        if (match) {
            const level = match[1].length;
            const name = match[2].trim();
            const children = [];
            const section = { name, level, content: '', children };
            while (stack.length > 0 && stack[stack.length - 1].section.level >= level) {
                stack.pop();
            }
            if (stack.length > 0) {
                stack[stack.length - 1].childList.push(section);
            }
            else {
                root.push(section);
            }
            stack.push({ section, childList: children });
            i++;
            const contentLines = [];
            while (i < lines.length) {
                const nextLine = lines[i];
                if (/^#{1,6}\s/.test(nextLine))
                    break;
                contentLines.push(nextLine);
                i++;
            }
            section.content = contentLines.join('\n').trim();
        }
        else {
            i++;
        }
    }
    for (const s of root) {
        cleanChildren(s);
    }
    return root;
}
function cleanChildren(section) {
    if (section.children && section.children.length === 0) {
        delete section.children;
    }
    else if (section.children) {
        for (const c of section.children) {
            cleanChildren(c);
        }
    }
}
function sectionToText(section) {
    const heading = '#'.repeat(section.level) + ' ' + section.name;
    const parts = [heading];
    if (section.content) {
        parts.push(section.content);
    }
    if (section.children && section.children.length > 0) {
        for (const child of section.children) {
            parts.push(sectionToText(child));
        }
    }
    return parts.join('\n');
}
function sectionsToText(sections) {
    return sections.map((s) => sectionToText(s)).join('\n');
}
function findSectionByName(sections, name) {
    for (const s of sections) {
        if (s.name === name)
            return s;
        if (s.children) {
            const found = findSectionByName(s.children, name);
            if (found)
                return found;
        }
    }
    return undefined;
}
function hasSection(sections, name) {
    return findSectionByName(sections, name) !== undefined;
}
function cloneSection(section) {
    const clone = {
        name: section.name,
        level: section.level,
        content: section.content,
    };
    if (section.children && section.children.length > 0) {
        clone.children = section.children.map((c) => cloneSection(c));
    }
    return clone;
}
function replaceSection(sections, name, replacement) {
    for (let i = 0; i < sections.length; i++) {
        if (sections[i].name === name) {
            sections[i] = cloneSection(replacement);
            return true;
        }
        if (sections[i].children) {
            if (replaceSection(sections[i].children, name, replacement)) {
                return true;
            }
        }
    }
    return false;
}
function mergeContentToSection(sections, name, additionalContent) {
    for (const s of sections) {
        if (s.name === name) {
            if (s.content) {
                s.content += '\n' + additionalContent;
            }
            else {
                s.content = additionalContent;
            }
            return true;
        }
        if (s.children) {
            if (mergeContentToSection(s.children, name, additionalContent)) {
                return true;
            }
        }
    }
    return false;
}
export function applyInheritance(parent, child, rule) {
    if (rule.strategy === 'extend') {
        return parent + '\n' + child;
    }
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
                mergeContentToSection(parentSections, sectionName, childSec.content);
            }
        }
        return sectionsToText(parentSections);
    }
    if (rule.strategy === 'add') {
        const sectionsToAdd = rule.sections.add ?? [];
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
    return sectionsToText(parentSections);
}
export function resolveChain(rules, start) {
    const childToParent = new Map();
    for (const rule of rules) {
        childToParent.set(rule.child, rule.parent);
    }
    const chain = [];
    let current = start;
    const visited = new Set();
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
//# sourceMappingURL=template-inheritance.js.map