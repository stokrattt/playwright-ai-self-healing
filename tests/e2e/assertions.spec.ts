import { test, expect } from './fixtures';

test.describe('expect matchers through heal= on a renamed element', () => {
  test('toHaveText', async ({ page }) => {
    await page.setContent('<span id="balance-amount-v2">100 EUR</span>');
    await expect(page.locator('heal=#balance-amount')).toHaveText('100 EUR');
  });

  test('toContainText', async ({ page }) => {
    await page.setContent('<p id="welcome-message-v2">Welcome back, Alice</p>');
    await expect(page.locator('heal=#welcome-message')).toContainText('Alice');
  });

  test('toHaveValue', async ({ page }) => {
    await page.setContent('<input id="username-field" value="alice">');
    await expect(page.locator('heal=#username')).toHaveValue('alice');
  });

  test('toBeChecked', async ({ page }) => {
    await page.setContent('<input type="checkbox" id="accept-terms-checkbox" checked>');
    await expect(page.locator('heal=#accept-terms')).toBeChecked();
  });

  test('toBeHidden', async ({ page }) => {
    await page.setContent('<div id="error-banner-v2" hidden>Payment failed</div><p>Checkout</p>');
    await expect(page.locator('heal=#error-banner')).toBeHidden();
    await expect(page.locator('heal=#error-banner')).toHaveCount(1);
  });

  test('toBeVisible', async ({ page }) => {
    await page.setContent('<div id="success-banner-v2">Paid</div>');
    await expect(page.locator('heal=#success-banner')).toBeVisible();
  });

  test('toBeEnabled', async ({ page }) => {
    await page.setContent('<button id="pay-now-button">Pay now</button>');
    await expect(page.locator('heal=#pay-now')).toBeEnabled();
  });

  test('toBeDisabled', async ({ page }) => {
    await page.setContent('<button id="pay-now-button" disabled>Pay now</button>');
    await expect(page.locator('heal=#pay-now')).toBeDisabled();
  });

  test('toBeEditable', async ({ page }) => {
    await page.setContent('<input id="comment-input-v2">');
    await expect(page.locator('heal=#comment-input')).toBeEditable();
  });

  test('toHaveAttribute', async ({ page }) => {
    await page.setContent('<a id="docs-link-v2" href="/docs">Docs</a>');
    await expect(page.locator('heal=#docs-link')).toHaveAttribute('href', '/docs');
  });

  test('toHaveClass', async ({ page }) => {
    await page.setContent('<div class="alert-box-v2 alert--warning">Low balance</div>');
    await expect(page.locator('heal=.alert-box')).toHaveClass(/alert--warning/);
  });

  test('toHaveId', async ({ page }) => {
    await page.setContent('<button id="save-v2">Save</button>');
    await expect(page.locator('heal=#save')).toHaveId('save-v2');
  });

  test('toHaveCount keeps every match of a working original', async ({ page }) => {
    await page.setContent('<li class="cart-item">A</li><li class="cart-item">B</li><li class="cart-item">C</li>');
    await expect(page.locator('heal=.cart-item')).toHaveCount(3);
  });

  test('toHaveCount counts every element of a renamed list', async ({ page }) => {
    await page.setContent('<li class="cart-item-v2">A</li><li class="cart-item-v2">B</li><li class="cart-item-v2">C</li>');
    await expect(page.locator('heal=.cart-item')).toHaveCount(3);
  });

  test('toBeFocused after focus', async ({ page }) => {
    await page.setContent('<input id="search-input-v2">');
    await page.locator('heal=#search-input').focus();
    await expect(page.locator('heal=#search-input')).toBeFocused();
  });

  test('toHaveJSProperty', async ({ page }) => {
    await page.setContent('<input type="checkbox" id="newsletter-optin-v2" checked>');
    await expect(page.locator('heal=#newsletter-optin')).toHaveJSProperty('checked', true);
  });
});
