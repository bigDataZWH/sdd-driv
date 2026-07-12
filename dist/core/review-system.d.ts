import { FileSystem } from '../utils/file-system.js';
import { TemplateManager } from './template-manager.js';
import { StateMachine } from './state-machine.js';
import { PathResolver } from './path-resolver.js';
export type ReviewType = 'requirement' | 'technical' | 'code';
export type ReviewStatus = 'pending' | 'passed' | 'failed';
export interface ReviewInfo {
    type: ReviewType;
    path: string;
    status: ReviewStatus;
    createdAt: string;
}
export interface ChecklistItem {
    name: string;
    description: string;
    autoCheck: boolean;
    passed?: boolean;
    detail?: string;
}
export interface ChecklistResult {
    type: ReviewType;
    items: ChecklistItem[];
    allAutoPassed: boolean;
    timestamp: string;
}
export interface ReviewSystem {
    createReview(changeName: string, type: ReviewType): Promise<string>;
    submitReview(changeName: string, type: ReviewType): Promise<void>;
    checkStatus(changeName: string, type: ReviewType): Promise<ReviewStatus>;
    executeChecklist(changeName: string, type: ReviewType): Promise<ChecklistResult>;
    listReviews(changeName: string): Promise<ReviewInfo[]>;
}
export declare class ReviewSystemImpl implements ReviewSystem {
    private fs;
    private templateManager;
    private stateMachine;
    private pathResolver;
    constructor(fs: FileSystem, templateManager: TemplateManager, stateMachine: StateMachine, pathResolver: PathResolver);
    private reviewDir;
    private reviewFilePath;
    createReview(changeName: string, type: ReviewType): Promise<string>;
    executeChecklist(changeName: string, type: ReviewType): Promise<ChecklistResult>;
    submitReview(changeName: string, type: ReviewType): Promise<void>;
    checkStatus(changeName: string, type: ReviewType): Promise<ReviewStatus>;
    listReviews(changeName: string): Promise<ReviewInfo[]>;
    private runAutoCheck;
}
