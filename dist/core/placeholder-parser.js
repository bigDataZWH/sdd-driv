const PLACEHOLDER_REGEX = /\{\{([a-z_0-9]+)(:([^}]+))?\}\}/gs;
export class PlaceholderParser {
    static parse(template) {
        const result = [];
        const matches = template.matchAll(PLACEHOLDER_REGEX);
        for (const match of matches) {
            result.push({
                name: match[1],
                defaultValue: match[3] ?? null,
                fullMatch: match[0],
            });
        }
        return result;
    }
    static replace(template, values) {
        return template.replace(PLACEHOLDER_REGEX, (match, name, _colonPart, defaultValue) => {
            if (values[name] !== undefined) {
                return values[name];
            }
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            return match;
        });
    }
}
//# sourceMappingURL=placeholder-parser.js.map