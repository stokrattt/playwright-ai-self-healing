import type { Locator, Page } from '@playwright/test';
import { createSelfHealing } from '../../dist';
import { test, expect, FIND_TIMEOUT } from './fixtures';

const ai = createSelfHealing({ findTimeout: FIND_TIMEOUT });

// Single quotes only: the result goes inside a double-quoted HTML attribute.
const log = (text: string) => `document.getElementById('log').textContent = '${text}'`;
const LOG = '<output id="log"></output>';

const resolvers: Record<string, (page: Page, selector: string) => Promise<Locator>> = {
  'heal=': async (page, selector) => page.locator(`heal=${selector}`),
  findElementUniversal: async (page, selector) => {
    const locator = await ai.findElementUniversal(page, selector);
    expect(locator, `${selector} did not heal`).not.toBeNull();
    return locator!;
  },
};

for (const [via, resolve] of Object.entries(resolvers)) {
  test.describe(`actions on a renamed element through ${via}`, () => {
    test('click', async ({ page }) => {
      await page.setContent(`<button id="add-to-cart-v2" onclick="${log('clicked')}">Add to cart</button>${LOG}`);
      await (await resolve(page, '#add-to-cart')).click();
      await expect(page.locator('#log')).toHaveText('clicked');
    });

    test('dblclick', async ({ page }) => {
      await page.setContent(`<div id="editable-cell-v2" ondblclick="${log('editing')}">Price</div>${LOG}`);
      await (await resolve(page, '#editable-cell')).dblclick();
      await expect(page.locator('#log')).toHaveText('editing');
    });

    test('fill', async ({ page }) => {
      await page.setContent('<input id="email-input-v2">');
      await (await resolve(page, '#email-input')).fill('alice@example.com');
      await expect(page.locator('#email-input-v2')).toHaveValue('alice@example.com');
    });

    test('pressSequentially (type)', async ({ page }) => {
      await page.setContent('<input id="promo-code-v2">');
      await (await resolve(page, '#promo-code')).pressSequentially('SPRING');
      await expect(page.locator('#promo-code-v2')).toHaveValue('SPRING');
    });

    test('check and uncheck', async ({ page }) => {
      await page.setContent('<input type="checkbox" id="remember-me-v2">');
      const checkbox = await resolve(page, '#remember-me');
      await checkbox.check();
      await expect(page.locator('#remember-me-v2')).toBeChecked();
      await checkbox.uncheck();
      await expect(page.locator('#remember-me-v2')).not.toBeChecked();
    });

    test('selectOption', async ({ page }) => {
      await page.setContent(
        '<select id="country-select-v2"><option value="ua">Ukraine</option><option value="pl">Poland</option></select>'
      );
      await (await resolve(page, '#country-select')).selectOption('pl');
      await expect(page.locator('#country-select-v2')).toHaveValue('pl');
    });

    test('hover', async ({ page }) => {
      await page.setContent(`<button id="menu-toggle-v2" onmouseenter="${log('menu open')}">Menu</button>${LOG}`);
      await (await resolve(page, '#menu-toggle')).hover();
      await expect(page.locator('#log')).toHaveText('menu open');
    });

    test('press', async ({ page }) => {
      await page.setContent(
        `<input id="search-box-v2" onkeydown="if (event.key === 'Enter') { ${log('searched')} }">${LOG}`
      );
      await (await resolve(page, '#search-box')).press('Enter');
      await expect(page.locator('#log')).toHaveText('searched');
    });
  });
}

test.describe('the other findElement methods', () => {
  for (const method of ['findElementSimple', 'findElementComplex', 'findElementAdvanced'] as const) {
    test(`${method} heals a renamed button`, async ({ page }) => {
      await page.setContent('<button id="checkout-button-v2">Checkout</button>');
      const locator = await ai[method](page, '#checkout-button');
      expect(locator).not.toBeNull();
      await expect(locator!).toHaveId('checkout-button-v2');
    });
  }
});
