export type SelectorResolutionSource = 'stored' | 'original' | 'healed';
export interface SelectorContext {
    testFile?: string;
    pageObject?: string;
    notes?: string;
}
export interface HealedSelectorRecord {
    originalSelector: string;
    healedSelector: string;
    source: SelectorResolutionSource;
    updatedAt: string;
    lastVerifiedAt?: string;
    timesUsed?: number;
    testFile?: string;
    pageObject?: string;
    notes?: string;
}
export interface SelectorStore {
    get(originalSelector: string): Promise<string | null> | string | null;
    set(record: HealedSelectorRecord): Promise<void> | void;
}
export declare class MemorySelectorStore implements SelectorStore {
    private readonly records;
    get(originalSelector: string): string | null;
    set(record: HealedSelectorRecord): void;
}
export declare class JsonFileSelectorStore implements SelectorStore {
    private readonly filePath;
    constructor(filePath: string);
    get(originalSelector: string): Promise<string | null>;
    set(record: HealedSelectorRecord): Promise<void>;
    private readFile;
}
export declare class ReadOnlySelectorStore implements SelectorStore {
    private readonly innerStore;
    constructor(innerStore: SelectorStore);
    get(originalSelector: string): Promise<string | null> | string | null;
    set(_record: HealedSelectorRecord): void;
}
