import { PlaywrightAISelfHealing } from '../src';
import { PlaywrightLocator, PlaywrightPage, SerializedElement } from '../src/types';
import { MemorySelectorStore } from '../src/selector-store';

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

describe('PlaywrightAISelfHealing', () => {
  it('returns the original locator and respects the provided timeout', async () => {
    const locator = createLocator();
    const evaluate = jest.fn(async () => []) as unknown as PlaywrightPage<MockLocator>['evaluate'];
    const page: PlaywrightPage<MockLocator> = {
      locator: jest.fn(() => locator),
      evaluate,
    };

    const ai = new PlaywrightAISelfHealing();
    const result = await ai.findElementUniversal(page, '[data-testid="submit"]', { timeout: 2500 });

    expect(result).toBe(locator);
    expect(locator.waitFor).toHaveBeenCalledWith({ timeout: 2500 });
  });

  it('returns a healed locator when the original selector stops working', async () => {
    const originalLocator = createLocator(async () => {
      throw new Error('not found');
    });
    const healedLocator = createLocator();

    const elements: SerializedElement[] = [
      {
        tagName: 'button',
        id: 'submit-new',
        className: 'primary',
        textContent: 'Submit',
        placeholder: '',
        name: '',
        type: 'button',
        role: 'button',
        ariaLabel: 'Submit form',
        title: '',
        value: '',
        href: '',
        src: '',
        alt: '',
      },
    ];

    const page: PlaywrightPage<MockLocator> = {
      locator: jest.fn((selector: string) => selector === '#submit-new' ? healedLocator : originalLocator),
      evaluate: jest.fn(async () => elements) as unknown as PlaywrightPage<MockLocator>['evaluate'],
    };

    const ai = new PlaywrightAISelfHealing({
      minSimilarityThreshold: 0.2,
      maxElementsToAnalyze: 10,
    });

    const result = await ai.findElementUniversal(page, 'submit');

    expect(result).toBe(healedLocator);
    expect(page.locator).toHaveBeenCalledWith('#submit-new');
  });

  it('heals renamed input fields using similar name attributes', async () => {
    const originalLocator = createLocator(async () => {
      throw new Error('not found');
    });
    const healedLocator = createLocator();

    const elements: SerializedElement[] = [
      {
        tagName: 'input',
        id: 'email-field-v2',
        className: '',
        textContent: '',
        placeholder: 'Email address',
        name: 'email-field-v2',
        type: 'text',
        role: '',
        ariaLabel: '',
        title: '',
        value: '',
        href: '',
        src: '',
        alt: '',
      },
    ];

    const page: PlaywrightPage<MockLocator> = {
      locator: jest.fn((selector: string) => selector === '#email-field-v2' ? healedLocator : originalLocator),
      evaluate: jest.fn(async () => elements) as unknown as PlaywrightPage<MockLocator>['evaluate'],
    };

    const ai = new PlaywrightAISelfHealing({
      minSimilarityThreshold: 0.2,
      maxElementsToAnalyze: 10,
    });

    const result = await ai.findElementUniversal(page, 'input[name="email-field"]');

    expect(result).toBe(healedLocator);
    expect(page.locator).toHaveBeenCalledWith('#email-field-v2');
  });

  it('refreshes cached DOM data after the page content changes', async () => {
    const originalLocator = createLocator(async () => {
      throw new Error('not found');
    });
    const healedButton = createLocator();
    const healedInput = createLocator();

    const buttonElements: SerializedElement[] = [
      {
        tagName: 'button',
        id: 'save-button-renamed',
        className: 'primary',
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
    ];

    const inputElements: SerializedElement[] = [
      {
        tagName: 'input',
        id: 'email-field-v2',
        className: '',
        textContent: '',
        placeholder: 'Email address',
        name: 'email-field-v2',
        type: 'text',
        role: '',
        ariaLabel: '',
        title: '',
        value: '',
        href: '',
        src: '',
        alt: '',
      },
    ];

    const evaluate = jest
      .fn()
      .mockResolvedValueOnce(buttonElements)
      .mockResolvedValueOnce(inputElements) as unknown as PlaywrightPage<MockLocator>['evaluate'];

    const page: PlaywrightPage<MockLocator> = {
      locator: jest.fn((selector: string) => {
        if (selector === '#save-button-renamed') {
          return healedButton;
        }
        if (selector === '#email-field-v2') {
          return healedInput;
        }
        return originalLocator;
      }),
      evaluate,
    };

    const ai = new PlaywrightAISelfHealing({
      minSimilarityThreshold: 0.2,
      maxElementsToAnalyze: 10,
      domCacheTTL: 30000,
    });

    const firstResult = await ai.findElementUniversal(page, 'save-button');
    const secondResult = await ai.findElementUniversal(page, 'input[name="email-field"]');

    expect(firstResult).toBe(healedButton);
    expect(secondResult).toBe(healedInput);
    expect(page.locator).toHaveBeenCalledWith('#email-field-v2');
  });

  it('reuses a stored selector override before re-running healing', async () => {
    const originalLocator = createLocator(async () => {
      throw new Error('not found');
    });
    const storedLocator = createLocator();
    const selectorStore = new MemorySelectorStore();

    selectorStore.set({
      originalSelector: '[data-testid="save-button"]',
      healedSelector: '#save-button-renamed',
      source: 'healed',
      updatedAt: new Date().toISOString(),
    });

    const page: PlaywrightPage<MockLocator> = {
      locator: jest.fn((selector: string) => selector === '#save-button-renamed' ? storedLocator : originalLocator),
      evaluate: jest.fn(async () => {
        throw new Error('healing should not run when stored selector works');
      }) as unknown as PlaywrightPage<MockLocator>['evaluate'],
    };

    const ai = new PlaywrightAISelfHealing({
      selectorStore,
    });

    const result = await ai.findElementUniversal(page, '[data-testid="save-button"]');

    expect(result).toBe(storedLocator);
    expect(page.locator).toHaveBeenNthCalledWith(1, '#save-button-renamed');
  });

  it('persists healed selectors to the configured selector store', async () => {
    const originalLocator = createLocator(async () => {
      throw new Error('not found');
    });
    const healedLocator = createLocator();
    const selectorStore = new MemorySelectorStore();

    const elements: SerializedElement[] = [
      {
        tagName: 'button',
        id: 'save-button-renamed',
        className: 'primary',
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
    ];

    const page: PlaywrightPage<MockLocator> = {
      locator: jest.fn((selector: string) => selector === '#save-button-renamed' ? healedLocator : originalLocator),
      evaluate: jest.fn(async () => elements) as unknown as PlaywrightPage<MockLocator>['evaluate'],
    };

    const ai = new PlaywrightAISelfHealing({
      minSimilarityThreshold: 0.2,
      selectorStore,
      selectorContext: {
        pageObject: 'LoginPage',
      },
    });

    await ai.findElementUniversal(page, '[data-testid="save-button"]', {
      context: {
        testFile: 'tests/login.spec.ts',
        notes: 'login submit button',
      },
    });

    expect(selectorStore.get('[data-testid="save-button"]')).toBe('#save-button-renamed');
  });
});
