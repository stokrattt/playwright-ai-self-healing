import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createProjectSelfHealing } from '../src';
import { PlaywrightLocator, PlaywrightPage } from '../src/types';

type MockLocator = PlaywrightLocator & {
  waitFor: jest.Mock<Promise<void>, [{ timeout?: number; state?: 'attached' | 'detached' | 'visible' | 'hidden' }?]>;
};

function createLocator(waitForImpl?: () => Promise<void>): MockLocator {
  return {
    waitFor: jest.fn(waitForImpl ?? (async () => undefined)),
    fill: jest.fn(async () => undefined),
    click: jest.fn(async () => undefined),
    textContent: jest.fn(async () => null),
  };
}

describe('createProjectSelfHealing', () => {
  it('writes learned selectors by default', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-self-healing-'));
    const storePath = path.join(tempDir, 'playwright', '.healed-selectors.json');

    const originalLocator = createLocator(async () => {
      throw new Error('not found');
    });
    const healedLocator = createLocator();

    const page: PlaywrightPage<MockLocator> = {
      locator: jest.fn((selector: string) => selector === '#save-button-renamed' ? healedLocator : originalLocator),
      evaluate: jest.fn(async () => [
        {
          tagName: 'button',
          id: 'save-button-renamed',
          className: '',
          textContent: 'Save',
          placeholder: '',
          name: '',
          type: 'button',
          role: 'button',
          ariaLabel: '',
          title: '',
          value: '',
          href: '',
          src: '',
          alt: '',
        },
      ]) as unknown as PlaywrightPage<MockLocator>['evaluate'],
    };

    const ai = createProjectSelfHealing(
      { minSimilarityThreshold: 0.2 },
      { selectorStorePath: storePath, env: {} }
    );

    await ai.findElementUniversal(page, '[data-testid="save-button"]');

    const stored = JSON.parse(await fs.readFile(storePath, 'utf8')) as {
      selectors: Record<string, { healedSelector: string }>;
    };
    expect(stored.selectors['[data-testid="save-button"]'].healedSelector).toBe('#save-button-renamed');
  });

  it('still writes learned selectors on CI by default', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-self-healing-ci-write-'));
    const storePath = path.join(tempDir, 'playwright', '.healed-selectors.json');

    const originalLocator = createLocator(async () => {
      throw new Error('not found');
    });
    const healedLocator = createLocator();

    const page: PlaywrightPage<MockLocator> = {
      locator: jest.fn((selector: string) => selector === '#save-button-renamed' ? healedLocator : originalLocator),
      evaluate: jest.fn(async () => [
        {
          tagName: 'button',
          id: 'save-button-renamed',
          className: '',
          textContent: 'Save',
          placeholder: '',
          name: '',
          type: 'button',
          role: 'button',
          ariaLabel: '',
          title: '',
          value: '',
          href: '',
          src: '',
          alt: '',
        },
      ]) as unknown as PlaywrightPage<MockLocator>['evaluate'],
    };

    const ai = createProjectSelfHealing(
      { minSimilarityThreshold: 0.2 },
      { selectorStorePath: storePath, env: { CI: 'true' } }
    );

    await ai.findElementUniversal(page, '[data-testid="save-button"]');

    const stored = JSON.parse(await fs.readFile(storePath, 'utf8')) as {
      selectors: Record<string, { healedSelector: string }>;
    };
    expect(stored.selectors['[data-testid="save-button"]'].healedSelector).toBe('#save-button-renamed');
  });

  it('supports explicit read-only mode when a pipeline must avoid writes', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-self-healing-ci-'));
    const storePath = path.join(tempDir, 'playwright', '.healed-selectors.json');

    await fs.mkdir(path.dirname(storePath), { recursive: true });
    await fs.writeFile(
      storePath,
      JSON.stringify({
        version: 1,
        selectors: {
          '[data-testid="save-button"]': {
            originalSelector: '[data-testid="save-button"]',
            healedSelector: '#save-button-renamed',
            source: 'healed',
            updatedAt: '2026-04-13T00:00:00.000Z',
          },
        },
      }, null, 2),
      'utf8'
    );

    const originalLocator = createLocator(async () => {
      throw new Error('not found');
    });
    const storedLocator = createLocator();

    const page: PlaywrightPage<MockLocator> = {
      locator: jest.fn((selector: string) => selector === '#save-button-renamed' ? storedLocator : originalLocator),
      evaluate: jest.fn(async () => {
        throw new Error('healing should not run when stored selector works');
      }) as unknown as PlaywrightPage<MockLocator>['evaluate'],
    };

    const ai = createProjectSelfHealing(
      {},
      { selectorStorePath: storePath, selectorStoreMode: 'read', env: { CI: 'true' } }
    );

    const result = await ai.findElementUniversal(page, '[data-testid="save-button"]');

    expect(result).toBe(storedLocator);
    const stored = JSON.parse(await fs.readFile(storePath, 'utf8')) as {
      selectors: Record<string, { updatedAt: string }>;
    };
    expect(stored.selectors['[data-testid="save-button"]'].updatedAt).toBe('2026-04-13T00:00:00.000Z');
  });
});
