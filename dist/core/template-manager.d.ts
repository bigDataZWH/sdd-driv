import { FileSystem } from '../utils/file-system.js';
import { type InheritanceRule } from './template-inheritance.js';
export type TemplateType = 'proposal' | 'design' | 'spec' | 'review';
export interface TemplateInfo {
    name: string;
    type: TemplateType;
    path: string;
}
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
interface TemplateCategoryConfig {
    default: string;
    types: Record<string, string>;
    type_mapping?: Record<string, string>;
}
interface TemplateConfig {
    version: string;
    proposals: TemplateCategoryConfig;
    designs: TemplateCategoryConfig;
    specs: TemplateCategoryConfig;
    reviews: Record<string, string>;
    inheritance: {
        rules: InheritanceRule[];
    };
    placeholders: {
        system: string[];
        user: string[];
    };
    project_override: {
        search_paths: string[];
    };
}
export declare class TemplateManager {
    private fs;
    private root;
    private configCache;
    constructor(fs: FileSystem, root: string);
    private templatesDir;
    private typeDir;
    private templatePath;
    private readTemplatePath;
    private readFirstExistingTemplate;
    getConfig(): Promise<TemplateConfig>;
    loadTemplate(type: TemplateType, name: string): Promise<string>;
    listTemplates(type?: TemplateType): Promise<TemplateInfo[]>;
    selectTemplate(type: TemplateType, changeType?: string): Promise<string>;
    applyTemplate(type: TemplateType, name: string, data: Record<string, string>): Promise<string>;
    validateTemplate(type: TemplateType, name: string): Promise<ValidationResult>;
    getInheritanceChain(type: TemplateType, name: string): Promise<string[]>;
}
export {};
