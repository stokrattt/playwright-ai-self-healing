import { PlaywrightPage, PlaywrightLocator, SelfHealingOptions, ElementMatch, SerializedElement } from './types';
export { PlaywrightPage, PlaywrightLocator, SelfHealingOptions, ElementMatch, SerializedElement };
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
     * Universal self-healing method with comprehensive similarity analysis
     * Combines multiple algorithms for best accuracy
     */
    findElementUniversal(page: PlaywrightPage, originalSelector: string, _options?: {
        timeout?: number;
    }): Promise<PlaywrightLocator | null>;
    /**
     * Simple self-healing method focused on speed
     * Uses basic string similarity for quick recovery
     */
    findElementSimple(page: PlaywrightPage, originalSelector: string, _options?: {
        timeout?: number;
    }): Promise<PlaywrightLocator | null>;
    /**
     * Complex self-healing method for advanced scenarios
     * Uses semantic analysis and structural comparison
     */
    findElementComplex(page: PlaywrightPage, originalSelector: string, _options?: {
        timeout?: number;
    }): Promise<PlaywrightLocator | null>;
    /**
     * Advanced self-healing method with machine learning approach
     * Uses pattern recognition and context analysis
     */
    findElementAdvanced(page: PlaywrightPage, originalSelector: string, _options?: {
        timeout?: number;
    }): Promise<PlaywrightLocator | null>;
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
 * Default export for convenience
 */
export default PlaywrightAISelfHealing;
