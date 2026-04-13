/**
 * Type definitions for Playwright integration
 * These types will be satisfied by the actual Playwright library when used as a peer dependency
 */
import type { SelectorContext } from './selector-store';
export interface PlaywrightPage<TLocator extends PlaywrightLocator = PlaywrightLocator> {
    locator(selector: string): TLocator;
    evaluate<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T>;
}
export interface PlaywrightLocator {
    waitFor(options?: {
        timeout?: number;
        state?: 'attached' | 'detached' | 'visible' | 'hidden';
    }): Promise<void>;
    fill(value: string): Promise<void>;
    click(): Promise<void>;
    textContent(): Promise<string | null>;
}
/**
 * Serialized element data from page.evaluate
 */
export interface SerializedElement {
    tagName: string;
    id: string;
    className: string;
    textContent: string;
    placeholder: string;
    name: string;
    type: string;
    role: string;
    ariaLabel: string;
    title: string;
    value: string;
    href: string;
    src: string;
    alt: string;
    _element?: Element;
}
/**
 * Self-healing method options
 */
export interface SelfHealingOptions {
    /** Timeout for finding elements in milliseconds */
    timeout?: number;
    /** Enable debug logging (security consideration: disable in production) */
    debug?: boolean;
    /** Optional metadata that will be saved alongside learned selectors */
    context?: SelectorContext;
}
/**
 * Element match result
 */
export interface ElementMatch {
    element: SerializedElement;
    score: number;
    selector: string;
    method: string;
}
