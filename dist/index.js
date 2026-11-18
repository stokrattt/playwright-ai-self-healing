"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaywrightAISelfHealing = exports.DEFAULT_CONFIG = exports.SELECTOR_STORE_MODE_ENV = exports.SELECTOR_STORE_PATH_ENV = exports.DEFAULT_SELECTOR_STORE_PATH = exports.ReadOnlySelectorStore = exports.JsonFileSelectorStore = exports.MemorySelectorStore = void 0;
exports.toHealingSelector = toHealingSelector;
exports.createSelfHealing = createSelfHealing;
exports.createProjectSelfHealing = createProjectSelfHealing;
const page_scripts_1 = require("./page-scripts");
const selector_store_1 = require("./selector-store");
Object.defineProperty(exports, "MemorySelectorStore", { enumerable: true, get: function () { return selector_store_1.MemorySelectorStore; } });
Object.defineProperty(exports, "JsonFileSelectorStore", { enumerable: true, get: function () { return selector_store_1.JsonFileSelectorStore; } });
Object.defineProperty(exports, "ReadOnlySelectorStore", { enumerable: true, get: function () { return selector_store_1.ReadOnlySelectorStore; } });
exports.DEFAULT_SELECTOR_STORE_PATH = 'playwright/.healed-selectors.json';
exports.SELECTOR_STORE_PATH_ENV = 'PLAYWRIGHT_AI_SELF_HEALING_STORE_PATH';
exports.SELECTOR_STORE_MODE_ENV = 'PLAYWRIGHT_AI_SELF_HEALING_STORE_MODE';
/**
 * Default configuration optimized for performance
 */
exports.DEFAULT_CONFIG = {
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
 * AI Self-Healing Locator Library
 * Provides intelligent locator recovery using multiple similarity algorithms
 */
class PlaywrightAISelfHealing {
    constructor(config = {}) {
        this.domCache = new WeakMap();
        this.similarityCache = new Map();
        /**
         * Get element identifier for comparison
         */
        this.debugElementCount = 0;
        this.config = { ...exports.DEFAULT_CONFIG, ...config };
        // Security validation
        this.validateConfig();
    }
    /**
     * Validate configuration for security and correctness
     */
    validateConfig() {
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
    isValidSelector(selector) {
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
    secureLog(message) {
        if (this.config.debug) {
            console.log(`[PlaywrightAISelfHealing] ${message}`);
        }
    }
    /**
     * Try resolving a selector into a usable locator
     */
    async tryLocator(page, selector, timeout) {
        try {
            const locator = page.locator(selector);
            // 'attached': a hidden element still exists, and assertions like toBeHidden need it as is.
            await locator.waitFor({ timeout, state: 'attached' });
            return locator;
        }
        catch {
            return null;
        }
    }
    /**
     * Try a stored selector override and then fall back to the original selector
     */
    async resolveStoredOrOriginal(page, originalSelector, timeout, context) {
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
    async persistSelectorResolution(originalSelector, healedSelector, source, context) {
        if (!this.config.selectorStore) {
            return;
        }
        const mergedContext = {
            ...this.config.selectorContext,
            ...context,
        };
        const observedAt = new Date().toISOString();
        const record = {
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
    async findElementUniversal(page, originalSelector, options = {}) {
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
        let bestMatch = null;
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
    async findElementSimple(page, originalSelector, options = {}) {
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
    async findElementComplex(page, originalSelector, options = {}) {
        return this.findElementUniversal(page, originalSelector, options);
    }
    /**
     * @deprecated Same scoring as findElementUniversal, which it calls. Kept for API compatibility.
     */
    async findElementAdvanced(page, originalSelector, options = {}) {
        return this.findElementUniversal(page, originalSelector, options);
    }
    /**
     * Register a selector engine that heals inside the page: `page.locator('heal=#old-id')`.
     * Playwright re-runs it on every retry, so any action and any `expect` assertion work on it.
     * Call once before pages are created, e.g. in a worker fixture: `await ai.registerSelectorEngine(selectors)`.
     * The engine keeps the original selector while it matches, and heals only after it has been
     * missing for `healAfterMs`. It does not write the selector store.
     */
    async registerSelectorEngine(selectors, name = 'heal') {
        this.engineName = name;
        const { minSimilarityThreshold, maxElementsToAnalyze, levenshteinWeight, semanticWeight, structuralWeight, healAfterMs, } = this.config;
        await selectors.register(name, {
            content: (0, page_scripts_1.healingEngineScript)({
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
    enableAutoHealing(page) {
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
    async lockHealedLocator(page, element, timeout) {
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
    async isSameElement(locator, anchorXPath) {
        const { evaluate } = locator;
        if (!anchorXPath || typeof evaluate !== 'function') {
            return true;
        }
        try {
            return await evaluate.call(locator, (el, xpath) => el.ownerDocument.evaluate(xpath, el.ownerDocument, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue === el, anchorXPath);
        }
        catch {
            return false;
        }
    }
    /**
     * Get all elements from page with caching
     */
    async getAllPageElements(page, forceRefresh = false) {
        const now = Date.now();
        const cached = this.domCache.get(page);
        if (!forceRefresh && cached && (now - cached.timestamp) < this.config.domCacheTTL) {
            return cached.elements;
        }
        const elements = await page.evaluate((0, page_scripts_1.collectElementsScript)(this.config.maxElementsToAnalyze));
        this.domCache.set(page, { elements, timestamp: now });
        return elements;
    }
    /**
     * Score how well an element matches what the selector identified it by.
     * Each value in the selector (`#id`, `.class`, `[attr="v"]`, text, a bare word) is compared with
     * the element's value of the same attribute: characters (levenshteinWeight) and words (semanticWeight).
     * structuralWeight rewards the same tag or role, and only counts when the selector names a tag.
     */
    async calculateComprehensiveSimilarity(originalSelector, element) {
        const cacheKey = `${originalSelector}\u0000${JSON.stringify(element)}`;
        const cached = this.similarityCache.get(cacheKey);
        if (cached !== undefined) {
            return cached;
        }
        const clampedScore = (0, page_scripts_1.scoreElement)(originalSelector, element, this.config);
        if (this.config.debug && clampedScore > 0.3) {
            this.secureLog(`Score ${clampedScore.toFixed(3)} for ${element.selectors?.[0] ?? element.tagName}`);
        }
        this.similarityCache.set(cacheKey, clampedScore);
        return clampedScore;
    }
    async getElementIdentifier(element) {
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
            if (id)
                parts.push(`id:${id}`);
            if (className && typeof className === 'string')
                parts.push(`class:${className.split(' ')[0]}`); // First class only
            if (name)
                parts.push(`name:${name}`);
            if (type)
                parts.push(`type:${type}`);
            if (placeholder)
                parts.push(`placeholder:${placeholder}`);
            if (role)
                parts.push(`role:${role}`);
            if (ariaLabel)
                parts.push(`aria:${ariaLabel}`);
            if (textContent)
                parts.push(`text:${textContent}`);
            const identifier = parts.length > 0 ? `${tagName}[${parts.join(',')}]` : tagName;
            if (showDebug) {
                console.log(`Final identifier: ${identifier}`);
            }
            return identifier;
        }
        catch (error) {
            if (this.config.debug) {
                console.warn('Error getting element identifier:', error);
            }
            return 'element';
        }
    }
    /**
     * Generate optimal selector for found element
     */
    generateOptimalSelector(element) {
        try {
            // Generate selector based on SerializedElement properties
            if (element.id)
                return `#${element.id}`;
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
        }
        catch (error) {
            if (this.config.debug) {
                console.warn('Error generating optimal selector:', error);
            }
            return 'div';
        }
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.validateConfig();
    }
    /**
     * Clear all caches
     */
    clearCache() {
        this.similarityCache.clear();
        // Note: WeakMap cannot be cleared, but it will be garbage collected
    }
}
exports.PlaywrightAISelfHealing = PlaywrightAISelfHealing;
/** Pages with auto-healing on, and the engine name each uses */
const autoHealEngines = new WeakMap();
const AUTO_HEAL_PATCHED = Symbol.for('playwright-ai-self-healing.auto-heal');
/**
 * Prefix a selector the test wrote with the healing engine, or leave it for Playwright.
 * getByTestId compiles to `internal:testid=[attr="value"s]`, which becomes the same CSS attribute match.
 */
function toHealingSelector(selector, engine = 'heal') {
    const trimmed = selector.trim();
    const testId = trimmed.match(/^internal:testid=\[([\w-]+)=("(?:[^"\\]|\\.)*")s?\]$/);
    if (testId) {
        return `${engine}=[${testId[1]}=${testId[2]}]`;
    }
    const playwrightOnly = /^[a-z][\w:-]*=/i.test(trimmed) || // explicit engine: css=, xpath=, text=, internal:role=, heal=
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
function installAutoHealing(page) {
    const prototypes = [page.mainFrame(), page.locator('html'), page.frameLocator('html')]
        .map(instance => Object.getPrototypeOf(instance));
    for (const prototype of prototypes) {
        if (prototype[AUTO_HEAL_PATCHED]) {
            continue;
        }
        const original = prototype.locator;
        prototype.locator = function (selector, options) {
            const engine = typeof selector === 'string' ? autoHealEngines.get(ownerPage(this) ?? {}) : undefined;
            return original.call(this, engine ? toHealingSelector(selector, engine) : selector, options);
        };
        prototype[AUTO_HEAL_PATCHED] = true;
    }
}
/**
 * The page a Frame or Locator (`page()`) or a FrameLocator (`owner().page()`) belongs to
 */
function ownerPage(target) {
    const candidate = target;
    try {
        return candidate.page?.() ?? candidate.owner?.().page();
    }
    catch {
        return undefined;
    }
}
/**
 * Create a new instance of PlaywrightAISelfHealing
 */
function createSelfHealing(config) {
    return new PlaywrightAISelfHealing(config);
}
/**
 * Create a self-healing instance with project-friendly defaults.
 * Project runs default to read-write persistence in `playwright/.healed-selectors.json`.
 * CI can use the same file, as long as the pipeline restores/saves it between runs.
 */
function createProjectSelfHealing(config = {}, options = {}) {
    const env = options.env ?? (typeof process !== 'undefined' ? process.env : {});
    const selectorStorePath = options.selectorStorePath
        ?? env[exports.SELECTOR_STORE_PATH_ENV]
        ?? exports.DEFAULT_SELECTOR_STORE_PATH;
    const selectorStoreMode = options.selectorStoreMode
        ?? env[exports.SELECTOR_STORE_MODE_ENV]
        ?? 'read-write';
    let selectorStore;
    if (selectorStoreMode === 'read') {
        selectorStore = new selector_store_1.ReadOnlySelectorStore(new selector_store_1.JsonFileSelectorStore(selectorStorePath));
    }
    else if (selectorStoreMode === 'read-write') {
        selectorStore = new selector_store_1.JsonFileSelectorStore(selectorStorePath);
    }
    return new PlaywrightAISelfHealing({
        ...config,
        selectorStore,
    });
}
/**
 * Default export for convenience
 */
exports.default = PlaywrightAISelfHealing;
//# sourceMappingURL=index.js.map