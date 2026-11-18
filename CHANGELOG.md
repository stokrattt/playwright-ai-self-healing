# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-11-18

### Added
- `enableAutoHealing(page)`: `page.locator('#old')`, `getByTestId()`, chained and frame locators heal with no `heal=` prefix; `toHealingSelector()` shows how a selector is rewritten
- `registerSelectorEngine(selectors)` registers a `heal=` selector engine: `page.locator('heal=#old')` heals on every retry, so any action and any `expect` assertion works on a renamed element
- Healed locators follow a priority: test id, Playwright `getBy*` locators, CSS, XPath
- `healAfterMs` (default 1000): the `heal=` engine waits this long for the original selector before healing
- `heal=` and `findElement*` see elements inside open shadow roots
- Original selectors may be XPath (`//button[@id="x"]`, `xpath=...`) or Playwright selectors (`role=`, `internal:label=`, `text=`)

### Changed
- Development and tests use `@playwright/test` 1.65.1
- An original selector counts as working when it is attached, not only when it is visible
- Hidden elements are healing candidates, ranked after visible ones
- `SerializedElement._element` removed (a DOM node never survived serialization); `selectors` and `accessibleName` added
- Scoring compares each value in the selector (`#id`, `.class`, `[attr="v"]`, text, a bare word) with the element's value of the same attribute instead of comparing the whole selector string with an element summary
- Default `minSimilarityThreshold` raised from 0.1 to 0.4
- `findElementSimple` uses the same scoring and returns the first match above the threshold
- `findElementComplex` and `findElementAdvanced` are deprecated and call `findElementUniversal`
- Interactive and identifiable elements are analyzed first, so `maxElementsToAnalyze` no longer drops a target that sits late in the DOM
- A store write happens only when a healed or reset selector changes, not on every healthy lookup

### Fixed
- A word in the old selector that names the element's kind (`.toggle-checkbox`) pulled in a sibling control (`.toggle-all`); found on demo.playwright.dev/todomvc
- A hidden but existing element (a loader, a `type=hidden` input) was treated as missing and healed into another element
- A missing element healed into `<html>` or an unrelated element on the page
- The healed selector could match several elements and fail Playwright's strict mode
- Ids with special characters (`:r1:`) produced an invalid selector
- SVG elements broke class matching
- Parallel writes to `JsonFileSelectorStore` lost records; writes now go under a lock file and an atomic rename
- A cached similarity score was returned without clamping to 1
- Google-specific scoring bonuses (`btnK`, Gmail, Images, search field names) removed

## [1.0.2] - 2026-04-13

### Added
- Rich selector record metadata including `originalSelector`, `healedSelector`, `timesUsed`, `lastVerifiedAt`, `testFile`, `pageObject`, and `notes`
- Per-call and per-instance selector context support for making learned selector files reviewable by humans

### Changed
- `createProjectSelfHealing()` now defaults to read-write persistence in every environment, including CI
- Documentation now explains exactly where to integrate the library so selector files are written automatically
- CI guidance now covers committing, caching, or artifacting the learned selector file between runs

### Fixed
- Selector records now preserve enough context to understand which old locator maps to which new working locator

## [1.0.1] - 2026-04-13

### Added
- Project-friendly selector persistence with JSON-backed selector stores
- `createProjectSelfHealing()` helper with default project store path support
- Runtime smoke example covering healed click, fill/type, and visibility flows
- Regression tests for selector persistence, CI/project defaults, and stale DOM cache handling

### Changed
- Healed locators now preserve the concrete Playwright locator type for compatibility with `expect(locator).toBeVisible()`
- Selector lookup can reuse previously learned selectors before re-running similarity analysis
- Documentation now explains how to persist learned selectors locally and on CI

### Fixed
- Respected configured timeouts instead of using a hardcoded locator wait
- Refreshed cached DOM snapshots after page content changes on the same page instance
- Corrected README and integration examples to reflect the actual public API

## [1.0.0] - 2025-09-16

### Added
- Initial release of Playwright AI Self-Healing library
- AI-powered element detection using multiple similarity algorithms
- Support for Levenshtein distance, semantic analysis, and structural comparison
- Four self-healing methods: Universal, Simple, Complex, and Advanced
- TypeScript support with comprehensive type definitions
- Security features including input validation and secure logging
- Performance optimizations with configurable thresholds
- Comprehensive documentation and integration guide
- Zero external dependencies (except peer dependency on Playwright)

### Features
- **Intelligent Element Matching**: Advanced similarity scoring system
- **Self-Healing Selectors**: Automatically adapts to DOM changes
- **Multiple Algorithms**: Combines different similarity approaches
- **Performance Optimized**: Built-in caching and configurable limits
- **Production Ready**: Secure defaults and comprehensive error handling
- **Easy Integration**: Simple API for existing Playwright projects

### Supported Browsers
- Chromium
- Firefox
- WebKit (Safari)

### Minimum Requirements
- Node.js >= 16.0.0
- Playwright >= 1.30.0
