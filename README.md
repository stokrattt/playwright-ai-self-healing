# Playwright AI Self-Healing Locators

[![npm version](https://badge.fury.io/js/playwright-ai-self-healing.svg)](https://badge.fury.io/js/playwright-ai-self-healing)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16.0.0-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An intelligent library for Playwright that provides self-healing element locators using AI algorithms. When standard selectors fail due to DOM changes, this library automatically finds the most similar elements using advanced similarity algorithms.

## 🌟 Features

- **🧠 AI-Powered**: Advanced similarity algorithms combining Levenshtein distance, semantic analysis, and structural comparison
- **🔧 Self-Healing**: Automatically adapts to DOM changes without manual intervention
- **⚡ Performance**: Optimized with caching and configurable thresholds
- **🔒 Secure**: Built-in input validation and secure logging
- **📝 TypeScript**: Full TypeScript support with comprehensive type definitions
- **🌐 Cross-Browser**: Supports Chromium, Firefox, and WebKit
- **📦 Zero Dependencies**: No external dependencies except Playwright

- **Multiple Similarity Algorithms**: Combines Levenshtein distance, semantic analysis, and structural comparison
- **Performance Optimized**: Built-in caching and configurable thresholds for production use
- **Four Self-Healing Methods**: Universal, Simple, Complex, and Advanced approaches for different scenarios
- **Zero Dependencies**: Minimal footprint with Playwright as the only peer dependency
- **TypeScript Support**: Fully typed with comprehensive type definitions
- **Configurable**: Extensive configuration options for fine-tuning behavior
- **Security First**: Input validation, secure logging, and protection against common vulnerabilities
- **Production Ready**: Secure defaults and comprehensive testing including security tests

## 🚀 Quick Start

Install the library using npm:

```bash
npm install playwright-ai-self-healing
```

Basic usage:

```typescript
import { PlaywrightAISelfHealing } from 'playwright-ai-self-healing';

// Initialize with your page
const ai = new PlaywrightAISelfHealing(page);

// Find element with self-healing capabilities
const element = await ai.findElementUniversal('button[data-testid="submit"]');
await element?.click();
```

## 📦 Installation

Or using yarn:

```bash
yarn add playwright-ai-self-healing
```

## 🚀 Quick Integration in Your Project

📖 **For comprehensive integration examples and advanced usage, see [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)**

## 🎯 Complete Usage Example

Here's how someone would use your library after downloading it:

### Step 1: Install
```bash
npm install playwright-ai-self-healing
```

### Step 2: Create BasePage with AI
```typescript
// framework/core/BasePage.ts
import { Page } from '@playwright/test';
import { PlaywrightAISelfHealing } from 'playwright-ai-self-healing';

export class BasePage {
  protected page: Page;
  protected ai: PlaywrightAISelfHealing;

  constructor(page: Page) {
    this.page = page;
    this.ai = new PlaywrightAISelfHealing();
  }

  protected async findElementWithAI(selector: string, description?: string) {
    try {
      // Try normal selector first
      const element = this.page.locator(selector);
      await element.waitFor({ timeout: 3000 });
      return element;
    } catch (error) {
      console.log(`🔧 [AI] Selector failed: ${selector}`);
      
      // Use AI to find element
      const aiElement = await this.ai.findElementUniversal(this.page, selector, description);
      
      if (aiElement) {
        console.log(`✅ [AI] Element found!`);
        return aiElement;
      }
      
      throw new Error(`Element not found: ${selector}`);
    }
  }

  protected async clickWithAI(selector: string, description?: string) {
    const element = await this.findElementWithAI(selector, description);
    await element.click();
  }

  protected async fillWithAI(selector: string, value: string, description?: string) {
    const element = await this.findElementWithAI(selector, description);
    await element.fill(value);
  }
}
```

### Step 3: Create Page Objects
```typescript
// page-objects/LoginPage.ts
export class LoginPage extends BasePage {
  private readonly emailInput = '[data-testid="email-input"]';
  private readonly passwordInput = '[data-testid="password-input"]';
  private readonly loginButton = '[data-testid="login-button"]';

  async login(email: string, password: string) {
    // AI will find elements even if selectors change!
    await this.fillWithAI(this.emailInput, email, 'email input field');
    await this.fillWithAI(this.passwordInput, password, 'password input field');
    await this.clickWithAI(this.loginButton, 'login submit button');
  }
}
```

### Step 4: Use in Tests
```typescript
// tests/login.test.ts
test('login with AI self-healing', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await page.goto('/login');
  
  // Even if developers change selectors, AI will find them
  await loginPage.login('user@example.com', 'password123');
  
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
});
```

**Result**: Your tests become resilient to UI changes! 🎉
yarn add playwright-ai-self-healing
```

### Prerequisites

Make sure you have Playwright installed in your project:

```bash
npm install @playwright/test
```

## Quick Start

## Quick Start

### Step 1: Import the library

```typescript
import { createSelfHealing } from 'playwright-ai-self-healing';
import { test, expect } from '@playwright/test';
```

### Step 2: Create a self-healing instance

```typescript
const selfHealing = createSelfHealing();
```

### Step 3: Use in your Playwright tests

```typescript
test('Login with self-healing', async ({ page }) => {
  const selfHealing = createSelfHealing();
  
  await page.goto('https://example.com/login');
  
  // These selectors might change, but self-healing will find them
  const usernameField = await selfHealing.findElementUniversal(page, 'username-input');
  const passwordField = await selfHealing.findElementUniversal(page, 'password-input');
  const loginButton = await selfHealing.findElementUniversal(page, 'login-button');
  
  if (usernameField && passwordField && loginButton) {
    // Elements found successfully, continue with test
    console.log('All elements found with self-healing!');
    
    // Now you can interact with the elements
    await page.fill(await usernameField.locator, 'your-username');
    await page.fill(await passwordField.locator, 'your-password');
    await loginButton.click();
  } else {
    throw new Error('Could not find required elements even with self-healing');
  }
});
```

## Usage Examples

### Basic Element Finding

```typescript
import { createSelfHealing } from 'playwright-ai-self-healing';

// In your test
const selfHealing = createSelfHealing();

// Find an element that might have changed
const submitButton = await selfHealing.findElementUniversal(page, 'old-submit-btn');

if (submitButton) {
  await submitButton.click();
}
```

### Progressive Recovery Strategy

```typescript
async function findElementWithFallback(page, selector) {
  const selfHealing = createSelfHealing();
  
  // Try simple method first (fastest)
  let element = await selfHealing.findElementSimple(page, selector);
  
  if (!element) {
    // Try complex method (more thorough)
    element = await selfHealing.findElementComplex(page, selector);
  }
  
  if (!element) {
    // Try advanced method (most comprehensive)
    element = await selfHealing.findElementAdvanced(page, selector);
  }
  
  return element;
}

// Usage in test
test('Form submission with fallback', async ({ page }) => {
  await page.goto('https://example.com/form');
  
  const submitBtn = await findElementWithFallback(page, 'submit-button');
  if (submitBtn) {
    await submitBtn.click();
  }
});
```

## API Reference

### createSelfHealing(config?)

Creates a new instance of the PlaywrightAISelfHealing class.

```typescript
const selfHealing = createSelfHealing({
  minSimilarityThreshold: 0.2,
  levenshteinWeight: 0.8,
  semanticWeight: 0.15,
  structuralWeight: 0.05,
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minSimilarityThreshold` | number | 0.1 | Minimum similarity score (0-1) to consider a match |
| `levenshteinWeight` | number | 0.7 | Weight for Levenshtein distance algorithm |
| `semanticWeight` | number | 0.2 | Weight for semantic similarity algorithm |
| `structuralWeight` | number | 0.1 | Weight for structural similarity algorithm |
| `domCacheTTL` | number | 30000 | DOM cache time-to-live in milliseconds |
| `maxElementsToAnalyze` | number | 50 | Maximum number of elements to analyze |
| `findTimeout` | number | 5000 | Timeout for finding elements in milliseconds |
| `debug` | boolean | false | Enable debug logging (disable in production for security) |

### Self-Healing Methods

#### findElementUniversal(page, selector, options?)

The most comprehensive method that combines all similarity algorithms for best accuracy.

```typescript
const element = await selfHealing.findElementUniversal(page, 'old-selector');
```

#### findElementSimple(page, selector, options?)

Fastest method using basic string similarity for quick recovery.

```typescript
const element = await selfHealing.findElementSimple(page, 'btn-submit');
```

#### findElementComplex(page, selector, options?)

Uses semantic analysis and structural comparison for advanced scenarios.

```typescript
const element = await selfHealing.findElementComplex(page, 'search-input');
```

#### findElementAdvanced(page, selector, options?)

Most sophisticated method with pattern recognition and context analysis.

```typescript
const element = await selfHealing.findElementAdvanced(page, 'login-form');
```

## Similarity Algorithms

### LEVENSHTEIN (70% weight by default)
Measures string similarity using edit distance with enhanced substring matching:
- Perfect match: 1.0 similarity
- Prefix match (e.g., 'pass' in 'pass-input'): +0.8 bonus
- Substring match: +0.6 bonus

### SEMANTIC (20% weight by default)
Analyzes element properties and content:
- Compares text content, placeholders, IDs, and class names
- Word-based matching with partial word support
- Context-aware scoring

### STRUCTURAL (10% weight by default)
Examines DOM structure and element properties:
- Tag name matching
- Class name similarity
- ID attribute comparison
- Element hierarchy analysis

## Examples

## Examples

### Integration with Existing Playwright Tests

Replace your existing element finding with self-healing:

```typescript
// Before (traditional Playwright)
test('old way', async ({ page }) => {
  await page.click('#submit-btn'); // Breaks if selector changes
});

// After (with self-healing)
test('new way', async ({ page }) => {
  const selfHealing = createSelfHealing();
  const submitBtn = await selfHealing.findElementUniversal(page, 'submit-btn');
  
  if (submitBtn) {
    await submitBtn.click();
  }
});
```

### Custom Configuration

```typescript
const selfHealing = createSelfHealing({
  minSimilarityThreshold: 0.3,  // Higher threshold for stricter matching
  levenshteinWeight: 0.6,       // Reduce string similarity weight
  semanticWeight: 0.3,          // Increase semantic weight
  structuralWeight: 0.1,        // Keep structural weight low
  findTimeout: 10000,           // Longer timeout
});
```

### Real-World Example: E-commerce Site

```typescript
test('Add product to cart with self-healing', async ({ page }) => {
  const selfHealing = createSelfHealing();
  
  await page.goto('https://shop.example.com/product/123');
  
  // These selectors work even if the site redesign changes them
  const sizeDropdown = await selfHealing.findElementUniversal(page, 'size-selector');
  const addToCartBtn = await selfHealing.findElementUniversal(page, 'add-to-cart');
  const cartIcon = await selfHealing.findElementUniversal(page, 'cart-icon');
  
  if (sizeDropdown && addToCartBtn && cartIcon) {
    await sizeDropdown.selectOption('M');
    await addToCartBtn.click();
    
    // Verify cart updated
    await expect(cartIcon).toContainText('1');
  }
});
```

## Performance Considerations

- **Caching**: DOM elements are cached with configurable TTL to avoid repeated queries
- **Similarity Cache**: Calculated similarities are cached to prevent redundant computations
- **Element Limits**: Configurable maximum number of elements to analyze
- **Early Exit**: Algorithms use early exit strategies when high similarity is found

## Troubleshooting

### Common Issues

**Q: The library returns `null` even though the element exists**
A: Try lowering the `minSimilarityThreshold` or adjusting the algorithm weights:

```typescript
const selfHealing = createSelfHealing({
  minSimilarityThreshold: 0.05, // Lower threshold
  levenshteinWeight: 0.8,       // Increase string matching
});
```

**Q: Self-healing is too slow**
A: Use the simple method or reduce the number of elements analyzed:

```typescript
const selfHealing = createSelfHealing({
  maxElementsToAnalyze: 20,  // Fewer elements
  findTimeout: 3000,         // Shorter timeout
});

// Or use the faster method
const element = await selfHealing.findElementSimple(page, selector);
```

**Q: False positives - wrong elements are found**
A: Increase the similarity threshold or adjust weights:

```typescript
const selfHealing = createSelfHealing({
  minSimilarityThreshold: 0.4,  // Higher threshold
  semanticWeight: 0.4,          // More semantic matching
  structuralWeight: 0.2,        // More structural matching
});
```

**Q: How to debug what's happening**
A: Enable debug mode to see detailed logging:

```typescript
const selfHealing = createSelfHealing({ debug: true });

// The library will now log successful matches to console
const element = await selfHealing.findElementUniversal(page, selector);
```

**Note**: Always disable debug mode in production for security reasons.

## Security

This library implements multiple security measures:

- **Input Validation**: All selectors are validated for safety
- **Secure Logging**: Debug logging is disabled by default and configurable
- **Resource Limits**: Configurable bounds prevent DoS attacks
- **Safe DOM Operations**: Only read operations, no DOM modifications
- **Zero Dependencies**: Minimal attack surface

See [SECURITY.md](./SECURITY.md) for detailed security information.

## Testing

Run the test suite:

```bash
npm test
```

Run with coverage:

```bash
npm run test:coverage
```

## Building

Build the library:

```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Commit your changes: `git commit -am 'Add feature'`
7. Push to the branch: `git push origin feature-name`
8. Submit a pull request

## License

MIT © [Your Name](https://github.com/your-username)

## Changelog

### 1.0.0
- Initial release
- Four self-healing methods (Universal, Simple, Complex, Advanced)
- Three similarity algorithms (Levenshtein, Semantic, Structural)
- Performance optimizations with caching
- Comprehensive TypeScript support
- Full test coverage

## Support

If you encounter any issues or have questions:

1. Check the [GitHub Issues](https://github.com/your-username/playwright-ai-self-healing/issues)
2. Create a new issue if your problem isn't already reported
3. Provide minimal reproduction code and environment details

## Related Projects

- [Playwright](https://playwright.dev/) - Fast and reliable end-to-end testing framework
- [Playwright Test](https://playwright.dev/docs/test-intro) - Test runner built for Playwright
