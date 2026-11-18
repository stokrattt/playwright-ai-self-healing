import { parseSelector, scoreElement } from '../src/page-scripts';
import { DEFAULT_CONFIG } from '../src';
import { SerializedElement } from '../src/types';

const element = (overrides: Partial<SerializedElement>): SerializedElement => ({
  tagName: 'div', id: '', className: '', textContent: '', placeholder: '', name: '', type: '',
  role: '', ariaLabel: '', title: '', value: '', href: '', src: '', alt: '', ...overrides,
});

describe('parseSelector', () => {
  it.each([
    ['input[name="email"]', 'input', [{ attr: 'name', value: 'email' }]],
    ['//button[@id="pay-now"]', 'button', [{ attr: 'id', value: 'pay-now' }]],
    ['xpath=//a[normalize-space(.)="Docs"]', 'a', [{ attr: 'text', value: 'Docs' }]],
    ['internal:role=button[name="Place order"s]', '', [{ attr: 'role', value: 'button' }, { attr: 'accessible-name', value: 'Place order' }]],
    ['internal:label="Email"s', '', [{ attr: 'accessible-name', value: 'Email' }]],
    ['internal:attr=[placeholder="Search"s]', '', [{ attr: 'placeholder', value: 'Search' }]],
    ['save-button', '', [{ attr: 'any', value: 'save-button' }]],
  ])('reads %s', (selector, tag, tokens) => {
    expect(parseSelector(selector)).toEqual({ tag, tokens });
  });
});

describe('scoreElement', () => {
  it('matches a readable id replaced by a generated one through the text', () => {
    const score = scoreElement('#pay-now', element({ tagName: 'button', id: ':r1:', textContent: 'Pay now' }), DEFAULT_CONFIG);
    expect(score).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minSimilarityThreshold);
  });

  it('keeps an unrelated element under the threshold', () => {
    const score = scoreElement('#delete-account', element({ tagName: 'h1', textContent: 'Welcome' }), DEFAULT_CONFIG);
    expect(score).toBeLessThan(DEFAULT_CONFIG.minSimilarityThreshold);
  });
});
