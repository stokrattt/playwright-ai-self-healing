import type { Page } from '@playwright/test';
import { createSelfHealing, MemorySelectorStore } from '../../dist';
import { test, expect, FIND_TIMEOUT } from './fixtures';

// The healed element carries data-expected; every saved selector must resolve to it alone.
async function healAndSave(page: Page, original: string): Promise<string> {
  const store = new MemorySelectorStore();
  const ai = createSelfHealing({ findTimeout: FIND_TIMEOUT, selectorStore: store });
  const locator = await ai.findElementUniversal(page, original);
  expect(locator, `${original} did not heal`).not.toBeNull();
  await expect(locator!).toHaveAttribute('data-expected', 'yes');

  const saved = store.get(original);
  expect(saved).not.toBeNull();
  await expect(page.locator(saved!)).toHaveCount(1);
  await expect(page.locator(saved!)).toHaveAttribute('data-expected', 'yes');
  return saved!;
}

test.describe('saved selector priority', () => {
  for (const attr of ['data-testid', 'data-test-id', 'data-test', 'data-qa']) {
    test(`test id first: ${attr}`, async ({ page }) => {
      await page.setContent(`<button ${attr}="login-submit-v2" id="login-v2" data-expected="yes">Log in</button>`);
      expect(await healAndSave(page, `[${attr}="login-submit"]`)).toBe(`[${attr}="login-submit-v2"]`);
    });
  }

  test('getByRole when there is no test id', async ({ page }) => {
    await page.setContent('<button id="place-order-v2" data-expected="yes">Place order</button>');
    expect(await healAndSave(page, '#place-order')).toBe('internal:role=button[name="Place order"s]');
  });

  test('getByText for an element without a role', async ({ page }) => {
    await page.setContent('<span id="status-message-v2" data-expected="yes">Order placed</span>');
    expect(await healAndSave(page, '#status-message')).toBe('internal:text="Order placed"s');
  });

  test('getByLabel for a labelled input without a role', async ({ page }) => {
    await page.setContent('<label for="birth-date-v2">Date of birth</label><input type="date" id="birth-date-v2" data-expected="yes">');
    expect(await healAndSave(page, '#birth-date')).toBe('internal:label="Date of birth"s');
  });

  test('getByPlaceholder for an unlabelled input', async ({ page }) => {
    await page.setContent('<input type="password" id="password-input-v2" placeholder="Password" data-expected="yes">');
    expect(await healAndSave(page, '#password-input')).toBe('internal:attr=[placeholder="Password"s]');
  });

  test('getByAltText for an image button without a name', async ({ page }) => {
    await page.setContent('<input type="image" id="search-go-v2" alt="Go search" data-expected="yes">');
    expect(await healAndSave(page, '#search-go')).toBe('internal:attr=[alt="Go search"s]');
  });

  test('getByTitle for an empty icon', async ({ page }) => {
    await page.setContent('<span id="info-icon-v2" title="More info" data-expected="yes"></span>');
    expect(await healAndSave(page, '#info-icon')).toBe('internal:attr=[title="More info"s]');
  });

  test('CSS id when nothing above applies', async ({ page }) => {
    await page.setContent('<div id="panel-main-v2" data-expected="yes"><span>A</span><span>B</span></div>');
    expect(await healAndSave(page, '#panel-main')).toBe('#panel-main-v2');
  });

  test('CSS name for an input without id or label', async ({ page }) => {
    await page.setContent('<input name="promo-code-v2" data-expected="yes">');
    expect(await healAndSave(page, 'input[name="promo-code"]')).toBe('input[name="promo-code-v2"]');
  });

  test('CSS tag.class for a container with a unique class', async ({ page }) => {
    await page.setContent('<div class="toolbar-v2" data-expected="yes"><span>A</span><span>B</span></div>');
    expect(await healAndSave(page, '.toolbar')).toBe('div.toolbar-v2');
  });

  test('XPath by text when the class is shared', async ({ page }) => {
    await page.setContent(
      '<div class="promo-banner-v2" data-expected="yes"><b>Spring sale</b></div>' +
      '<div class="promo-banner-v2"><b>Summer sale</b></div>'
    );
    expect(await healAndSave(page, '.promo-banner')).toBe('xpath=//div[normalize-space(.)="Spring sale"]');
  });

  test('XPath by position when the class and text are shared', async ({ page }) => {
    await page.setContent(
      '<div class="promo-banner-v2" data-expected="yes"><b>Sale</b></div>' +
      '<div class="promo-banner-v2"><b>Sale</b></div>'
    );
    expect(await healAndSave(page, '.promo-banner')).toBe('xpath=/html[1]/body[1]/div[1]');
  });
});

test.describe('uniqueness of the healed element and its saved selector', () => {
  test('picks the right one of two buttons with the same class', async ({ page }) => {
    await page.setContent('<button class="btn" data-expected="yes">Save</button><button class="btn">Delete</button>');
    expect(await healAndSave(page, '#save-btn')).toBe('internal:role=button[name="Save"s]');
  });

  test('skips role and text when two buttons share both', async ({ page }) => {
    await page.setContent(
      '<header><button id="header-save-v2">Save</button></header>' +
      '<footer><button id="footer-save-v2" data-expected="yes">Save</button></footer>'
    );
    expect(await healAndSave(page, '#footer-save')).toBe('#footer-save-v2');
  });

  test('heal= resolves to exactly one element among same-role duplicates', async ({ page }) => {
    await page.setContent(
      '<button id="header-save-v2">Save</button><button id="footer-save-v2" data-expected="yes">Save</button>'
    );
    await expect(page.locator('heal=#footer-save')).toHaveCount(1);
    await expect(page.locator('heal=#footer-save')).toHaveAttribute('data-expected', 'yes');
  });
});

test.describe('saved selector points at the healed element', () => {
  test('a getByLabel candidate that resolves to another element is skipped', async ({ page }) => {
    // getByLabel ignores title, so "Email" here would point at the second input.
    await page.setContent('<input id="email-new" title="Email" data-expected="yes"><input id="search" aria-label="Email">');
    expect(await healAndSave(page, '#email-old')).not.toBe('internal:label="Email"s');
  });
});
