import { test as plainTest } from '@playwright/test';
import { toHealingSelector } from '../../dist';
import { autoHealTest as test, expect } from './fixtures';

test.describe('plain selectors heal with enableAutoHealing', () => {
  test('page.locator with a renamed id', async ({ page }) => {
    await page.setContent('<span id="balance-amount-v2">100 EUR</span>');
    await expect(page.locator('#balance-amount')).toHaveText('100 EUR');
  });

  test('click on a renamed button', async ({ page }) => {
    await page.setContent('<button id="save-button-v2" onclick="this.textContent = \'Saved\'">Save</button>');
    await page.locator('#save-button').click();
    await expect(page.locator('#save-button')).toHaveText('Saved');
  });

  test('getByTestId with a renamed test id', async ({ page }) => {
    await page.setContent('<button data-testid="login-submit-btn">Log in</button>');
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  test('XPath', async ({ page }) => {
    await page.setContent('<button id="pay-now-v2">Pay</button>');
    await expect(page.locator('//button[@id="pay-now"]')).toHaveText('Pay');
  });

  test('chained locator stays inside its parent', async ({ page }) => {
    await page.setContent('<div id="first"><input id="email-v2" value="first"></div><form id="login"><input id="email-new" value="login"></form>');
    await expect(page.locator('#login').locator('#email')).toHaveValue('login');
  });

  test('locator inside a frame', async ({ page }) => {
    await page.setContent('<iframe srcdoc="<button id=&quot;pay-now-v2&quot;>Pay now</button>"></iframe>');
    await expect(page.frameLocator('iframe').locator('#pay-now')).toHaveText('Pay now');
  });

  test('an unchanged selector keeps every match', async ({ page }) => {
    await page.setContent('<li class="row">A</li><li class="row">B</li>');
    await expect(page.locator('.row')).toHaveCount(2);
  });

  test('a missing element with no look-alike stays missing', async ({ page }) => {
    await page.setContent('<h1>Welcome</h1>');
    await expect(page.locator('#delete-account')).toHaveCount(0);
  });

  test('css= opts a selector out of healing', async ({ page }) => {
    await page.setContent('<button id="save-button-v2">Save</button>');
    await expect(page.locator('css=#save-button')).toHaveCount(0);
  });

  test('getByRole keeps Playwright semantics', async ({ page }) => {
    await page.setContent('<button>Save</button><button>Save changes</button>');
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(1);
  });
});

plainTest.describe('pages without enableAutoHealing', () => {
  plainTest('a plain selector does not heal', async ({ page }) => {
    await page.setContent('<span id="balance-amount-v2">100 EUR</span>');
    await expect(page.locator('#balance-amount')).toHaveCount(0);
  });
});

plainTest.describe('toHealingSelector', () => {
  for (const [input, expected] of [
    ['#save', 'heal=#save'],
    ['//button[@id="x"]', 'heal=//button[@id="x"]'],
    ['internal:testid=[data-testid="login"s]', 'heal=[data-testid="login"]'],
    ['css=#save', 'css=#save'],
    ['internal:role=button[name="Save"s]', 'internal:role=button[name="Save"s]'],
    ['button:has-text("Save")', 'button:has-text("Save")'],
    ['#form >> button', '#form >> button'],
  ]) {
    plainTest(`${input} -> ${expected}`, () => {
      expect(toHealingSelector(input)).toBe(expected);
    });
  }
});
