const SECTION_HEADERS = {
    '## ADDED Requirements': 'added',
    '## MODIFIED Requirements': 'modified',
    '## UPDATED Requirements': 'modified',
    '## REMOVED Requirements': 'removed',
    '## SUPERSEDE': 'removed',
    '## SUPERSEDED Requirements': 'removed',
    '## SUPERSEDED': 'removed',
};
const REQUIREMENT_HEADER_RE = /^### Requirement:\s*(.+)$/;
export function parseDeltaSpec(content) {
    const result = { added: [], modified: [], removed: [] };
    const lines = content.split('\n');
    let currentBucket = null;
    for (const line of lines) {
        const trimmed = line.trim();
        // 检测章节切换
        let switched = false;
        for (const [header, bucket] of Object.entries(SECTION_HEADERS)) {
            if (trimmed === header || trimmed.startsWith(header)) {
                currentBucket = bucket;
                switched = true;
                break;
            }
        }
        if (switched)
            continue;
        // 遇到其他二级标题则退出当前章节
        if (/^##\s/.test(trimmed)) {
            currentBucket = null;
            continue;
        }
        if (currentBucket) {
            const reqMatch = trimmed.match(REQUIREMENT_HEADER_RE);
            if (reqMatch) {
                const name = reqMatch[1].trim();
                const bucket = result[currentBucket];
                if (!bucket.includes(name)) {
                    bucket.push(name);
                }
            }
        }
    }
    return result;
}
export function hasDelta(content) {
    const delta = parseDeltaSpec(content);
    return delta.added.length > 0 || delta.modified.length > 0 || delta.removed.length > 0;
}
//# sourceMappingURL=delta-spec-parser.js.map