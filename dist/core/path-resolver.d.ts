export declare class PathResolver {
    readonly root: string;
    constructor(root: string);
    get openspecDir(): string;
    get changesDir(): string;
    changeDir(name: string): string;
    stateFile(name: string): string;
    handoffDir(name: string): string;
    normalize(p: string): string;
}
