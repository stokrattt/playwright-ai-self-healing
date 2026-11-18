# Integration Guide

How to add self-healing to an existing Playwright project with page objects and fixtures.
The README's "Choose how to use it" table explains the three ways; this guide shows where each one goes.

## 1. Install

```bash
npm install --save-dev playwright-ai-self-healing
```

The package has no runtime dependencies. It needs `@playwright/test` (or `playwright`) in your project.

## 2. Auto-healing in your fixtures

This heals the selectors your tests and page objects already use, with no change to them.

If the project has one fixture file, extend it:

```typescript
// framework/fixtures/self-healing-fixture.ts
import { test as base } from '@playwright/test';
import { createSelfHealing } from 'playwright-ai-self-healing';

const ai = createSelfHealing();

export const test = base.extend<{}, { healEngine: void }>({
  // Teaches Playwright the heal= selector engine. Worker scope: runs once, before any page exists.
  healEngine: [async ({ playwright }, use) => {
    await ai.registerSelectorEngine(playwright.selectors);
    await use();
  }, { scope: 'worker', auto: true }],

  // Every locator of this page heals: page.locator(), getByTestId(), chained and frame locators.
  page: async ({ page }, use) => {
    ai.enableAutoHealing(page);
    await use(page);
  },
});
```

If the project merges several fixture files, add this one to the merge:

```typescript
// framework/fixtures/main-fixture.ts
import { mergeTests } from '@playwright/test';
import { test as selfHealingTest } from './self-healing-fixture';
// import { test as apiTest } from './api-fixture';

export const test = mergeTests(selfHealingTest /* , apiTest, ... */);
export { expect } from '@playwright/test';
```

Specs keep importing `test` from `main-fixture`.

What stays as Playwright resolves it, so plan your selectors around it:

- `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle`.
- `css=...` and any other explicit engine. Use `css=` for checks that an element must be gone:
  `await expect(page.locator('css=#cookie-banner')).toHaveCount(0)`. Without it, a look-alike could stand in for the removed element.
- `>>` chains and Playwright-only CSS (`:has-text()`, `:visible`).
- `page.click('#id')`, `page.fill()`, `page.$()`, `waitForSelector()`.

## 3. `findElementUniversal` in a BasePage

Use this when you want a file of every healed selector, or when you only want healing in page objects.

```typescript
// framework/core/BasePage.ts
import { Page, Locator } from '@playwright/test';
import { createProjectSelfHealing } from 'playwright-ai-self-healing';

// Saves every healed selector to playwright/.healed-selectors.json
const ai = createProjectSelfHealing({ findTimeout: 3000 });

export class BasePage {
  constructor(protected page: Page) {}

  /** The original selector if it still matches, otherwise the healed one. */
  protected async find(selector: string, notes?: string): Promise<Locator> {
    const locator = await ai.findElementUniversal(this.page, selector, {
      context: { pageObject: this.constructor.name, notes },
    });
    if (!locator) {
      throw new Error(`Element not found, even after healing: ${selector}`);
    }
    return locator;
  }
}
```

```typescript
// framework/ui/page-objects/LoginPage.ts
import { BasePage } from '../../core/BasePage';

export class LoginPage extends BasePage {
  private readonly emailInput = '[data-testid="email-input"]';
  private readonly passwordInput = '[data-testid="password-input"]';
  private readonly loginButton = '[data-testid="login-button"]';

  async login(email: string, password: string) {
    await (await this.find(this.emailInput, 'email field')).fill(email);
    await (await this.find(this.passwordInput, 'password field')).fill(password);
    await (await this.find(this.loginButton, 'login submit')).click();
  }
}
```

Do not wait for the original selector yourself before calling `find`: `findElementUniversal` already tries it first (for `findTimeout`), and a hidden element counts as found.
The returned value is a normal Playwright `Locator`, so every action and `expect` matcher works on it.

## 4. The selector store

`createProjectSelfHealing()` writes `playwright/.healed-selectors.json`:

```json
{
  "version": 1,
  "selectors": {
    "[data-testid=\"login-button\"]": {
      "originalSelector": "[data-testid=\"login-button\"]",
      "healedSelector": "[data-testid=\"login-submit\"]",
      "source": "healed",
      "timesUsed": 3,
      "pageObject": "LoginPage",
      "notes": "login submit"
    }
  }
}
```

- `originalSelector` is what the test code has today, `healedSelector` is what worked at runtime.
- On the next run the healed selector is tried first, so the page is not scored again.
- When the original works again, the record is reset to it.
- Parallel workers can write the same file: writes go through a lock file and an atomic rename.

Use the file as a to-do list: update the selectors in the page objects, then delete the record.

In CI the store writes by default. To keep what it learned between runs, commit the file, cache it, or publish it as an artifact.
To stop CI from writing, set `PLAYWRIGHT_AI_SELF_HEALING_STORE_MODE=read`; `off` disables the store. `PLAYWRIGHT_AI_SELF_HEALING_STORE_PATH` moves the file.

The `heal=` engine and `enableAutoHealing` heal inside the browser and leave no record. Use `findElementUniversal` where you need one.

## 5. Tuning

| Option | Default | Raise it when | Lower it when |
|--------|---------|---------------|---------------|
| `minSimilarityThreshold` | 0.4 | a wrong element gets picked | a renamed element is not found |
| `healAfterMs` | 1000 | `heal=` picks a look-alike while the page still renders | healing feels slow |
| `findTimeout` | 5000 | `findElementUniversal` heals elements that were only slow | healing feels slow |
| `maxElementsToAnalyze` | 50 | the target is on a long page and is not found | pages are huge and scoring is slow |

Each renamed selector costs about 1.5 s with auto-healing or `heal=`, and about `findTimeout` with `findElementUniversal`. A selector that still works costs nothing extra.

## 6. Limits

- Healing finds an element similar to what the old selector described. A selector changed to something unrelated does not heal, by design.
- Inside open shadow DOM, a CSS selector that crosses the shadow boundary (`#host #inner`) is not matched by the `heal=` engine.
- `enableAutoHealing` wraps `locator()` of Playwright's Frame, Locator and FrameLocator classes. It is tested with Playwright 1.65; run the library's e2e suite after a Playwright upgrade.
