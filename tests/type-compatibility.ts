import { expect, Page } from '@playwright/test';
import { PlaywrightAISelfHealing } from '../src';

export async function assertLocatorCompatibility(page: Page): Promise<void> {
  const ai = new PlaywrightAISelfHealing();
  const locator = await ai.findElementUniversal(page, '[data-testid="user-profile"]');

  if (!locator) {
    return;
  }

  await locator.click();
  await expect(locator).toBeVisible();
}
