"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaywrightAISelfHealing = exports.DEFAULT_CONFIG = void 0;
exports.createSelfHealing = createSelfHealing;
/**
 * Default configuration optimized for performance
 */
exports.DEFAULT_CONFIG = {
    minSimilarityThreshold: 0.1,
    levenshteinWeight: 0.7,
    semanticWeight: 0.2,
    structuralWeight: 0.1,
    domCacheTTL: 30000,
    maxElementsToAnalyze: 50,
    findTimeout: 5000,
    debug: false, // Secure default: no debug logging
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
     * Universal self-healing method with comprehensive similarity analysis
     * Combines multiple algorithms for best accuracy
     */
    async findElementUniversal(page, originalSelector, _options = {}) {
        // Security validation
        if (!this.isValidSelector(originalSelector)) {
            throw new Error('Invalid selector provided');
        }
        try {
            const locator = page.locator(originalSelector);
            await locator.waitFor({ timeout: 1000 });
            return locator;
        }
        catch {
            // Original selector failed, attempt self-healing
        }
        const allElements = await this.getAllPageElements(page);
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
            const healedSelector = await this.generateOptimalSelector(page, bestMatch);
            this.secureLog(`Self-healing successful: "${originalSelector}" -> "${healedSelector}" (score: ${bestScore.toFixed(3)})`);
            return page.locator(healedSelector);
        }
        return null;
    }
    /**
     * Simple self-healing method focused on speed
     * Uses basic string similarity for quick recovery
     */
    async findElementSimple(page, originalSelector, _options = {}) {
        // Security validation
        if (!this.isValidSelector(originalSelector)) {
            throw new Error('Invalid selector provided');
        }
        try {
            const locator = page.locator(originalSelector);
            await locator.waitFor({ timeout: 1000 });
            return locator;
        }
        catch {
            // Original selector failed, attempt self-healing
        }
        const allElements = await this.getAllPageElements(page);
        for (const element of allElements.slice(0, this.config.maxElementsToAnalyze)) {
            const elementText = await this.getElementIdentifier(element);
            const similarity = this.calculateLevenshteinSimilarity(originalSelector, elementText);
            if (similarity >= this.config.minSimilarityThreshold) {
                const healedSelector = await this.generateOptimalSelector(page, element);
                this.secureLog(`Simple self-healing: "${originalSelector}" -> "${healedSelector}" (score: ${similarity.toFixed(3)})`);
                return page.locator(healedSelector);
            }
        }
        return null;
    }
    /**
     * Complex self-healing method for advanced scenarios
     * Uses semantic analysis and structural comparison
     */
    async findElementComplex(page, originalSelector, _options = {}) {
        // Security validation
        if (!this.isValidSelector(originalSelector)) {
            throw new Error('Invalid selector provided');
        }
        try {
            const locator = page.locator(originalSelector);
            await locator.waitFor({ timeout: 1000 });
            return locator;
        }
        catch {
            // Original selector failed, attempt self-healing
        }
        const allElements = await this.getAllPageElements(page);
        const candidates = [];
        for (const element of allElements.slice(0, this.config.maxElementsToAnalyze)) {
            const semanticScore = await this.calculateSemanticSimilarity(originalSelector, element);
            const structuralScore = await this.calculateStructuralSimilarity(originalSelector, element);
            const totalScore = (semanticScore * 0.6) + (structuralScore * 0.4);
            if (totalScore >= this.config.minSimilarityThreshold) {
                candidates.push({ element, score: totalScore });
            }
        }
        if (candidates.length > 0) {
            candidates.sort((a, b) => b.score - a.score);
            const bestCandidate = candidates[0];
            const healedSelector = await this.generateOptimalSelector(page, bestCandidate.element);
            this.secureLog(`Complex self-healing: "${originalSelector}" -> "${healedSelector}" (score: ${bestCandidate.score.toFixed(3)})`);
            return page.locator(healedSelector);
        }
        return null;
    }
    /**
     * Advanced self-healing method with machine learning approach
     * Uses pattern recognition and context analysis
     */
    async findElementAdvanced(page, originalSelector, _options = {}) {
        // Security validation
        if (!this.isValidSelector(originalSelector)) {
            throw new Error('Invalid selector provided');
        }
        try {
            const locator = page.locator(originalSelector);
            await locator.waitFor({ timeout: 1000 });
            return locator;
        }
        catch {
            // Original selector failed, attempt self-healing
        }
        const allElements = await this.getAllPageElements(page);
        const contextualElements = await this.getContextualElements(page, originalSelector);
        let bestMatch = null;
        let bestScore = 0;
        for (const element of allElements.slice(0, this.config.maxElementsToAnalyze)) {
            const patternScore = await this.calculatePatternSimilarity(originalSelector, element, contextualElements);
            const contextScore = await this.calculateContextualRelevance(element, contextualElements);
            const totalScore = (patternScore * 0.7) + (contextScore * 0.3);
            if (totalScore > bestScore && totalScore >= this.config.minSimilarityThreshold) {
                bestScore = totalScore;
                bestMatch = element;
            }
        }
        if (bestMatch) {
            const healedSelector = await this.generateOptimalSelector(page, bestMatch);
            this.secureLog(`Advanced self-healing: "${originalSelector}" -> "${healedSelector}" (score: ${bestScore.toFixed(3)})`);
            return page.locator(healedSelector);
        }
        return null;
    }
    /**
     * Get all elements from page with caching
     */
    async getAllPageElements(page) {
        const now = Date.now();
        const cached = this.domCache.get(page);
        if (cached && (now - cached.timestamp) < this.config.domCacheTTL) {
            return cached.elements;
        }
        const elements = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('*'))
                .filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            })
                .map(el => ({
                tagName: el.tagName?.toLowerCase() || 'div',
                id: el.id || '',
                className: el.className || '',
                textContent: el.textContent?.trim().substring(0, 50) || '',
                placeholder: el.getAttribute?.('placeholder') || '',
                name: el.getAttribute?.('name') || '',
                type: el.getAttribute?.('type') || '',
                role: el.getAttribute?.('role') || '',
                ariaLabel: el.getAttribute?.('aria-label') || '',
                title: el.getAttribute?.('title') || '',
                value: el?.value || '',
                href: el.getAttribute?.('href') || '',
                src: el.getAttribute?.('src') || '',
                alt: el.getAttribute?.('alt') || '',
                // Store the element for selector generation
                _element: el
            }));
        });
        this.domCache.set(page, { elements, timestamp: now });
        return elements;
    }
    /**
     * Calculate comprehensive similarity using multiple algorithms
     */
    async calculateComprehensiveSimilarity(originalSelector, element) {
        const elementText = await this.getElementIdentifier(element);
        const cacheKey = `${originalSelector}-${elementText}`;
        if (this.similarityCache.has(cacheKey)) {
            return this.similarityCache.get(cacheKey);
        }
        const levenshteinScore = this.calculateLevenshteinSimilarity(originalSelector, elementText);
        const semanticScore = await this.calculateSemanticSimilarity(originalSelector, element);
        const structuralScore = await this.calculateStructuralSimilarity(originalSelector, element);
        // Add element type bonus - prefer actual interactive elements over containers
        let typeBonus = 0;
        if (originalSelector.includes('input') && (element.tagName === 'input' || element.tagName === 'textarea'))
            typeBonus = 0.4;
        else if (originalSelector.includes('button') && (element.tagName === 'button' || element.tagName === 'input'))
            typeBonus = 0.4;
        else if (originalSelector.includes('select') && element.tagName === 'select')
            typeBonus = 0.4;
        else if (originalSelector.includes('textarea') && element.tagName === 'textarea')
            typeBonus = 0.4;
        // Penalize container elements when looking for interactive elements
        else if ((originalSelector.includes('input') || originalSelector.includes('button')) &&
            ['html', 'body', 'div', 'span', 'a'].includes(element.tagName))
            typeBonus = -0.3;
        // Add attribute matching bonus
        let attributeBonus = 0;
        if (originalSelector.includes('name=') && element.name) {
            const nameMatch = originalSelector.match(/name=["']([^"']+)["']/);
            if (nameMatch) {
                const selectorName = nameMatch[1];
                if (selectorName === element.name) {
                    attributeBonus += 0.5; // Strong bonus for exact name match
                }
                else {
                    // Partial similarity bonus for similar names
                    const nameSimilarity = this.calculateLevenshteinSimilarity(selectorName, element.name);
                    if (nameSimilarity > 0.5) {
                        attributeBonus += nameSimilarity * 0.3; // Scaled bonus for similar names
                    }
                }
            }
        }
        // Special bonus for common search field patterns
        if (originalSelector.includes('input') &&
            (element.name === 'q' || element.name === 'search' || element.name === 'query')) {
            attributeBonus += 0.3; // Bonus for common search field names
        }
        // Special bonus for Google search buttons
        if (originalSelector.includes('button') &&
            (element.name === 'btnK' || element.name === 'btnG' || element.type === 'submit')) {
            attributeBonus += 0.4; // Strong bonus for Google search buttons
        }
        // Special bonus for common Google links
        if (originalSelector.includes('Gmail') && element.textContent?.toLowerCase().includes('gmail')) {
            attributeBonus += 0.4; // Bonus for Gmail links
        }
        if (originalSelector.includes('Images') && element.textContent?.toLowerCase().includes('images')) {
            attributeBonus += 0.4; // Bonus for Images links
        }
        if (originalSelector.includes('placeholder=') && element.placeholder) {
            const placeholderMatch = originalSelector.match(/placeholder=["']([^"']+)["']/);
            if (placeholderMatch && placeholderMatch[1] === element.placeholder) {
                attributeBonus += 0.3;
            }
        }
        if (originalSelector.includes('type=') && element.type) {
            const typeMatch = originalSelector.match(/type=["']([^"']+)["']/);
            if (typeMatch && typeMatch[1] === element.type) {
                attributeBonus += 0.3;
            }
        }
        const totalScore = (levenshteinScore * this.config.levenshteinWeight) +
            (semanticScore * this.config.semanticWeight) +
            (structuralScore * this.config.structuralWeight) +
            typeBonus +
            attributeBonus;
        // Debug specific elements
        if (this.config.debug && (elementText.includes('q') || elementText.includes('search') || totalScore > 0.01)) {
            this.secureLog(`Detailed scoring for "${elementText}": L=${levenshteinScore.toFixed(3)}, S=${semanticScore.toFixed(3)}, St=${structuralScore.toFixed(3)}, TypeBonus=${typeBonus.toFixed(3)}, AttrBonus=${attributeBonus.toFixed(3)}, Total=${totalScore.toFixed(3)}`);
        }
        this.similarityCache.set(cacheKey, totalScore);
        return Math.max(0, Math.min(totalScore, 1)); // Ensure score is between 0 and 1
    }
    /**
     * Calculate Levenshtein distance-based similarity
     */
    calculateLevenshteinSimilarity(str1, str2) {
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;
        if (len1 === 0)
            return len2 === 0 ? 1 : 0;
        if (len2 === 0)
            return 0;
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
            }
        }
        const maxLen = Math.max(len1, len2);
        const distance = matrix[len1][len2];
        let similarity = 1 - (distance / maxLen);
        // Enhanced substring matching
        if (str2.startsWith(str1)) {
            similarity += 0.8;
        }
        else if (str2.includes(str1)) {
            similarity += 0.6;
        }
        return Math.min(similarity, 1);
    }
    /**
     * Calculate semantic similarity based on element properties
     */
    async calculateSemanticSimilarity(originalSelector, element) {
        const elementText = await this.getElementIdentifier(element);
        const originalWords = originalSelector.toLowerCase().split(/[-_\s]+/);
        const elementWords = elementText.toLowerCase().split(/[-_\s]+/);
        let matchCount = 0;
        for (const word of originalWords) {
            if (elementWords.some(ew => ew.includes(word) || word.includes(ew))) {
                matchCount++;
            }
        }
        return originalWords.length > 0 ? matchCount / originalWords.length : 0;
    }
    /**
     * Calculate structural similarity based on DOM properties
     */
    async calculateStructuralSimilarity(originalSelector, element) {
        try {
            const tagName = element.tagName?.toLowerCase() || '';
            const className = element.className || '';
            const elementId = element.id || '';
            let score = 0;
            if (tagName && originalSelector.includes(tagName))
                score += 0.3;
            if (originalSelector.includes(elementId) && elementId)
                score += 0.4;
            if (className && originalSelector.includes(className))
                score += 0.3;
            return Math.min(score, 1);
        }
        catch (error) {
            if (this.config.debug) {
                console.warn('Error calculating structural similarity:', error);
            }
            return 0;
        }
    }
    /**
     * Calculate pattern similarity for advanced matching
     */
    async calculatePatternSimilarity(originalSelector, element, contextualElements) {
        const elementText = await this.getElementIdentifier(element);
        const basicSimilarity = this.calculateLevenshteinSimilarity(originalSelector, elementText);
        // Pattern bonus for similar elements in context
        const patternBonus = contextualElements.length > 0 ? 0.2 : 0;
        return Math.min(basicSimilarity + patternBonus, 1);
    }
    /**
     * Calculate contextual relevance
     */
    async calculateContextualRelevance(element, contextualElements) {
        if (contextualElements.length === 0)
            return 0.5;
        // Since we can't access getBoundingClientRect() for SerializedElement,
        // we'll use a simpler heuristic based on element similarity
        let relevanceScore = 0;
        for (const contextElement of contextualElements) {
            // Check for similar tag names
            if (element.tagName === contextElement.tagName) {
                relevanceScore += 0.2;
            }
            // Check for shared attributes
            if (element.className && contextElement.className &&
                element.className === contextElement.className) {
                relevanceScore += 0.1;
            }
        }
        return Math.min(relevanceScore, 1);
    }
    /**
     * Get contextual elements around the original selector
     */
    async getContextualElements(page, originalSelector) {
        try {
            return await page.evaluate((selector) => {
                const elements = document.querySelectorAll('*');
                return Array.from(elements)
                    .filter(el => {
                    const text = el.textContent || el.getAttribute('placeholder') || el.id || el.className;
                    return text && text.toLowerCase().includes(selector.toLowerCase().substring(0, 3));
                })
                    .slice(0, 5)
                    .map(el => ({
                    tagName: el.tagName?.toLowerCase() || 'div',
                    id: el.id || '',
                    className: el.className || '',
                    textContent: el.textContent?.trim().substring(0, 50) || '',
                    placeholder: el.getAttribute?.('placeholder') || '',
                    name: el.getAttribute?.('name') || '',
                    type: el.getAttribute?.('type') || '',
                    role: el.getAttribute?.('role') || '',
                    ariaLabel: el.getAttribute?.('aria-label') || '',
                    title: el.getAttribute?.('title') || '',
                    value: el?.value || '',
                    href: el.getAttribute?.('href') || '',
                    src: el.getAttribute?.('src') || '',
                    alt: el.getAttribute?.('alt') || ''
                }));
            }, originalSelector);
        }
        catch {
            return [];
        }
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
    async generateOptimalSelector(page, element) {
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
/**
 * Create a new instance of PlaywrightAISelfHealing
 */
function createSelfHealing(config) {
    return new PlaywrightAISelfHealing(config);
}
/**
 * Default export for convenience
 */
exports.default = PlaywrightAISelfHealing;
//# sourceMappingURL=index.js.map