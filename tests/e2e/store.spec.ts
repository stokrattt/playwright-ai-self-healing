import { promises as fs } from 'fs';
import { createProjectSelfHealing, createSelfHealing, HealedSelectorRecord, MemorySelectorStore } from '../../dist';
import { test, expect, FIND_TIMEOUT } from './fixtures';

class RecordingStore extends MemorySelectorStore {
  writes: HealedSelectorRecord[] = [];

  set(record: HealedSelectorRecord): void {
    this.writes.push(record);
    super.set(record);
  }
}

const RENAMED = '<button id="save-v2">Save</button>';
const ROLE = 'internal:role=button[name="Save"s]';

test.describe('selector store', () => {
  test('persists the healed selector', async ({ page }) => {
    const store = new RecordingStore();
    const ai = createSelfHealing({ findTimeout: FIND_TIMEOUT, selectorStore: store });
    await page.setContent(RENAMED);

    await ai.findElementUniversal(page, '#save');

    expect(store.get('#save')).toBe(ROLE);
    expect(store.writes.map(record => record.source)).toEqual(['healed']);
  });

  test('reuses the stored selector on the next call', async ({ page }) => {
    const store = new RecordingStore();
    const ai = createSelfHealing({ findTimeout: FIND_TIMEOUT, selectorStore: store });
    await page.setContent(RENAMED);

    await ai.findElementUniversal(page, '#save');
    const second = await ai.findElementUniversal(page, '#save');

    expect(store.writes.map(record => record.source)).toEqual(['healed', 'stored']);
    await expect(second!).toHaveId('save-v2');
  });

  test('prefers the stored selector over a fresh heal', async ({ page }) => {
    const store = new MemorySelectorStore();
    const ai = createSelfHealing({ findTimeout: FIND_TIMEOUT, selectorStore: store });
    store.set({ originalSelector: '#save', healedSelector: '#save-v2', source: 'healed', updatedAt: new Date().toISOString() });
    await page.setContent('<button id="save-v2">Old save</button><button id="save1">New save</button>');
    // Precondition: a fresh heal picks "save1" on this page.
    await expect(page.locator('heal=#save')).toHaveId('save1');

    const locator = await ai.findElementUniversal(page, '#save');

    await expect(locator!).toHaveId('save-v2');
  });

  test('resets the override when the original works again', async ({ page }) => {
    const store = new RecordingStore();
    const ai = createSelfHealing({ findTimeout: FIND_TIMEOUT, selectorStore: store });
    await page.setContent(RENAMED);
    await ai.findElementUniversal(page, '#save');

    await page.setContent('<button id="save">Back to the old id</button>');
    const locator = await ai.findElementUniversal(page, '#save');

    await expect(locator!).toHaveId('save');
    expect(store.get('#save')).toBe('#save');
    expect(store.writes.at(-1)?.source).toBe('original');
  });

  test('writes no record while the original works', async ({ page }) => {
    const store = new RecordingStore();
    const ai = createSelfHealing({ findTimeout: FIND_TIMEOUT, selectorStore: store });
    await page.setContent('<button id="save">Save</button>');

    await ai.findElementUniversal(page, '#save');

    expect(store.writes).toEqual([]);
  });

  test('createProjectSelfHealing writes the JSON file', async ({ page }, testInfo) => {
    const storePath = testInfo.outputPath('healed-selectors.json');
    const ai = createProjectSelfHealing({ findTimeout: FIND_TIMEOUT }, { selectorStorePath: storePath, env: {} });
    await page.setContent(RENAMED);

    await ai.findElementUniversal(page, '#save', { context: { testFile: 'store.spec.ts' } });

    const file = JSON.parse(await fs.readFile(storePath, 'utf8'));
    expect(file.version).toBe(1);
    expect(file.selectors['#save']).toMatchObject({
      originalSelector: '#save',
      healedSelector: ROLE,
      source: 'healed',
      timesUsed: 1,
      testFile: 'store.spec.ts',
    });
  });

  test('createProjectSelfHealing reuses the JSON file in a new instance', async ({ page }, testInfo) => {
    const storePath = testInfo.outputPath('healed-selectors.json');
    const options = { selectorStorePath: storePath, env: {} };
    await page.setContent(RENAMED);

    await createProjectSelfHealing({ findTimeout: FIND_TIMEOUT }, options).findElementUniversal(page, '#save');
    const locator = await createProjectSelfHealing({ findTimeout: FIND_TIMEOUT }, options).findElementUniversal(page, '#save');

    await expect(locator!).toHaveId('save-v2');
    const file = JSON.parse(await fs.readFile(storePath, 'utf8'));
    expect(file.selectors['#save']).toMatchObject({ source: 'stored', timesUsed: 2 });
  });
});
