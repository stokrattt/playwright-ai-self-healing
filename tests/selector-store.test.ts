import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { JsonFileSelectorStore } from '../src/selector-store';

describe('JsonFileSelectorStore', () => {
  it('persists selector overrides to a project-owned JSON file', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'selector-store-'));
    const storePath = path.join(tempDir, 'selector-overrides.json');
    const store = new JsonFileSelectorStore(storePath);

    await store.set({
      originalSelector: '[data-testid="save-button"]',
      healedSelector: '#save-button-renamed',
      source: 'healed',
      updatedAt: '2026-04-13T00:00:00.000Z',
    });

    await expect(store.get('[data-testid="save-button"]')).resolves.toBe('#save-button-renamed');

    const writtenFile = JSON.parse(fs.readFileSync(storePath, 'utf8')) as {
      version: number;
      selectors: Record<string, { healedSelector: string }>;
    };

    expect(writtenFile.version).toBe(1);
    expect(writtenFile.selectors['[data-testid="save-button"]'].healedSelector).toBe('#save-button-renamed');
  });
});
