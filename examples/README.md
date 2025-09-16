# Example Usage

This folder contains practical examples of how to use the Playwright AI Self-Healing library.

## Basic Example

```typescript
import { test, expect } from '@playwright/test';
import { PlaywrightAISelfHealing } from 'playwright-ai-self-healing';

test('basic AI self-healing example', async ({ page }) => {
  const ai = new PlaywrightAISelfHealing();
  
  await page.goto('https://example.com');
  
  // Even if this selector breaks, AI will find the element
  const button = await ai.findElementUniversal(page, 'button[data-testid="submit"]', 'submit button');
  
  if (button) {
    await button.click();
  }
});
```

## Page Object Example

```typescript
import { Page } from '@playwright/test';
import { PlaywrightAISelfHealing } from 'playwright-ai-self-healing';

export class BasePage {
  protected page: Page;
  protected ai: PlaywrightAISelfHealing;

  constructor(page: Page) {
    this.page = page;
    this.ai = new PlaywrightAISelfHealing();
  }

  protected async smartClick(selector: string, description?: string) {
    try {
      await this.page.locator(selector).click({ timeout: 3000 });
    } catch {
      const element = await this.ai.findElementUniversal(this.page, selector, description);
      if (element) await element.click();
      else throw new Error(`Element not found: ${selector}`);
    }
  }
}
```

For more examples, see the main README.md and INTEGRATION_GUIDE.md files.
