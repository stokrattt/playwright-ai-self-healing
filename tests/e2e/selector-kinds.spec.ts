import { test, expect } from './fixtures';

const PAGE = `
  <form>
    <button id="pay-now-btn" class="btn-primary-v2" name="pay-action-v2"
      data-testid="pay-v2" data-test-id="pay-v2" data-test="pay-v2" data-qa="pay-v2">Place order</button>
    <button id="cancel-order" class="btn-ghost">Cancel</button>
  </form>`;

test.describe('heal= accepts every kind of original selector', () => {
  const originals = [
    '#pay-now',
    '.btn-primary',
    'button[name="pay-action"]',
    '[data-testid="pay"]',
    '[data-test-id="pay"]',
    '[data-test="pay"]',
    '[data-qa="pay"]',
    '//button[@id="pay-now"]',
    'xpath=//button[@id="pay-now"]',
    'role=button[name="Submit order"]',
  ];

  for (const original of originals) {
    test(`heals ${original}`, async ({ page }) => {
      await page.setContent(PAGE);
      await expect(page.locator(`heal=${original}`)).toHaveText('Place order');
    });
  }

  test('keeps an XPath original while it still matches', async ({ page }) => {
    await page.setContent(PAGE);
    await expect(page.locator('heal=//button[@id="cancel-order"]')).toHaveText('Cancel');
  });
});
