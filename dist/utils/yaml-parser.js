import { parse, stringify } from 'yaml';
export class YamlParser {
    fs;
    constructor(fs) {
        this.fs = fs;
    }
    parse(text) {
        return parse(text);
    }
    stringify(obj) {
        return stringify(obj, { lineWidth: 120 });
    }
    async readFile(filePath) {
        if (!this.fs)
            throw new Error('YamlParser requires FileSystem for file operations');
        const content = await this.fs.readFile(filePath);
        return this.parse(content);
    }
    async writeFile(filePath, obj) {
        if (!this.fs)
            throw new Error('YamlParser requires FileSystem for file operations');
        const content = this.stringify(obj);
        await this.fs.writeFile(filePath, content);
    }
    setField(obj, field, value) {
        const parts = field.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }
}
//# sourceMappingURL=yaml-parser.js.map