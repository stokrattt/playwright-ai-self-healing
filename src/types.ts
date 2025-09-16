/**
 * Type definitions for Playwright integration
 * These types will be satisfied by the actual Playwright library when used as a peer dependency
 */

export interface PlaywrightPage {
  locator(selector: string): PlaywrightLocator;
  evaluate<T>(fn: () => T): Promise<T>;
  evaluate<T, A>(fn: (arg: A) => T, arg: A): Promise<T>;
  evaluate<T, A1, A2>(fn: (arg1: A1, arg2: A2) => T, arg1: A1, arg2: A2): Promise<T>;
}

export interface PlaywrightLocator {
  waitFor(options?: { timeout?: number }): Promise<void>;
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
  _element?: Element; // Only available during page.evaluate context
}

/**
 * Self-healing method options
 */
export interface SelfHealingOptions {
  /** Timeout for finding elements in milliseconds */
  timeout?: number;
  /** Enable debug logging (security consideration: disable in production) */
  debug?: boolean;
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
