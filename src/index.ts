import { PlaywrightPage, PlaywrightLocator, PlaywrightSelectors, SelfHealingOptions, ElementMatch, SerializedElement } from './types';
import { collectElementsScript, healingEngineScript, scoreElement } from './page-scripts';
import {
  HealedSelectorRecord,
  SelectorContext,
  SelectorResolutionSource,
  SelectorStore,
  MemorySelectorStore,
  JsonFileSelectorStore,
  ReadOnlySelectorStore,
} from './selector-store';

// Re-export types for convenience
export { PlaywrightPage, PlaywrightLocator, PlaywrightSelectors, SelfHealingOptions, ElementMatch, SerializedElement };
export {
  HealedSelectorRecord,
  SelectorContext,
  SelectorResolutionSource,
  SelectorStore,
  MemorySelectorStore,
  JsonFileSelectorStore,
  ReadOnlySelectorStore,
};

export type ProjectSelectorStoreMode = 'off' | 'read' | 'read-write';

export interface ProjectSelfHealingOptions {
  /** Path to the project-owned selector store JSON file */
  selectorStorePath?: string;
  /** Selector store behavior for the current environment */
  selectorStoreMode?: ProjectSelectorStoreMode;
  /** Environment bag used to auto-configure behavior */
  env?: Record<string, string | undefined>;
}

export const DEFAULT_SELECTOR_STORE_PATH = 'playwright/.healed-selectors.json';
export const SELECTOR_STORE_PATH_ENV = 'PLAYWRIGHT_AI_SELF_HEALING_STORE_PATH';
export const SELECTOR_STORE_MODE_ENV = 'PLAYWRIGHT_AI_SELF_HEALING_STORE_MODE';

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
export const DEFAULT_CONFIG: SelfHealingConfig = {
  minSimilarityThreshold: 0.4,
  levenshteinWeight: 0.7,
  semanticWeight: 0.2,
  structuralWeight: 0.1,
  domCacheTTL: 30000,
  maxElementsToAnalyze: 50,
  findTimeout: 5000,
  debug: false, // Secure default: no debug logging
  selectorStore: undefined,
  useStoredSelectorsFirst: true,
  selectorContext: undefined,
  healAfterMs: 1000,
};

/**
 * Cache entry for DOM elements with timestamp
 */
interface CacheEntry {
  elements: SerializedElement[];
  timestamp: number;
}

/**
 * AI Self-Healing Locator Library
 * Provides intelligent locator recovery using multiple similarity algorithms
 */
export class PlaywrightAISelfHealing {
  private config: SelfHealingConfig;
  private engineName: string | undefined;
  private domCache = new WeakMap<PlaywrightPage, CacheEntry>();
  private similarityCache = new Map<string, number>();

  constructor(config: Partial<SelfHealingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Security validation
    this.validateConfig();
  }

  /**
   * Validate configuration for security and correctness
   */
  private validateConfig(): void {
    if (this.config.minSimilarityThreshold < 0 || this.config.minSimilarityThreshold > 1) {
      throw new Error('minSimilarityThreshold must be between 0 and 1');
    }
    if (this.config.maxElementsToAnalyze < 1 || this.config.maxElementsToAnalyze > 1000) {
      throw new Error('maxElementsToAnalyze must be between 1 and 1000');
    }
    if (this.config.findTimeout < 100 || this.config.findTimeout > 60000) {
      throw new Error('findTimeout must be between 100ms and 60000ms');
    }
    if (this.config.healAfterMs < 0 || this.config.healAfterMs > 60000) {
      throw new Error('healAfterMs must be between 0ms and 60000ms');
    }
  }

  /**
   * Validate CSS selector for security
   */
  private isValidSelector(selector: string): boolean {
    if (!selector || typeof selector !== 'string' || selector.length > 1000) {
      return false;
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /<script/i,
      /eval\(/i,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(selector));
  }

  /**
   * Secure logging function
   */
  private secureLog(message: string): void {
    if (this.config.debug) {
      console.log(`[PlaywrightAISelfHealing] ${message}`);
    }
  }

  /**
   * Try resolving a selector into a usable locator
   */
  private async tryLocator<TLocator extends PlaywrightLocator>(
    page: PlaywrightPage<TLocator>,
    selector: string,
    timeout: number
  ): Promise<TLocator | null> {
    try {
      const locator = page.locator(selector);
      // 'attached': a hidden element still exists, and assertions like toBeHidden need it as is.
      await locator.waitFor({ timeout, state: 'attached' });
      return locator;
    } catch {
      return null;
    }
  }

  /**
   * Try a stored selector override and then fall back to the original selector
   */
  private async resolveStoredOrOriginal<TLocator extends PlaywrightLocator>(
    page: PlaywrightPage<TLocator>,
    originalSelector: string,
    timeout: number,
    context?: SelectorContext
  ): Promise<TLocator | null> {
    const storedSelector = await this.config.selectorStore?.get(originalSelector) ?? null;

    if (this.config.useStoredSelectorsFirst && storedSelector && storedSelector !== originalSelector) {
      const storedLocator = await this.tryLocator(page, storedSelector, timeout);
      if (storedLocator) {
        await this.persistSelectorResolution(originalSelector, storedSelector, 'stored', context);
        this.secureLog(`Using stored selector override: "${originalSelector}" -> "${storedSelector}"`);
        return storedLocator;
      }

      this.secureLog(`Stored selector no longer works: "${storedSelector}"`);
    }

    const originalLocator = await this.tryLocator(page, originalSelector, timeout);
    if (originalLocator) {
      // Write only to reset a stale override: a store write on every healthy lookup is pure disk I/O.
      if (storedSelector && storedSelector !== originalSelector) {
        await this.persistSelectorResolution(originalSelector, originalSelector, 'original', context);
      }
      return originalLocator;
    }

    return null;
  }

  /**
   * Persist a selector resolution when a store is configured
   */
  private async persistSelectorResolution(
    originalSelector: string,
    healedSelector: string,
    source: SelectorResolutionSource,
    context?: SelectorContext
  ): Promise<void> {
    if (!this.config.selectorStore) {
      return;
    }

    const mergedContext = {
      ...this.config.selectorContext,
      ...context,
    };
    const observedAt = new Date().toISOString();
    const record: HealedSelectorRecord = {
      originalSelector,
      healedSelector,
      source,
      updatedAt: observedAt,
      lastVerifiedAt: observedAt,
      testFile: mergedContext.testFile,
      pageObject: mergedContext.pageObject,
      notes: mergedContext.notes,
    };

    await this.config.selectorStore.set(record);
  }

  /**
   * Universal self-healing method with comprehensive similarity analysis
   * Combines multiple algorithms for best accuracy
   */
  async findElementUniversal<TLocator extends PlaywrightLocator>(
    page: PlaywrightPage<TLocator>,
    originalSelector: string,
    options: SelfHealingOptions = {}
  ): Promise<TLocator | null> {
    const timeout = options.timeout ?? this.config.findTimeout;
    const context = options.context;

    // Security validation
    if (!this.isValidSelector(originalSelector)) {
      throw new Error('Invalid selector provided');
    }

    const existingLocator = await this.resolveStoredOrOriginal(page, originalSelector, timeout, context);
    if (existingLocator) {
      return existingLocator;
    }

    const allElements = await this.getAllPageElements(page, true);
    this.secureLog(`Found ${allElements.length} elements on page for analysis`);

    let bestMatch: SerializedElement | null = null;
    let bestScore = 0;
    let elementCount = 0;

    for (const element of allElements.slice(0, this.config.maxElementsToAnalyze)) {
      const score = await this.calculateComprehensiveSimilarity(originalSelector, element);

      if (this.config.debug && elementCount < 5) {
        const elementInfo = await this.getElementIdentifier(element);
        this.secureLog(`Element ${elementCount + 1}: "${elementInfo}" scored: ${score.toFixed(3)}`);
      }
      elementCount++;

      if (score > bestScore && score >= this.config.minSimilarityThreshold) {
        bestScore = score;
        bestMatch = element;
      }
    }

    this.secureLog(`Best match score: ${bestScore.toFixed(3)}, threshold: ${this.config.minSimilarityThreshold}`);

    if (bestMatch) {
      const healed = await this.lockHealedLocator(page, bestMatch, timeout);
      if (!healed) {
        return null;
      }

      await this.persistSelectorResolution(originalSelector, healed.selector, 'healed', context);
      this.secureLog(`Self-healing successful: "${originalSelector}" -> "${healed.selector}" (score: ${bestScore.toFixed(3)})`);
      return healed.locator;
    }

    return null;
  }

  /**
   * Simple self-healing method focused on speed
   * Uses basic string similarity for quick recovery
   */
  async findElementSimple<TLocator extends PlaywrightLocator>(
    page: PlaywrightPage<TLocator>,
    originalSelector: string,
    options: SelfHealingOptions = {}
  ): Promise<TLocator | null> {
    const timeout = options.timeout ?? this.config.findTimeout;
    const context = options.context;

    // Security validation
    if (!this.isValidSelector(originalSelector)) {
      throw new Error('Invalid selector provided');
    }

    const existingLocator = await this.resolveStoredOrOriginal(page, originalSelector, timeout, context);
    if (existingLocator) {
      return existingLocator;
    }

    const allElements = await this.getAllPageElements(page, true);

    for (const element of allElements.slice(0, this.config.maxElementsToAnalyze)) {
      const similarity = await this.calculateComprehensiveSimilarity(originalSelector, element);

      if (similarity >= this.config.minSimilarityThreshold) {
        const healed = await this.lockHealedLocator(page, element, timeout);
        if (!healed) {
          continue;
        }

        await this.persistSelectorResolution(originalSelector, healed.selector, 'healed', context);
        this.secureLog(`Simple self-healing: "${originalSelector}" -> "${healed.selector}" (score: ${similarity.toFixed(3)})`);
        return healed.locator;
      }
    }

    return null;
  }

  /**
   * @deprecated Same scoring as findElementUniversal, which it calls. Kept for API compatibility.
   */
  async findElementComplex<TLocator extends PlaywrightLocator>(
    page: PlaywrightPage<TLocator>,
    originalSelector: string,
    options: SelfHealingOptions = {}
  ): Promise<TLocator | null> {
    return this.findElementUniversal(page, originalSelector, options);
  }

  /**
   * @deprecated Same scoring as findElementUniversal, which it calls. Kept for API compatibility.
   */
  async findElementAdvanced<TLocator extends PlaywrightLocator>(
    page: PlaywrightPage<TLocator>,
    originalSelector: string,
    options: SelfHealingOptions = {}
  ): Promise<TLocator | null> {
    return this.findElementUniversal(page, originalSelector, options);
  }

  /**
   * Register a selector engine that heals inside the page: `page.locator('heal=#old-id')`.
   * Playwright re-runs it on every retry, so any action and any `expect` assertion work on it.
   * Call once before pages are created, e.g. in a worker fixture: `await ai.registerSelectorEngine(selectors)`.
   * The engine keeps the original selector while it matches, and heals only after it has been
   * missing for `healAfterMs`. It does not write the selector store.
   */
  async registerSelectorEngine(selectors: PlaywrightSelectors, name = 'heal'): Promise<void> {
    this.engineName = name;
    const {
      minSimilarityThreshold, maxElementsToAnalyze, levenshteinWeight, semanticWeight, structuralWeight, healAfterMs,
    } = this.config;
    await selectors.register(name, {
      content: healingEngineScript({
        minSimilarityThreshold, maxElementsToAnalyze, levenshteinWeight, semanticWeight, structuralWeight, healAfterMs,
      }),
    });
  }

  /**
   * Heal the selectors this page's tests already write, with no `heal=` prefix:
   * `page.locator('#old')`, `page.getByTestId('old')`, chained and frame locators.
   * Call per page after registerSelectorEngine(), e.g. in a `page` fixture override.
   * Left as Playwright resolves them: getByRole/Text/Label/Placeholder/AltText/Title, explicit engines
   * (`css=#id` opts a selector out), `>>` chains, Playwright-only CSS such as `:has-text()`, and the
   * older selector-taking methods (`page.click('#id')`, `page.$`, `waitForSelector`).
   */
  enableAutoHealing(page: AutoHealPage): void {
    if (!this.engineName) {
      throw new Error('Call registerSelectorEngine() before enableAutoHealing()');
    }
    installAutoHealing(page);
    autoHealEngines.set(page, this.engineName);
  }

  /**
   * Try the element's locators in priority order (test id, getBy*, CSS, XPath) and keep the first
   * one Playwright resolves to a single element.
   */
  private async lockHealedLocator<TLocator extends PlaywrightLocator>(
    page: PlaywrightPage<TLocator>,
    element: SerializedElement,
    timeout: number
  ): Promise<{ locator: TLocator; selector: string } | null> {
    const candidates = element.selectors?.length ? element.selectors : [this.generateOptimalSelector(element)];
    // The element is on the page right now, so a candidate that does not resolve quickly is wrong.
    const candidateTimeout = Math.min(timeout, 1000);
    // The positional XPath points at exactly the scored element; every other candidate must agree with it.
    const anchor = candidates.find(candidate => /^xpath=\/[^/]/.test(candidate))?.slice('xpath='.length);

    for (const selector of candidates) {
      const locator = await this.tryLocator(page, selector, candidateTimeout);
      if (locator && await this.isSameElement(locator, anchor)) {
        return { locator, selector };
      }
    }
    return null;
  }

  /**
   * Whether the locator resolves to the element the XPath points at. True when it cannot be checked:
   * no anchor (an element in shadow DOM) or a locator without evaluate (a test double).
   */
  private async isSameElement(locator: PlaywrightLocator, anchorXPath: string | undefined): Promise<boolean> {
    const { evaluate } = locator as unknown as {
      evaluate?: (fn: (el: Element, xpath: string) => boolean, xpath: string) => Promise<boolean>;
    };
    if (!anchorXPath || typeof evaluate !== 'function') {
      return true;
    }

    try {
      return await evaluate.call(locator, (el, xpath) => el.ownerDocument.evaluate(
        xpath, el.ownerDocument, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
      ).singleNodeValue === el, anchorXPath);
    } catch {
      return false;
    }
  }

  /**
   * Get all elements from page with caching
   */
  private async getAllPageElements<TLocator extends PlaywrightLocator>(
    page: PlaywrightPage<TLocator>,
    forceRefresh = false
  ): Promise<SerializedElement[]> {
    const now = Date.now();
    const cached = this.domCache.get(page);

    if (!forceRefresh && cached && (now - cached.timestamp) < this.config.domCacheTTL) {
      return cached.elements;
    }

    const elements = await page.evaluate<SerializedElement[]>(collectElementsScript(this.config.maxElementsToAnalyze));

    this.domCache.set(page, { elements, timestamp: now });
    return elements;
  }

  /**
   * Score how well an element matches what the selector identified it by.
   * Each value in the selector (`#id`, `.class`, `[attr="v"]`, text, a bare word) is compared with
   * the element's value of the same attribute: characters (levenshteinWeight) and words (semanticWeight).
   * structuralWeight rewards the same tag or role, and only counts when the selector names a tag.
   */
  private async calculateComprehensiveSimilarity(
    originalSelector: string,
    element: SerializedElement
  ): Promise<number> {
    const cacheKey = `${originalSelector}\u0000${JSON.stringify(element)}`;
    const cached = this.similarityCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const clampedScore = scoreElement(originalSelector, element, this.config);
    if (this.config.debug && clampedScore > 0.3) {
      this.secureLog(`Score ${clampedScore.toFixed(3)} for ${element.selectors?.[0] ?? element.tagName}`);
    }

    this.similarityCache.set(cacheKey, clampedScore);
    return clampedScore;
  }

  /**
   * Get element identifier for comparison
   */
  private debugElementCount = 0;

  private async getElementIdentifier(element: SerializedElement): Promise<string> {
    try {
      const showDebug = this.config.debug && this.debugElementCount < 3;
      this.debugElementCount++;

      if (showDebug) {
        console.log('Getting identifier for element:', element);
      }

      const id = element.id || '';
      const className = element.className || '';
      const tagName = element.tagName?.toLowerCase() || 'div';
      const textContent = element.textContent?.trim().substring(0, 50) || '';
      const placeholder = element.placeholder || '';
      const name = element.name || '';
      const type = element.type || '';
      const role = element.role || '';
      const ariaLabel = element.ariaLabel || '';

      if (showDebug) {
        console.log(`Element details: tag=${tagName}, id=${id}, name=${name}, type=${type}, placeholder=${placeholder}`);
      }

      // Build a comprehensive identifier
      const parts = [];
      if (id) parts.push(`id:${id}`);
      if (className && typeof className === 'string') parts.push(`class:${className.split(' ')[0]}`); // First class only
      if (name) parts.push(`name:${name}`);
      if (type) parts.push(`type:${type}`);
      if (placeholder) parts.push(`placeholder:${placeholder}`);
      if (role) parts.push(`role:${role}`);
      if (ariaLabel) parts.push(`aria:${ariaLabel}`);
      if (textContent) parts.push(`text:${textContent}`);

      const identifier = parts.length > 0 ? `${tagName}[${parts.join(',')}]` : tagName;

      if (showDebug) {
        console.log(`Final identifier: ${identifier}`);
      }

      return identifier;
    } catch (error) {
      if (this.config.debug) {
        console.warn('Error getting element identifier:', error);
      }
      return 'element';
    }
  }

  /**
   * Generate optimal selector for found element
   */
  private generateOptimalSelector(element: SerializedElement): string {
    try {
      // Generate selector based on SerializedElement properties
      if (element.id) return `#${element.id}`;

      // For links, prefer text-based selectors
      if (element.tagName === 'a' && element.textContent) {
        const cleanText = element.textContent.trim();
        if (cleanText.length > 0 && cleanText.length < 50) {
          return `text=${cleanText}`;
        }
      }

      // For inputs, prefer name attribute
      if (element.name) {
        return `[name="${element.name}"]`;
      }

      // Combine tag name with unique attributes
      if (element.type && element.tagName === 'input') {
        return `input[type="${element.type}"]`;
      }

      if (element.placeholder) {
        return `[placeholder="${element.placeholder}"]`;
      }

      if (element.role) {
        return `[role="${element.role}"]`;
      }

      if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ').filter(c => c && !c.includes(' '));
        if (classes.length > 0) {
          // Try to make more specific by combining with tag name
          return `${element.tagName}.${classes[0]}`;
        }
      }

      // Fallback to tag name
      return element.tagName || 'div';
    } catch (error) {
      if (this.config.debug) {
        console.warn('Error generating optimal selector:', error);
      }
      return 'div';
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SelfHealingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validateConfig();
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.similarityCache.clear();
    // Note: WeakMap cannot be cleared, but it will be garbage collected
  }
}

/**
 * The parts of a Playwright Page that auto-healing needs
 */
export interface AutoHealPage {
  locator(selector: string): object;
  mainFrame(): object;
  frameLocator(selector: string): object;
}

/** Pages with auto-healing on, and the engine name each uses */
const autoHealEngines = new WeakMap<object, string>();
const AUTO_HEAL_PATCHED = Symbol.for('playwright-ai-self-healing.auto-heal');

/**
 * Prefix a selector the test wrote with the healing engine, or leave it for Playwright.
 * getByTestId compiles to `internal:testid=[attr="value"s]`, which becomes the same CSS attribute match.
 */
export function toHealingSelector(selector: string, engine = 'heal'): string {
  const trimmed = selector.trim();
  const testId = trimmed.match(/^internal:testid=\[([\w-]+)=("(?:[^"\\]|\\.)*")s?\]$/);
  if (testId) {
    return `${engine}=[${testId[1]}=${testId[2]}]`;
  }

  const playwrightOnly =
    /^[a-z][\w:-]*=/i.test(trimmed) || // explicit engine: css=, xpath=, text=, internal:role=, heal=
    /^["']/.test(trimmed) || // legacy quoted text selector
    trimmed.includes('>>') ||
    /:(has-text|text|text-is|text-matches|visible|nth-match|light|right-of|left-of|above|below|near)\b/.test(trimmed);
  return playwrightOnly ? selector : `${engine}=${trimmed}`;
}

/**
 * Wrap `locator()` of Playwright's Frame, Locator and FrameLocator classes once per process.
 * Page.locator, every getBy* method and chained locators all go through these three.
 * The wrapper changes selectors only for pages registered in autoHealEngines.
 */
// ponytail: patches Playwright's client prototypes, the only seam that catches every locator.
// Checked against Playwright 1.55; an upgrade that stops routing getBy* through locator() breaks it.
function installAutoHealing(page: AutoHealPage): void {
  const prototypes = [page.mainFrame(), page.locator('html'), page.frameLocator('html')]
    .map(instance => Object.getPrototypeOf(instance) as Record<string | symbol, unknown>);

  for (const prototype of prototypes) {
    if (prototype[AUTO_HEAL_PATCHED]) {
      continue;
    }
    const original = prototype.locator as (this: unknown, selector: unknown, options?: unknown) => unknown;
    prototype.locator = function (this: unknown, selector: unknown, options?: unknown) {
      const engine = typeof selector === 'string' ? autoHealEngines.get(ownerPage(this) ?? {}) : undefined;
      return original.call(this, engine ? toHealingSelector(selector as string, engine) : selector, options);
    };
    prototype[AUTO_HEAL_PATCHED] = true;
  }
}

/**
 * The page a Frame or Locator (`page()`) or a FrameLocator (`owner().page()`) belongs to
 */
function ownerPage(target: unknown): object | undefined {
  const candidate = target as { page?: () => object; owner?: () => { page(): object } };
  try {
    return candidate.page?.() ?? candidate.owner?.().page();
  } catch {
    return undefined;
  }
}

/**
 * Create a new instance of PlaywrightAISelfHealing
 */
export function createSelfHealing(config?: Partial<SelfHealingConfig>): PlaywrightAISelfHealing {
  return new PlaywrightAISelfHealing(config);
}

/**
 * Create a self-healing instance with project-friendly defaults.
 * Project runs default to read-write persistence in `playwright/.healed-selectors.json`.
 * CI can use the same file, as long as the pipeline restores/saves it between runs.
 */
export function createProjectSelfHealing(
  config: Partial<SelfHealingConfig> = {},
  options: ProjectSelfHealingOptions = {}
): PlaywrightAISelfHealing {
  const env = options.env ?? (typeof process !== 'undefined' ? process.env : {});
  const selectorStorePath = options.selectorStorePath
    ?? env[SELECTOR_STORE_PATH_ENV]
    ?? DEFAULT_SELECTOR_STORE_PATH;

  const selectorStoreMode = options.selectorStoreMode
    ?? (env[SELECTOR_STORE_MODE_ENV] as ProjectSelectorStoreMode | undefined)
    ?? 'read-write';

  let selectorStore: SelectorStore | undefined;
  if (selectorStoreMode === 'read') {
    selectorStore = new ReadOnlySelectorStore(new JsonFileSelectorStore(selectorStorePath));
  } else if (selectorStoreMode === 'read-write') {
    selectorStore = new JsonFileSelectorStore(selectorStorePath);
  }

  return new PlaywrightAISelfHealing({
    ...config,
    selectorStore,
  });
}

/**
 * Default export for convenience
 */
export default PlaywrightAISelfHealing;
