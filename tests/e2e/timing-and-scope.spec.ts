import { test, expect } from './fixtures';

test.describe('heal= across time and scope', () => {
  test('waits for an element that appears after a delay', async ({ page }) => {
    await page.setContent(`<script>
      setTimeout(() => document.body.insertAdjacentHTML('beforeend', '<button id="save-button-v2">Save</button>'), 700);
    </script>`);
    await expect(page.locator('heal=#save-button')).toHaveText('Save');
  });

  test('heals inside an iframe through frameLocator', async ({ page }) => {
    await page.setContent('<iframe srcdoc="<button id=&quot;pay-now-v2&quot;>Pay now</button>"></iframe>');
    await expect(page.frameLocator('iframe').locator('heal=#pay-now')).toHaveText('Pay now');
  });

  test('heals inside a chained parent locator only', async ({ page }) => {
    await page.setContent(
      '<input id="email-input-v2" placeholder="Newsletter">' +
      '<form id="login-form"><input id="email-field" placeholder="Login"></form>'
    );
    // Precondition: page-wide, the newsletter input is the better match.
    await expect(page.locator('heal=#email-input')).toHaveAttribute('placeholder', 'Newsletter');
    await expect(page.locator('#login-form').locator('heal=#email-input')).toHaveAttribute('placeholder', 'Login');
  });
});

test.describe('open shadow DOM', () => {
  const SHADOW = `<div id="host"></div><script>
    document.getElementById('host').attachShadow({ mode: 'open' }).innerHTML = '<button id="pay-now-v2">Pay now</button>';
  </script>`;

  test('plain CSS reaches the shadow element (control)', async ({ page }) => {
    await page.setContent(SHADOW);
    await expect(page.locator('#pay-now-v2')).toHaveText('Pay now');
  });

  test('heal= finds an unchanged shadow element', async ({ page }) => {
    await page.setContent(SHADOW);
    await expect(page.locator('heal=#pay-now-v2')).toHaveText('Pay now');
  });

  test('heal= heals a renamed shadow element', async ({ page }) => {
    await page.setContent(SHADOW);
    await expect(page.locator('heal=#pay-now')).toHaveText('Pay now');
  });
});

test.describe('heal= does not jump to a look-alike too early', () => {
  test('waits for the original that renders late instead of clicking its look-alike', async ({ page }) => {
    await page.setContent(`<button id="submit-draft" onclick="window.hit = 'draft'">Submit draft</button>
      <script>
        setTimeout(() => document.body.insertAdjacentHTML('beforeend',
          '<button id="submit" onclick="window.hit = \\'submit\\'">Submit</button>'), 500);
      </script>`);
    await page.locator('heal=#submit').click();
    expect(await page.evaluate(() => (window as unknown as { hit: string }).hit)).toBe('submit');
  });

  test('keeps an unchanged element inside shadow DOM over a light-DOM look-alike', async ({ page }) => {
    await page.setContent(`<button id="pay-later">Pay later</button><div id="host"></div><script>
      document.getElementById('host').attachShadow({ mode: 'open' }).innerHTML = '<button id="pay">Pay</button>';
    </script>`);
    await expect(page.locator('heal=#pay')).toHaveText('Pay');
  });

  test('an XPath under a chained parent stays inside that parent', async ({ page }) => {
    await page.setContent('<div id="first"><button id="go">first</button></div><div id="second"><button id="go-v2">second</button></div>');
    await expect(page.locator('#second').locator('heal=//button[@id="go"]')).toHaveText('second');
  });
});
