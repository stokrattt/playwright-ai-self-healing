# Playwright AI Self-Healing Locators

[![npm version](https://badge.fury.io/js/playwright-ai-self-healing.svg)](https://badge.fury.io/js/playwright-ai-self-healing)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16.0.0-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Self-healing locators for Playwright. When a selector stops matching because an id, class or test id was renamed, the library finds the element that matches what the old selector described and uses it instead.
It scores page elements with string and word similarity (no model, no network). An element that resembles nothing on the page is not healed: the test fails as it would without the library.

## Features

- **Any action and any assertion**: `click`, `fill`, `toHaveText`, `toBeHidden`, `toHaveCount` and the rest work on a healed locator
- **No test changes needed**: with `enableAutoHealing(page)`, the selectors your tests already write heal on their own
- **Readable healed locators**: test id first, then Playwright's `getBy*` locators, CSS, XPath
- **CSS, XPath, test ids, open shadow DOM, iframes, chained locators**
- **Refuses look-alikes**: `#confirm-button` does not heal into `#cancel-button`, a missing element stays missing
- **Selector store**: `findElementUniversal` can save every healed selector to a JSON file for review
- **TypeScript**, no runtime dependencies besides Playwright; tested with Playwright 1.65 on Chromium

## Installation

```bash
npm install --save-dev playwright-ai-self-healing
```

## Choose how to use it

| Way | You write | Heals | Writes the selector store |
|-----|-----------|-------|---------------------------|
| `enableAutoHealing(page)` | ordinary tests: `page.locator('#save')`, `page.getByTestId('save')` | every action and assertion | no |
| `heal=` prefix | `page.locator('heal=#save')` where you want healing | every action and assertion | no |
| `findElementUniversal()` | `await ai.findElementUniversal(page, '#save')`, usually in a `BasePage` | the call that returns the locator | yes |

The first two need one `fixtures.ts` in your project, shown below.
The third needs nothing else, and it is the way to get a file of which old selector healed into which new one.

## Quick Start: heal the tests you already have

```typescript
// tests/fixtures.ts
import { test as base } from '@playwright/test';
import { createSelfHealing } from 'playwright-ai-self-healing';

const ai = createSelfHealing();

export const test = base.extend<{}, { healEngine: void }>({
  healEngine: [async ({ playwright }, use) => {
    await ai.registerSelectorEngine(playwright.selectors); // teaches Playwright the heal= engine, once per worker
    await use();
  }, { scope: 'worker', auto: true }],
  page: async ({ page }, use) => {
    ai.enableAutoHealing(page); // plain selectors of this page heal
    await use(page);
  },
});
export { expect } from '@playwright/test';
```

In your specs, import `test` and `expect` from this file instead of `@playwright/test`:

```typescript
import { test, expect } from './fixtures';

test('checkout', async ({ page }) => {
  await page.goto('/cart');
  await page.getByTestId('checkout-submit').click();               // test id renamed to checkout-submit-v2: still found
  await expect(page.locator('#order-total')).toHaveText('100 EUR'); // id renamed: still found
});
```

Drop the `page` override to heal only where you write `heal=`.

## Quick Start: findElementUniversal

```typescript
import { createSelfHealing } from 'playwright-ai-self-healing';

const ai = createSelfHealing();

// Returns a Playwright locator: the original if it still matches, else the healed one, else null.
const submit = await ai.findElementUniversal(page, '[data-testid="submit"]');
if (!submit) throw new Error('submit button not found');
await submit.click();
await expect(submit).toBeEnabled();
```

In a page object, put it behind one helper:

```typescript
// framework/core/BasePage.ts
import { Page, Locator } from '@playwright/test';
import { createProjectSelfHealing } from 'playwright-ai-self-healing';

const ai = createProjectSelfHealing(); // saves healed selectors to playwright/.healed-selectors.json

export class BasePage {
  constructor(protected page: Page) {}

  protected async find(selector: string): Promise<Locator> {
    const locator = await ai.findElementUniversal(this.page, selector, { context: { pageObject: this.constructor.name } });
    if (!locator) throw new Error(`Element not found: ${selector}`);
    return locator;
  }
}
```

For more integration patterns see [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md).

### Fast First Match

`findElementSimple` takes the first element above the threshold instead of the best one.
Use it when speed matters more than picking the closest of several look-alikes.

```typescript
const submitBtn = await ai.findElementSimple(page, 'submit-button');
```

## API Reference

### createSelfHealing(config?)

Creates a new instance of the PlaywrightAISelfHealing class.

```typescript
const selfHealing = createSelfHealing({
  minSimilarityThreshold: 0.4,
  levenshteinWeight: 0.8,
  semanticWeight: 0.15,
  structuralWeight: 0.05,
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minSimilarityThreshold` | number | 0.4 | Minimum similarity score (0-1) to consider a match |
| `levenshteinWeight` | number | 0.7 | Weight of character similarity between a selector value and the element's value |
| `semanticWeight` | number | 0.2 | Weight of shared words (`save-button` vs `save-button-v2`) |
| `structuralWeight` | number | 0.1 | Weight of a matching tag or role; counts only when the selector names a tag |
| `domCacheTTL` | number | 30000 | DOM cache time-to-live in milliseconds |
| `maxElementsToAnalyze` | number | 50 | Maximum number of elements to analyze; interactive and identifiable elements are taken first |
| `findTimeout` | number | 5000 | Timeout for finding elements in milliseconds |
| `healAfterMs` | number | 1000 | `heal=` engine: how long the original selector may be missing before healing starts |
| `debug` | boolean | false | Enable debug logging (disable in production for security) |
| `selectorStore` | `SelectorStore` | `undefined` | Optional store for reusing and persisting working selectors |
| `useStoredSelectorsFirst` | boolean | `true` | Try a saved selector override before retrying the original selector |

### Persist Learned Selectors

The safest way to "push back" a healed selector into your project is to save it in a project-owned JSON file and commit that file. This keeps changes reviewable and avoids auto-editing your page objects.

For most teams, the easiest setup is `createProjectSelfHealing()`. It uses one shared file path and sensible defaults:

- local runs: read-write mode
- CI runs: read-write mode too
- default file path: `playwright/.healed-selectors.json`

```typescript
import {
  createProjectSelfHealing,
} from 'playwright-ai-self-healing';

const ai = createProjectSelfHealing();

const loginButton = await ai.findElementUniversal(page, '[data-testid="login-button"]');
await loginButton?.click();
```

If you want to wire this once for the whole framework, put it in your shared `BasePage` or fixture:

```typescript
import { Page } from '@playwright/test';
import { createProjectSelfHealing } from 'playwright-ai-self-healing';

export class BasePage {
  protected page: Page;
  protected ai = createProjectSelfHealing();

  constructor(page: Page) {
    this.page = page;
  }
}
```

If you want the JSON file to show where the locator came from, pass context from the framework:

```typescript
import { Page } from '@playwright/test';
import { createProjectSelfHealing } from 'playwright-ai-self-healing';

export class LoginPage {
  private readonly ai = createProjectSelfHealing({
    selectorContext: {
      pageObject: 'LoginPage',
    },
  });

  constructor(private readonly page: Page) {}

  async clickLogin() {
    const locator = await this.ai.findElementUniversal(
      this.page,
      '[data-testid="login-button"]',
      {
        context: {
          testFile: 'tests/login.spec.ts',
          notes: 'primary login action',
        },
      }
    );

    await locator?.click();
  }
}
```

On the first successful local healing, the library writes an override like:

```json
{
  "version": 1,
  "selectors": {
    "[data-testid=\"login-button\"]": {
      "originalSelector": "[data-testid=\"login-button\"]",
      "healedSelector": "#login-button-v2",
      "source": "healed",
      "updatedAt": "2026-04-13T00:00:00.000Z",
      "lastVerifiedAt": "2026-04-13T00:00:00.000Z",
      "timesUsed": 1,
      "pageObject": "LoginPage",
      "testFile": "tests/login.spec.ts",
      "notes": "primary login action"
    }
  }
}
```

On later runs, the saved selector is tried before running the similarity scan again.
This makes the file readable for humans too: you can clearly see the old locator in `originalSelector` and the working replacement in `healedSelector`.

If you need custom behavior, you can override the path or mode:

```typescript
import { createProjectSelfHealing } from 'playwright-ai-self-healing';

const ai = createProjectSelfHealing(
  { minSimilarityThreshold: 0.4 },
  {
    selectorStorePath: './qa/healed-selectors.json',
    selectorStoreMode: 'read-write',
  }
);
```

Supported modes:

- `'read-write'`: read existing selectors and save new healed selectors
- `'read'`: read existing selectors but do not write updates
- `'off'`: disable the selector store completely

Environment variables:

- `PLAYWRIGHT_AI_SELF_HEALING_STORE_PATH`
- `PLAYWRIGHT_AI_SELF_HEALING_STORE_MODE`

### CI Behavior

By default, `createProjectSelfHealing()` also writes learned selectors on CI.

That means:

1. CI reads `playwright/.healed-selectors.json` from your repository.
2. CI uses saved selectors if the file is present.
3. CI can update that file during the pipeline when healing finds a better locator.

So where does the file come from on CI?

- Usually from the repository itself, if you already committed `playwright/.healed-selectors.json`.
- Or from a previous CI step that restores it from cache or artifact storage.

Important: a CI machine is usually ephemeral. The library can update the file inside the job workspace, but if you want future CI runs to benefit from those changes, your pipeline must persist that file somehow.

You have two practical options:

1. Commit the updated `playwright/.healed-selectors.json` back to the branch or open a PR with it.
2. Restore/save the file through CI cache or artifacts between runs.

If the file does not exist on CI yet, tests still run. You simply will not get reuse of previously healed selectors until the file is restored or committed.

Example strategy for CI-first teams:

1. Check out the repository.
2. Restore `playwright/.healed-selectors.json` from cache or keep the committed copy.
3. Run tests with `createProjectSelfHealing()`.
4. After the run, either:
   - upload the file as an artifact for inspection
   - save it back to cache
   - or commit it back to the branch

If your pipeline must not modify workspace files, force read-only mode:

```bash
PLAYWRIGHT_AI_SELF_HEALING_STORE_MODE=read
```

### Self-Healing Methods

#### findElementUniversal(page, selector, options?)

The most comprehensive method that combines all similarity algorithms for best accuracy.
It preserves the concrete locator type returned by the provided `page`, so the result works with Playwright actions and assertions such as `await expect(locator).toBeVisible()`.

```typescript
const element = await selfHealing.findElementUniversal(page, 'old-selector');
```

#### findElementSimple(page, selector, options?)

Fastest method using basic string similarity for quick recovery.

```typescript
const element = await selfHealing.findElementSimple(page, 'btn-submit');
```

#### findElementComplex / findElementAdvanced (deprecated)

Both call `findElementUniversal` and are kept only so existing code keeps compiling.

## Assertions: the `heal=` selector engine

`findElement*` heals once, when you call it.
For assertions, register the selector engine and prefix the selector with `heal=`.
Playwright runs the engine on every retry of an action or an `expect`, so every matcher works on a renamed element: `toHaveText`, `toBeHidden`, `toHaveValue`, `toBeChecked`, `toHaveAttribute`, `toHaveCount` and the rest.

```typescript
// fixtures.ts
import { test as base, selectors } from '@playwright/test';
import { createSelfHealing } from 'playwright-ai-self-healing';

const ai = createSelfHealing();

export const test = base.extend<{}, { healEngine: void }>({
  healEngine: [async ({}, use) => {
    await ai.registerSelectorEngine(selectors); // once per worker, before pages are created
    await use();
  }, { scope: 'worker', auto: true }],
});
export { expect } from '@playwright/test';
```

```typescript
await expect(page.locator('heal=#balance-amount')).toHaveText('100 EUR');
await expect(page.locator('heal=//button[@id="pay-now"]')).toBeEnabled();
await page.locator('heal=[data-testid="login-submit"]').click();
```

- The original selector is used while it matches anything. Healing starts only after it has matched nothing for `healAfterMs` (default 1000), so a page that is still rendering does not get a look-alike. Keep assertion timeouts above that value.
- CSS (including open shadow DOM) and XPath originals are supported. A Playwright-only selector (`role=`, `text=`) always goes through scoring.
- A renamed list heals as a list: the best match plus its siblings with the same tag, class and score, so `toHaveCount(3)` still works.
- A selector whose values match nothing on the page stays missing, so `toHaveCount(0)` still passes.
- For a "this element must be gone" check, use a plain locator: a similar element would otherwise stand in for the removed one.
- The engine does not write the selector store. Use `findElementUniversal` when you want the healed selector saved.

## Auto-healing: no `heal=` prefix

`enableAutoHealing(page)` makes the selectors your tests already write heal on their own.
Add it to a `page` fixture next to the engine registration:

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';
import { createSelfHealing } from 'playwright-ai-self-healing';

const ai = createSelfHealing();

export const test = base.extend<{}, { healEngine: void }>({
  healEngine: [async ({ playwright }, use) => {
    await ai.registerSelectorEngine(playwright.selectors); // once per worker
    await use();
  }, { scope: 'worker', auto: true }],
  page: async ({ page }, use) => {
    ai.enableAutoHealing(page); // every locator of this page heals
    await use(page);
  },
});
export { expect } from '@playwright/test';
```

```typescript
await expect(page.locator('#balance-amount')).toHaveText('100 EUR'); // heals a renamed id
await page.getByTestId('login-submit').click();                       // heals a renamed test id
await expect(page.locator('//button[@id="pay-now"]')).toBeEnabled();  // XPath too
```

What heals: `page.locator()`, `getByTestId()`, chained locators and `frameLocator().locator()`, with CSS or XPath.
What stays as Playwright resolves it:

- `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle`: their matching rules are Playwright's own.
- A selector with an explicit engine. Write `css=#id` for a check that the element must be gone, so a look-alike cannot stand in.
- `>>` chains and Playwright-only CSS such as `:has-text()` or `:visible`.
- The older selector-taking methods: `page.click('#id')`, `page.fill()`, `page.$()`, `waitForSelector()`.

It works by wrapping `locator()` of Playwright's Frame, Locator and FrameLocator classes, and only for pages passed to `enableAutoHealing`.
Tested with Playwright 1.65.

## Healed locator priority

When `findElement*` heals, it saves the first locator that matches only the healed element, in this order:

1. Test id: `data-testid`, `data-test-id`, `data-test`, `data-qa`
2. Playwright locators, in the order Playwright's docs recommend, saved as the selector strings they compile to:
   `getByRole` (`internal:role=button[name="Save"s]`), `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle`
3. CSS: `#id`, `[name]`, `[aria-label]`, `a[href]`, `tag.class`
4. XPath: by text, then by position, which always matches

Each saved string works with `page.locator()`, and it is saved only after it resolved to the same element that was scored.

## Similarity Algorithms

The selector is split into the values it identifies an element by: `#id`, `.class`,
`[attr="value"]`, `text=...`, `:has-text(...)`, or a bare word such as `save-button`.
Each value is compared with the element's value of the same attribute, and with its other identifying values (id, test id, name, classes, accessible name, aria-label, placeholder, title, text) at a discount.
A bare word is compared with all of them at full weight.
Two rules keep look-alikes out:

- A word that only names the kind of element (`button`, `btn`, `input`, `field`, `link`, ...) cannot carry a match alone: `#confirm-button` does not heal into `#cancel-button`.
- A word that names this element's own kind is also compared without it: `.toggle-checkbox` on a checkbox reads as `toggle`, not `toggle-all`.

| Part | Default weight | What it measures |
|------|----------------|------------------|
| Characters | 0.7 (`levenshteinWeight`) | Edit distance: `login-btn` vs `login-button` |
| Words | 0.2 (`semanticWeight`) | Shared words, camelCase split: `user-email` vs `userEmail` |
| Tag or role | 0.1 (`structuralWeight`) | `button.x` vs a `<button>` or `role="button"`; skipped when the selector names no tag |

On the library's calibration set, renamed elements score 0.63 and above and unrelated ones 0.13 and below, so the default threshold is 0.4.
`html` and `body` are never candidates, and the healed selector is built in the page so that it matches exactly one element.

## Examples

### Integration with Existing Playwright Tests

Replace your existing element finding with self-healing:

```typescript
// Before: breaks when #submit-btn is renamed
await page.locator('#submit-btn').click();

// After, with enableAutoHealing in your fixture: the same line keeps working
await page.locator('#submit-btn').click();

// Or explicitly, without the fixture
const submitBtn = await createSelfHealing().findElementUniversal(page, '#submit-btn');
await submitBtn?.click();
```

### Custom Configuration

```typescript
const selfHealing = createSelfHealing({
  minSimilarityThreshold: 0.5,  // Higher threshold for stricter matching
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

## Performance

Measured on demo.playwright.dev/todomvc, a 7-step test with 5 renamed locators, Chromium, Playwright 1.65:

| Run | Time |
|-----|------|
| Correct locators, no healing | 0.6 s |
| Correct locators, `enableAutoHealing` on | 0.7 s |
| Renamed locators, `enableAutoHealing` or `heal=` | 8-9 s |
| Renamed locators, `findElementUniversal` | 31 s |

A working selector costs nothing extra.
A renamed one costs about 1.5 s with `heal=` (`healAfterMs`, 1000 ms by default, plus Playwright's retry interval) and about 5 s with `findElementUniversal`, which first waits `findTimeout` for the original.
Lower either value to heal faster, at the risk of healing an element that was only slow to render.

## Troubleshooting

### Common Issues

**Q: The library returns `null` even though the element exists**
A: Enable `debug` to see the best scores, then lower `minSimilarityThreshold` a little (0.3).
Below that, unrelated elements start to pass.

**Q: Self-healing is too slow**
A: Most of the time is waiting for the original selector, not scoring. Lower `healAfterMs` (for `heal=` and auto-healing) or `findTimeout` (for `findElement*`):

```typescript
const selfHealing = createSelfHealing({
  healAfterMs: 500,
  findTimeout: 2000,
});
```

Then fix the selector in the test: healing is a safety net, the healed selector is printed with `debug: true` and saved by the selector store.

**Q: False positives - wrong elements are found**
A: Raise `minSimilarityThreshold` (0.5), or name the tag in the selector (`button#save` instead of `#save`) so `structuralWeight` can tell a button from a link.

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

Run the unit tests (jest, no browser):

```bash
npm test
```

Run the real-browser tests (Playwright Test, `tests/e2e`), after `npm run build`:

```bash
npm run test:e2e -- --project=chromium
```

`PW_CHROMIUM_PATH` points the chromium project at a local browser binary when the bundled one is not installed.

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

MIT © [stokrattt](https://github.com/stokrattt)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## Support

If you encounter any issues or have questions:

1. Check the [GitHub Issues](https://github.com/stokrattt/playwright-ai-self-healing/issues)
2. Create a new issue if your problem isn't already reported
3. Provide minimal reproduction code and environment details

## Related Projects

- [Playwright](https://playwright.dev/) - Fast and reliable end-to-end testing framework
- [Playwright Test](https://playwright.dev/docs/test-intro) - Test runner built for Playwright
