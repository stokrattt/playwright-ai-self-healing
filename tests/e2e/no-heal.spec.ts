import { createSelfHealing } from '../../dist';
import { test, expect, FIND_TIMEOUT } from './fixtures';

const ai = createSelfHealing({ findTimeout: FIND_TIMEOUT });

const BLOG = '<h1>Blog</h1><article><p>First post</p><a href="/about">About us</a></article>';
const CANCEL_ONLY = '<p>Delete your account?</p><button id="cancel-button">Cancel</button>';
const HIDDEN_ORIGINAL = '<button id="save" hidden>Save</button><button id="save-copy">Save</button>';

test.describe('heal= does not invent a match', () => {
  test('element absent on an unrelated page', async ({ page }) => {
    await page.setContent(BLOG);
    await expect(page.locator('heal=#checkout-submit')).toHaveCount(0);
  });

  test('a similar but different element does not stand in', async ({ page }) => {
    await page.setContent(CANCEL_ONLY);
    await expect(page.locator('heal=#confirm-button')).toHaveCount(0);
  });

  test('a hidden original is kept as is', async ({ page }) => {
    await page.setContent(HIDDEN_ORIGINAL);
    await expect(page.locator('heal=#save')).toBeHidden();
    await expect(page.locator('heal=#save')).toHaveId('save');
  });
});

test.describe('findElementUniversal does not invent a match', () => {
  test('element absent on an unrelated page', async ({ page }) => {
    await page.setContent(BLOG);
    expect(await ai.findElementUniversal(page, '#checkout-submit')).toBeNull();
  });

  test('a similar but different element does not stand in', async ({ page }) => {
    await page.setContent(CANCEL_ONLY);
    expect(await ai.findElementUniversal(page, '#confirm-button')).toBeNull();
  });

  test('a hidden original is kept as is', async ({ page }) => {
    await page.setContent(HIDDEN_ORIGINAL);
    const locator = await ai.findElementUniversal(page, '#save');
    expect(locator).not.toBeNull();
    await expect(locator!).toBeHidden();
    await expect(locator!).toHaveId('save');
  });
});
