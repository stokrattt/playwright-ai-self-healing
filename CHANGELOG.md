# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
