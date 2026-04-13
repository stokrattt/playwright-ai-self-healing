const { chromium } = require('playwright');
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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const ai = new PlaywrightAISelfHealing({
    minSimilarityThreshold: 0.2,
    maxElementsToAnalyze: 25,
    findTimeout: 500,
  });

  try {
    await runClickScenario(page, ai);
    await runTypeScenario(page, ai);
    await runVisibilityScenario(page, ai);
    console.log('All runtime smoke scenarios passed');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
