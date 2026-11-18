/**
 * Functions that run both in Node and inside the browser page.
 * They are shipped to the page as source text (see PAGE_FUNCTIONS), so each one may call only
 * the others in this file and must not use imports or module-level values.
 */
import type { SerializedElement } from './types';
export interface ScoreWeights {
    levenshteinWeight: number;
    semanticWeight: number;
    structuralWeight: number;
}
export interface HealingEngineOptions extends ScoreWeights {
    minSimilarityThreshold: number;
    maxElementsToAnalyze: number;
    healAfterMs: number;
}
interface SelectorToken {
    attr: string;
    value: string;
}
/**
 * Plain Levenshtein similarity in [0, 1]
 */
export declare function levenshteinRatio(str1: string, str2: string): number;
/**
 * Dice coefficient over words: `save-button` vs `save-button-v2` share two of five words, 0.8.
 */
export declare function wordOverlap(a: string, b: string): number;
/**
 * Pull the values a selector identifies an element by: CSS, XPath, Playwright `role=` / `text=`
 * / `internal:*` (what getBy* locators compile to), or a bare word such as `save-button`.
 * `attr: 'any'` is compared with every identifying attribute.
 */
export declare function parseSelector(selector: string): {
    tag: string;
    tokens: SelectorToken[];
};
export declare function elementValues(element: SerializedElement): Record<string, string[]>;
/**
 * Score how well an element matches what the selector identified it by.
 * Each selector value is compared with the element's value of the same attribute: characters
 * (levenshteinWeight) and words (semanticWeight), and with its other identifying values at a discount
 * (a data-testid renamed into an id, a readable id replaced by a generated one). structuralWeight rewards the same
 * tag or role and only counts when the selector names a tag.
 */
export declare function scoreElement(selector: string, element: SerializedElement, weights: ScoreWeights): number;
/**
 * Explicit role, or the implicit one for the elements Playwright's getByRole is usually used on.
 */
export declare function implicitRole(el: Element): string;
/**
 * What getByLabel matches: aria-labelledby, aria-label, or a <label>.
 */
export declare function labelText(el: Element): string;
export declare function accessibleName(el: Element): string;
export declare function serializeElement(el: Element): SerializedElement;
/**
 * querySelectorAll that also enters open shadow roots, as Playwright's CSS engine does.
 */
export declare function deepQueryAll(root: Document | Element | ShadowRoot, selector: string): Element[];
/**
 * Elements worth scoring, best first: visible before hidden, interactive before the rest.
 * Hidden elements stay in, so assertions such as toBeHidden or toHaveValue on a hidden input can heal.
 */
export declare function collectCandidates(root: Document | Element, limit: number): Element[];
/**
 * How many elements in the document share each role and accessible name.
 * A getByRole candidate is used only when its pair is unique.
 */
export declare function countRoles(doc: Document): Record<string, number>;
/**
 * Locators for one element, in the order to try them: test id, Playwright's getBy* locators
 * (in the order Playwright's docs recommend), CSS, XPath. Each one is checked to match only this
 * element where the page can check it; the caller still verifies it through Playwright.
 */
export declare function selectorCandidates(el: Element, roleCounts: Record<string, number>): string[];
/**
 * Elements the original selector still matches inside `root`: CSS (entering open shadow roots) or XPath.
 * A selector that is neither (a Playwright-only selector, a bare word) matches nothing.
 */
export declare function matchOriginal(root: Document | Element, selector: string): Element[];
/**
 * The best-scoring element above the threshold, plus its look-alike siblings (same tag and class,
 * same score), so a renamed list still has all its items.
 */
export declare function healBest(root: Document | Element, selector: string, options: HealingEngineOptions): Element[];
/**
 * Page expression that returns the serialized candidates with their locator candidates.
 */
export declare function collectElementsScript(limit: number): string;
/**
 * Source of the selector engine registered with `selectors.register()`.
 */
export declare function healingEngineScript(options: HealingEngineOptions): string;
export {};
