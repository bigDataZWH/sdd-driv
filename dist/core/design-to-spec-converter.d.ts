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
export declare class DesignToSpecConverter {
    private fs;
    private resolver;
    constructor(fs: FileSystem, resolver: PathResolver);
    convert(changeName: string): Promise<ConversionResult>;
    private extractCapabilities;
    private createDefaultCapability;
    private extractKeySections;
    private generateSpecContent;
    validateConversion(changeName: string): Promise<boolean>;
}
