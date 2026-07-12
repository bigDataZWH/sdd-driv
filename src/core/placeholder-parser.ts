const PLACEHOLDER_REGEX = /\{\{([a-z_0-9]+)(:([^}]+))?\}\}/gs;

export interface ParsedPlaceholder {
  name: string;
  defaultValue: string | null;
  fullMatch: string;
}

export class PlaceholderParser {
  static parse(template: string): ParsedPlaceholder[] {
    const result: ParsedPlaceholder[] = [];
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

  static replace(template: string, values: Record<string, string>): string {
    return template.replace(
      PLACEHOLDER_REGEX,
      (match, name: string, _colonPart: string | undefined, defaultValue: string | undefined) => {
        if (values[name] !== undefined) {
          return values[name];
        }
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        return match;
      },
    );
  }
}
