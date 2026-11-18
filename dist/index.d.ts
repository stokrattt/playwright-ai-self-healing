import { PlaywrightPage, PlaywrightLocator, PlaywrightSelectors, SelfHealingOptions, ElementMatch, SerializedElement } from './types';
import { HealedSelectorRecord, SelectorContext, SelectorResolutionSource, SelectorStore, MemorySelectorStore, JsonFileSelectorStore, ReadOnlySelectorStore } from './selector-store';
export { PlaywrightPage, PlaywrightLocator, PlaywrightSelectors, SelfHealingOptions, ElementMatch, SerializedElement };
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
    /** `heal=` engine: how long the original selector may stay missing before healing starts, in ms */
    healAfterMs: number;
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
    private engineName;
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
     * @deprecated Same scoring as findElementUniversal, which it calls. Kept for API compatibility.
     */
    findElementComplex<TLocator extends PlaywrightLocator>(page: PlaywrightPage<TLocator>, originalSelector: string, options?: SelfHealingOptions): Promise<TLocator | null>;
    /**
     * @deprecated Same scoring as findElementUniversal, which it calls. Kept for API compatibility.
     */
    findElementAdvanced<TLocator extends PlaywrightLocator>(page: PlaywrightPage<TLocator>, originalSelector: string, options?: SelfHealingOptions): Promise<TLocator | null>;
    /**
     * Register a selector engine that heals inside the page: `page.locator('heal=#old-id')`.
     * Playwright re-runs it on every retry, so any action and any `expect` assertion work on it.
     * Call once before pages are created, e.g. in a worker fixture: `await ai.registerSelectorEngine(selectors)`.
     * The engine keeps the original selector while it matches, and heals only after it has been
     * missing for `healAfterMs`. It does not write the selector store.
     */
    registerSelectorEngine(selectors: PlaywrightSelectors, name?: string): Promise<void>;
    /**
     * Heal the selectors this page's tests already write, with no `heal=` prefix:
     * `page.locator('#old')`, `page.getByTestId('old')`, chained and frame locators.
     * Call per page after registerSelectorEngine(), e.g. in a `page` fixture override.
     * Left as Playwright resolves them: getByRole/Text/Label/Placeholder/AltText/Title, explicit engines
     * (`css=#id` opts a selector out), `>>` chains, Playwright-only CSS such as `:has-text()`, and the
     * older selector-taking methods (`page.click('#id')`, `page.$`, `waitForSelector`).
     */
    enableAutoHealing(page: AutoHealPage): void;
    /**
     * Try the element's locators in priority order (test id, getBy*, CSS, XPath) and keep the first
     * one Playwright resolves to a single element.
     */
    private lockHealedLocator;
    /**
     * Whether the locator resolves to the element the XPath points at. True when it cannot be checked:
     * no anchor (an element in shadow DOM) or a locator without evaluate (a test double).
     */
    private isSameElement;
    /**
     * Get all elements from page with caching
     */
    private getAllPageElements;
    /**
     * Score how well an element matches what the selector identified it by.
     * Each value in the selector (`#id`, `.class`, `[attr="v"]`, text, a bare word) is compared with
     * the element's value of the same attribute: characters (levenshteinWeight) and words (semanticWeight).
     * structuralWeight rewards the same tag or role, and only counts when the selector names a tag.
     */
    private calculateComprehensiveSimilarity;
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
 * The parts of a Playwright Page that auto-healing needs
 */
export interface AutoHealPage {
    locator(selector: string): object;
    mainFrame(): object;
    frameLocator(selector: string): object;
}
/**
 * Prefix a selector the test wrote with the healing engine, or leave it for Playwright.
 * getByTestId compiles to `internal:testid=[attr="value"s]`, which becomes the same CSS attribute match.
 */
export declare function toHealingSelector(selector: string, engine?: string): string;
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
