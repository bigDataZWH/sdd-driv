import { FileSystem } from '../utils/file-system.js';
export declare const ReviewTypes: readonly ["requirement", "technical", "code"];
export type ReviewType = (typeof ReviewTypes)[number];
export declare const ReviewStatuses: readonly ["pending", "passed", "failed"];
export type ReviewStatus = (typeof ReviewStatuses)[number];
export interface ReviewInfo {
    type: ReviewType;
    status: ReviewStatus;
    path: string;
    createdAt: string;
    submittedAt?: string;
}
export type FindingSeverity = 'error' | 'warning' | 'info';
export interface ReviewFinding {
    check: string;
    severity: FindingSeverity;
    passed: boolean;
    detail: string;
    autoCheck: boolean;
}
export interface ChecklistItem {
    check: string;
    passed: boolean;
    detail: string;
    autoCheck: boolean;
}
export interface ChecklistResult {
    type: ReviewType;
    items: ChecklistItem[];
    timestamp: string;
}
export interface GateConfig {
    phase: string;
    trigger: string;
    required_approvals: number;
    checklist: string[];
    template: string;
}
export type GatesConfig = Record<string, GateConfig>;
export interface ChecklistDef {
    name: string;
    description: string;
    autoCheck: boolean;
}
export declare const CHECKLIST_DEFS: Record<ReviewType, ChecklistDef[]>;
export declare const defaultGatesConfig: GatesConfig;
export declare function loadGatesConfig(fs: FileSystem, root: string): Promise<GatesConfig>;
