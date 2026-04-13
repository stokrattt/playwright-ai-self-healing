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
      lastVerifiedAt: '2026-04-13T00:00:00.000Z',
      pageObject: 'LoginPage',
      testFile: 'tests/login.spec.ts',
      notes: 'login submit button',
    });

    await expect(store.get('[data-testid="save-button"]')).resolves.toBe('#save-button-renamed');

    const writtenFile = JSON.parse(fs.readFileSync(storePath, 'utf8')) as {
      version: number;
      selectors: Record<string, {
        healedSelector: string;
        originalSelector: string;
        timesUsed: number;
        pageObject?: string;
        testFile?: string;
        notes?: string;
      }>;
    };

    expect(writtenFile.version).toBe(1);
    expect(writtenFile.selectors['[data-testid="save-button"]'].healedSelector).toBe('#save-button-renamed');
    expect(writtenFile.selectors['[data-testid="save-button"]'].originalSelector).toBe('[data-testid="save-button"]');
    expect(writtenFile.selectors['[data-testid="save-button"]'].timesUsed).toBe(1);
    expect(writtenFile.selectors['[data-testid="save-button"]'].pageObject).toBe('LoginPage');
    expect(writtenFile.selectors['[data-testid="save-button"]'].testFile).toBe('tests/login.spec.ts');
    expect(writtenFile.selectors['[data-testid="save-button"]'].notes).toBe('login submit button');
  });

  it('keeps old and new locator metadata understandable across repeated writes', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'selector-store-'));
    const storePath = path.join(tempDir, 'selector-overrides.json');
    const store = new JsonFileSelectorStore(storePath);

    await store.set({
      originalSelector: '[data-testid="save-button"]',
      healedSelector: '#save-button-renamed',
      source: 'healed',
      updatedAt: '2026-04-13T00:00:00.000Z',
      lastVerifiedAt: '2026-04-13T00:00:00.000Z',
      pageObject: 'LoginPage',
    });

    await store.set({
      originalSelector: '[data-testid="save-button"]',
      healedSelector: '#save-button-renamed',
      source: 'stored',
      updatedAt: '2026-04-14T00:00:00.000Z',
      lastVerifiedAt: '2026-04-14T00:00:00.000Z',
    });

    const writtenFile = JSON.parse(fs.readFileSync(storePath, 'utf8')) as {
      selectors: Record<string, {
        originalSelector: string;
        healedSelector: string;
        updatedAt: string;
        lastVerifiedAt: string;
        timesUsed: number;
        pageObject?: string;
      }>;
    };

    const record = writtenFile.selectors['[data-testid="save-button"]'];
    expect(record.originalSelector).toBe('[data-testid="save-button"]');
    expect(record.healedSelector).toBe('#save-button-renamed');
    expect(record.updatedAt).toBe('2026-04-14T00:00:00.000Z');
    expect(record.lastVerifiedAt).toBe('2026-04-14T00:00:00.000Z');
    expect(record.timesUsed).toBe(2);
    expect(record.pageObject).toBe('LoginPage');
  });
});
