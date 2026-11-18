const { chromium, selectors } = require('playwright');
const { expect } = require('@playwright/test');
const { PlaywrightAISelfHealing } = require('../dist');

async function runClickScenario(page, ai) {
  await page.setContent(`
    <html>
      <body>
        <button
          id="save-button-renamed"
          class="primary-action"
          onclick="window.__clicked = (window.__clicked || 0) + 1"
        >
          Save changes
        </button>
      </body>
    </html>
  `);

  const healedButton = await ai.findElementUniversal(page, 'save-button', { timeout: 500 });
  if (!healedButton) {
    throw new Error('Click scenario: healed button was not found');
  }

  await healedButton.click();
  const clickCount = await page.evaluate(() => window.__clicked || 0);
  if (clickCount !== 1) {
    throw new Error(`Click scenario: expected click count 1, got ${clickCount}`);
  }

  console.log('PASS click -> healed locator clicked the renamed button');
}

async function runTypeScenario(page, ai) {
  await page.setContent(`
    <html>
      <body>
        <label for="email-field-v2">Work email</label>
        <input
          id="email-field-v2"
          name="email-field-v2"
          placeholder="Email address"
          type="text"
          style="display:block; width:240px; height:32px;"
        />
      </body>
    </html>
  `);

  const healedInput = await ai.findElementUniversal(page, 'input[name="email-field"]', { timeout: 500 });
  if (!healedInput) {
    throw new Error('Type scenario: healed input was not found');
  }

  await healedInput.fill('alice');
  await healedInput.type('@example.com');
  const value = await healedInput.inputValue();
  if (value !== 'alice@example.com') {
    throw new Error(`Type scenario: expected alice@example.com, got ${value}`);
  }

  console.log('PASS fill/type -> healed locator accepted fill() and type()');
}

async function runVisibilityScenario(page, ai) {
  await page.setContent(`
    <html>
      <body>
        <div
          id="status-banner-v2"
          role="status"
          style="display:block; padding:8px; background:#d1fae5; color:#065f46;"
        >
          Profile saved successfully
        </div>
      </body>
    </html>
  `);

  const healedBanner = await ai.findElementUniversal(page, 'status-banner', { timeout: 500 });
  if (!healedBanner) {
    throw new Error('Visibility scenario: healed banner was not found');
  }

  await expect(healedBanner).toBeVisible();
  const isVisible = await healedBanner.isVisible();
  if (!isVisible) {
    throw new Error('Visibility scenario: locator resolved but isVisible() returned false');
  }

  console.log('PASS visible -> healed locator works with expect(...).toBeVisible()');
}

async function runUniqueSelectorScenario(page, ai) {
  const filler = Array.from({ length: 40 }, (_, i) => `<p>row ${i}</p>`).join('');
  await page.setContent(`
    <html>
      <body>
        ${filler}
        <div role="button">Cancel</div>
        <div role="button" onclick="window.__saved = true">Save</div>
      </body>
    </html>
  `);

  // Both candidates share role="button", and the target sits past maxElementsToAnalyze in DOM order.
  const healedButton = await ai.findElementUniversal(page, 'save-btn', { timeout: 500 });
  if (!healedButton) {
    throw new Error('Unique selector scenario: healed button was not found');
  }

  await healedButton.click();
  const saved = await page.evaluate(() => window.__saved === true);
  if (!saved) {
    throw new Error('Unique selector scenario: the click did not land on the Save button');
  }

  console.log('PASS unique -> healed selector picks one element among look-alikes');
}

async function runAssertionEngineScenario(page) {
  await page.setContent(`
    <html>
      <body>
        <span id="balance-amount-v2">100 EUR</span>
        <div id="toast-success-v2" style="display:none">Saved</div>
        <input type="hidden" name="csrf-token-v2" value="abc" />
        <h1>Welcome</h1>
      </body>
    </html>
  `);

  // The heal= engine runs on every assertion retry, so any matcher works on a renamed element.
  await expect(page.locator('heal=#balance-amount')).toHaveText('100 EUR', { timeout: 3000 });
  await expect(page.locator('heal=#toast-success')).toBeHidden({ timeout: 3000 });
  await expect(page.locator('heal=input[name="csrf-token"]')).toHaveValue('abc', { timeout: 3000 });
  // Nothing on the page resembles it, so it must stay missing instead of healing into the heading.
  await expect(page.locator('heal=#delete-account')).toHaveCount(0, { timeout: 3000 });

  console.log('PASS assertions -> heal= locator works with toHaveText, toBeHidden, toHaveValue, toHaveCount');
}

async function runLocatorPriorityScenario(page) {
  const { MemorySelectorStore } = require('../dist');
  const store = new MemorySelectorStore();
  const ai = new PlaywrightAISelfHealing({ findTimeout: 500, selectorStore: store });

  const expectations = [
    ['<button data-test-id="buy-now-btn" id="buy">Buy</button>', '[data-test-id="buy-now"]', '[data-test-id="buy-now-btn"]'],
    ['<button class="btn">Place order</button><button class="btn">Cancel</button>', '#place-order-btn', 'internal:role=button[name="Place order"s]'],
    ['<div class="promo-banner-v2"></div><div class="footer"></div>', '.promo-banner', 'div.promo-banner-v2'],
    ['<div><span class="tag">a</span></div><div><span class="tag">a</span></div>', 'span.tag-a', 'xpath=/html[1]/body[1]/div[1]/span[1]'],
  ];

  for (const [html, original, expected] of expectations) {
    await page.setContent(html);
    await ai.findElementUniversal(page, original);
    const healed = store.get(original);
    if (healed !== expected) {
      throw new Error(`Locator priority scenario: ${original} healed to ${healed}, expected ${expected}`);
    }
  }

  console.log('PASS priority -> test id, then getBy*, then CSS, then XPath');
}

async function main() {
  const ai = new PlaywrightAISelfHealing({
    minSimilarityThreshold: 0.4,
    maxElementsToAnalyze: 25,
    findTimeout: 500,
  });
  await ai.registerSelectorEngine(selectors);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await runClickScenario(page, ai);
    await runTypeScenario(page, ai);
    await runVisibilityScenario(page, ai);
    await runUniqueSelectorScenario(page, ai);
    await runAssertionEngineScenario(page);
    await runLocatorPriorityScenario(page);
    console.log('All runtime smoke scenarios passed');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
