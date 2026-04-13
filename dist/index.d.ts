import { PlaywrightPage, PlaywrightLocator, SelfHealingOptions, ElementMatch, SerializedElement } from './types';
import { HealedSelectorRecord, SelectorContext, SelectorResolutionSource, SelectorStore, MemorySelectorStore, JsonFileSelectorStore, ReadOnlySelectorStore } from './selector-store';
export { PlaywrightPage, PlaywrightLocator, SelfHealingOptions, ElementMatch, SerializedElement };
export { HealedSelectorRecord, SelectorContext, SelectorResolutionSource, SelectorStore, MemorySelectorStore, JsonFileSelectorStore, ReadOnlySelectorStore, };
export type ProjectSelectorStoreMode = 'off' | 'read' | 'read-write';
export interface ProjectSelfHealingOptions {
    /** Path to the project-owned selector store JSON file */
    selectorStorePath?: string;
    /** Selector store behavior for the current environment */
    selectorStoreMode?: ProjectSelectorStoreMode;
    /** Environment bag used to auto-configure behavior */
    env?: Record<string, string | undefined>;
}
export declare const DEFAULT_SELECTOR_STORE_PATH = "playwright/.healed-selectors.json";
export declare const SELECTOR_STORE_PATH_ENV = "PLAYWRIGHT_AI_SELF_HEALING_STORE_PATH";
export declare const SELECTOR_STORE_MODE_ENV = "PLAYWRIGHT_AI_SELF_HEALING_STORE_MODE";
/**
 * Configuration for AI Self-Healing performance optimization
 */
export interface SelfHealingConfig {
    /** Minimum similarity threshold to consider a match (0-1) */
    minSimilarityThreshold: number;
    /** Weight for Levenshtein distance algorithm */
    levenshteinWeight: number;
    /** Weight for semantic similarity algorithm */
    semanticWeight: number;
    /** Weight for structural similarity algorithm */
    structuralWeight: number;
    /** Cache TTL in milliseconds for DOM elements */
    domCacheTTL: number;
    /** Maximum number of elements to analyze */
    maxElementsToAnalyze: number;
    /** Timeout for finding elements in milliseconds */
    findTimeout: number;
    /** Enable debug logging (security consideration: disable in production) */
    debug: boolean;
    /** Optional selector store used to reuse and persist healed selectors */
    selectorStore?: SelectorStore;
    /** Whether a stored selector should be tried before the original selector */
    useStoredSelectorsFirst: boolean;
    /** Optional metadata attached to persisted selector records */
    selectorContext?: SelectorContext;
}
/**
 * Default configuration optimized for performance
 */
export declare const DEFAULT_CONFIG: SelfHealingConfig;
/**
 * AI Self-Healing Locator Library
 * Provides intelligent locator recovery using multiple similarity algorithms
 */
export declare class PlaywrightAISelfHealing {
    private config;
    private domCache;
    private similarityCache;
    constructor(config?: Partial<SelfHealingConfig>);
    /**
     * Validate configuration for security and correctness
     */
    private validateConfig;
    /**
     * Validate CSS selector for security
     */
    private isValidSelector;
    /**
     * Secure logging function
     */
    private secureLog;
    /**
     * Try resolving a selector into a usable locator
     */
    private tryLocator;
    /**
     * Try a stored selector override and then fall back to the original selector
     */
    private resolveStoredOrOriginal;
    /**
     * Persist a selector resolution when a store is configured
     */
    private persistSelectorResolution;
    /**
     * Universal self-healing method with comprehensive similarity analysis
     * Combines multiple algorithms for best accuracy
     */
    findElementUniversal<TLocator extends PlaywrightLocator>(page: PlaywrightPage<TLocator>, originalSelector: string, options?: SelfHealingOptions): Promise<TLocator | null>;
    /**
     * Simple self-healing method focused on speed
     * Uses basic string similarity for quick recovery
     */
    findElementSimple<TLocator extends PlaywrightLocator>(page: PlaywrightPage<TLocator>, originalSelector: string, options?: SelfHealingOptions): Promise<TLocator | null>;
    /**
     * Complex self-healing method for advanced scenarios
     * Uses semantic analysis and structural comparison
     */
    findElementComplex<TLocator extends PlaywrightLocator>(page: PlaywrightPage<TLocator>, originalSelector: string, options?: SelfHealingOptions): Promise<TLocator | null>;
    /**
     * Advanced self-healing method with machine learning approach
     * Uses pattern recognition and context analysis
     */
    findElementAdvanced<TLocator extends PlaywrightLocator>(page: PlaywrightPage<TLocator>, originalSelector: string, options?: SelfHealingOptions): Promise<TLocator | null>;
    /**
     * Get all elements from page with caching
     */
    private getAllPageElements;
    /**
     * Calculate comprehensive similarity using multiple algorithms
     */
    private calculateComprehensiveSimilarity;
    /**
     * Calculate Levenshtein distance-based similarity
     */
    private calculateLevenshteinSimilarity;
    /**
     * Calculate semantic similarity based on element properties
     */
    private calculateSemanticSimilarity;
    /**
     * Calculate structural similarity based on DOM properties
     */
    private calculateStructuralSimilarity;
    /**
     * Calculate pattern similarity for advanced matching
     */
    private calculatePatternSimilarity;
    /**
     * Calculate contextual relevance
     */
    private calculateContextualRelevance;
    /**
     * Get contextual elements around the original selector
     */
    private getContextualElements;
    /**
     * Get element identifier for comparison
     */
    private debugElementCount;
    private getElementIdentifier;
    /**
     * Generate optimal selector for found element
     */
    private generateOptimalSelector;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<SelfHealingConfig>): void;
    /**
     * Clear all caches
     */
    clearCache(): void;
}
/**
 * Create a new instance of PlaywrightAISelfHealing
 */
export declare function createSelfHealing(config?: Partial<SelfHealingConfig>): PlaywrightAISelfHealing;
/**
 * Create a self-healing instance with project-friendly defaults.
 * Project runs default to read-write persistence in `playwright/.healed-selectors.json`.
 * CI can use the same file, as long as the pipeline restores/saves it between runs.
 */
export declare function createProjectSelfHealing(config?: Partial<SelfHealingConfig>, options?: ProjectSelfHealingOptions): PlaywrightAISelfHealing;
/**
 * Default export for convenience
 */
export default PlaywrightAISelfHealing;
