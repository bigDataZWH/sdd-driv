import { parse, stringify } from 'yaml';
import { FileSystem } from './file-system.js';

export class YamlParser {
  private fs?: FileSystem;

  constructor(fs?: FileSystem) {
    this.fs = fs;
  }

  parse(text: string): Record<string, unknown> {
    return parse(text) as Record<string, unknown>;
  }

  stringify(obj: Record<string, unknown>): string {
    return stringify(obj, { lineWidth: 120 });
  }

  async readFile(filePath: string): Promise<Record<string, unknown>> {
    if (!this.fs) throw new Error('YamlParser requires FileSystem for file operations');
    const content = await this.fs.readFile(filePath);
    return this.parse(content);
  }

  async writeFile(filePath: string, obj: Record<string, unknown>): Promise<void> {
    if (!this.fs) throw new Error('YamlParser requires FileSystem for file operations');
    const content = this.stringify(obj);
    await this.fs.writeFile(filePath, content);
  }

  setField(obj: Record<string, unknown>, field: string, value: unknown): void {
    const parts = field.split('.');
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }
}
