import { test as base } from '@playwright/test';
import { createSelfHealing } from '../../dist';

const ai = createSelfHealing();

// The worker fixture from the README: registers `heal=` once per worker, before pages are created.
export const test = base.extend<{}, { healEngine: void }>({
  healEngine: [async ({ playwright }, use) => {
    await ai.registerSelectorEngine(playwright.selectors);
    await use();
  }, { scope: 'worker', auto: true }],
});

// The page fixture from the README: plain selectors heal, no `heal=` prefix.
export const autoHealTest = test.extend({
  page: async ({ page }, use) => {
    ai.enableAutoHealing(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';

/** Short find timeout: a missing original selector would otherwise wait the default 5 s. */
export const FIND_TIMEOUT = 1000;
