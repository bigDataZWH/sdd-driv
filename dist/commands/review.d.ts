import type { ReviewType } from '../core/review-system.js';
export interface ReviewOptions {
    json?: boolean;
    type?: ReviewType;
    change?: string;
}
export declare function reviewCommand(targetPath: string, options?: ReviewOptions): Promise<void>;
