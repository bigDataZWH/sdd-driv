import * as path from 'path';
import { FileSystem } from '../utils/file-system.js';
import { PathResolver } from './path-resolver.js';

export interface DesignSection {
  title: string;
  content: string;
}

export interface SpecCapability {
  name: string;
  description: string;
  sections: DesignSection[];
}

export interface ConversionResult {
  success: boolean;
  specs: string[];
  warnings: string[];
  errors: string[];
}

export class DesignToSpecConverter {
  constructor(
    private fs: FileSystem,
    private resolver: PathResolver,
  ) {}

  async convert(changeName: string): Promise<ConversionResult> {
    const result: ConversionResult = {
      success: false,
      specs: [],
      warnings: [],
      errors: [],
    };

    const changeDir = this.resolver.changeDir(changeName);
    const designPath = path.join(changeDir, 'design.md');
    const specsDir = path.join(changeDir, 'specs');

    if (!(await this.fs.exists(designPath))) {
      result.errors.push(`设计文档不存在: ${designPath}`);
      return result;
    }

    const designContent = await this.fs.readFile(designPath);
    const capabilities = this.extractCapabilities(designContent);

    if (capabilities.length === 0) {
      result.warnings.push('未从设计文档中提取到能力定义，将创建默认能力');
      capabilities.push(this.createDefaultCapability(designContent, changeName));
    }

    await this.fs.ensureDir(specsDir);

    for (const capability of capabilities) {
      const capabilityDir = path.join(specsDir, capability.name);
      const specPath = path.join(capabilityDir, 'spec.md');

      await this.fs.ensureDir(capabilityDir);

      const specContent = this.generateSpecContent(capability, changeName);
      await this.fs.writeFile(specPath, specContent);

      result.specs.push(specPath);
    }

    result.success = true;
    return result;
  }

  private extractCapabilities(designContent: string): SpecCapability[] {
    const capabilities: SpecCapability[] = [];
    const lines = designContent.split('\n');
    let currentCapability: SpecCapability | null = null;
    let currentSection: DesignSection | null = null;

    for (const line of lines) {
      const capabilityMatch = line.match(/^###\s*能力\s*([^:]+)(?::|$)/);
      if (capabilityMatch) {
        if (currentCapability) {
          capabilities.push(currentCapability);
        }
        currentCapability = {
          name: capabilityMatch[1].trim().toLowerCase().replace(/\s+/g, '-'),
          description: '',
          sections: [],
        };
        currentSection = null;
        continue;
      }

      const sectionMatch = line.match(/^####\s+(.+)/);
      if (sectionMatch && currentCapability) {
        if (currentSection) {
          currentCapability.sections.push(currentSection);
        }
        currentSection = {
          title: sectionMatch[1].trim(),
          content: '',
        };
        continue;
      }

      if (currentSection) {
        currentSection.content += line + '\n';
      } else if (currentCapability && !currentCapability.description) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          currentCapability.description += trimmed + ' ';
        }
      }
    }

    if (currentSection && currentCapability) {
      currentCapability.sections.push(currentSection);
    }
    if (currentCapability) {
      capabilities.push(currentCapability);
    }

    return capabilities;
  }

  private createDefaultCapability(designContent: string, changeName: string): SpecCapability {
    const firstParagraph = designContent.split('\n\n')[0]?.replace(/#+\s*/g, '').trim() || '';
    const summary = firstParagraph.length > 200 ? firstParagraph.slice(0, 200) + '...' : firstParagraph;

    return {
      name: changeName.toLowerCase().replace(/\s+/g, '-'),
      description: summary,
      sections: this.extractKeySections(designContent),
    };
  }

  private extractKeySections(designContent: string): DesignSection[] {
    const sections: DesignSection[] = [];
    const sectionPatterns = [
      { title: '架构设计', regex: /^##\s*三[、.].*架构/ },
      { title: '接口设计', regex: /^##\s*四[、.].*接口/ },
      { title: '数据模型', regex: /^##\s*[四五][、.].*数据/ },
      { title: '核心流程', regex: /^##\s*[三四][、.].*流程/ },
      { title: '安全设计', regex: /^##\s*六[、.].*安全/ },
      { title: '性能设计', regex: /^##\s*五[、.].*性能/ },
    ];

    const lines = designContent.split('\n');
    let currentSection: DesignSection | null = null;

    for (const line of lines) {
      let matched = false;
      for (const pattern of sectionPatterns) {
        if (pattern.regex.test(line)) {
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = {
            title: pattern.title,
            content: '',
          };
          matched = true;
          break;
        }
      }

      if (!matched && currentSection) {
        const nextSectionMatch = line.match(/^##\s/);
        if (nextSectionMatch) {
          sections.push(currentSection);
          currentSection = null;
        } else {
          currentSection.content += line + '\n';
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  private generateSpecContent(capability: SpecCapability, changeName: string): string {
    const lines: string[] = [];

    lines.push(`---`);
    lines.push(`template: spec-capability`);
    lines.push(`version: 1.0`);
    lines.push(`based_on: 设计文档转换`);
    lines.push(`change: ${changeName}`);
    lines.push(`---`);
    lines.push('');
    lines.push(`# 能力规格说明书：${capability.name}`);
    lines.push('');
    lines.push(`## 一、规格概述`);
    lines.push('');
    lines.push(`### 1.1 基本信息`);
    lines.push('');
    lines.push(`| 项目 | 内容 |`);
    lines.push(`|------|------|`);
    lines.push(`| 能力名称 | ${capability.name} |`);
    lines.push(`| 规格版本 | V1.0 |`);
    lines.push(`| 所属变更 | ${changeName} |`);
    lines.push(`| 创建日期 | ${new Date().toISOString().slice(0, 10)} |`);
    lines.push(`| 规格状态 | 待评审 |`);
    lines.push('');
    lines.push(`### 1.2 能力简介`);
    lines.push('');
    lines.push(capability.description || '*暂无描述*');
    lines.push('');

    if (capability.sections.length > 0) {
      lines.push(`## 二、能力详述`);
      lines.push('');

      for (const section of capability.sections) {
        lines.push(`### ${section.title}`);
        lines.push('');
        lines.push(section.content.trim() || '*暂无内容*');
        lines.push('');
      }
    }

    lines.push(`## 三、接口规格`);
    lines.push('');
    lines.push(`### 3.1 接口清单`);
    lines.push('');
    lines.push(`> 待从设计文档中提取接口定义`);
    lines.push('');
    lines.push(`## 四、行为规格`);
    lines.push('');
    lines.push(`### 4.1 正常行为`);
    lines.push('');
    lines.push(`> 待从设计文档中提取行为描述`);
    lines.push('');
    lines.push(`## 五、质量规格`);
    lines.push('');
    lines.push(`### 5.1 性能规格`);
    lines.push('');
    lines.push(`> 待从设计文档中提取性能指标`);
    lines.push('');
    lines.push(`## 六、安全规格`);
    lines.push('');
    lines.push(`> 待从设计文档中提取安全要求`);
    lines.push('');
    lines.push(`## 七、变更管理`);
    lines.push('');
    lines.push(`| 变更类型 | 说明 |`);
    lines.push(`|----------|------|`);
    lines.push(`| 新增 | 首次创建 |`);
    lines.push('');
    lines.push(`### 变更历史`);
    lines.push('');
    lines.push(`| 版本 | 日期 | 变更描述 |`);
    lines.push(`|------|------|----------|`);
    lines.push(`| V1.0 | ${new Date().toISOString().slice(0, 10)} | 基于设计文档自动生成 |`);

    return lines.join('\n');
  }

  async validateConversion(changeName: string): Promise<boolean> {
    const changeDir = this.resolver.changeDir(changeName);
    const specsDir = path.join(changeDir, 'specs');

    if (!(await this.fs.exists(specsDir))) {
      return false;
    }

    const entries = await this.fs.listDir(specsDir);
    for (const entry of entries) {
      const specFile = path.join(specsDir, entry, 'spec.md');
      if (!(await this.fs.exists(specFile))) {
        return false;
      }
    }

    return entries.length > 0;
  }
}