"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.levenshteinRatio = levenshteinRatio;
exports.wordOverlap = wordOverlap;
exports.parseSelector = parseSelector;
exports.elementValues = elementValues;
exports.scoreElement = scoreElement;
exports.implicitRole = implicitRole;
exports.labelText = labelText;
exports.accessibleName = accessibleName;
exports.serializeElement = serializeElement;
exports.deepQueryAll = deepQueryAll;
exports.collectCandidates = collectCandidates;
exports.countRoles = countRoles;
exports.selectorCandidates = selectorCandidates;
exports.matchOriginal = matchOriginal;
exports.healBest = healBest;
exports.collectElementsScript = collectElementsScript;
exports.healingEngineScript = healingEngineScript;
/**
 * Plain Levenshtein similarity in [0, 1]
 */
function levenshteinRatio(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    if (len1 === 0)
        return len2 === 0 ? 1 : 0;
    if (len2 === 0)
        return 0;
    let previous = Array.from({ length: len2 + 1 }, (_, j) => j);
    for (let i = 1; i <= len1; i++) {
        const current = [i];
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
        }
        previous = current;
    }
    return 1 - previous[len2] / Math.max(len1, len2);
}
/**
 * Dice coefficient over words: `save-button` vs `save-button-v2` share two of five words, 0.8.
 */
function wordOverlap(a, b) {
    const words = (text) => new Set(text.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
    const wordsA = words(a);
    const wordsB = words(b);
    if (wordsA.size === 0 || wordsB.size === 0)
        return 0;
    let shared = 0;
    wordsA.forEach(word => {
        if (wordsB.has(word))
            shared++;
    });
    return (2 * shared) / (wordsA.size + wordsB.size);
}
/**
 * Pull the values a selector identifies an element by: CSS, XPath, Playwright `role=` / `text=`
 * / `internal:*` (what getBy* locators compile to), or a bare word such as `save-button`.
 * `attr: 'any'` is compared with every identifying attribute.
 */
// ponytail: regex parsing; tokens of ancestor steps count as if they were the target's.
// A real selector parser if that starts to mislead.
function parseSelector(selector) {
    const knownTags = new Set([
        'a', 'button', 'input', 'select', 'textarea', 'form', 'img', 'label', 'div', 'span', 'p', 'li', 'ul', 'ol',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'nav', 'header', 'footer', 'section', 'table', 'tr', 'td', 'svg',
    ]);
    const trimmed = selector.trim();
    const tokens = [];
    const quoted = (value) => value.replace(/^["']|["'][is]?$/g, '');
    const engine = trimmed.match(/^(?:internal:)?(role|text|label)=(.*)$/s);
    if (engine) {
        const [, kind, body] = engine;
        if (kind === 'role') {
            tokens.push({ attr: 'role', value: body.match(/^[\w-]+/)?.[0] ?? '' });
            const name = body.match(/\[\s*name\s*=\s*(["'].*?["'][is]?)\s*\]/);
            if (name)
                tokens.push({ attr: 'accessible-name', value: quoted(name[1]) });
        }
        else {
            tokens.push({ attr: kind === 'text' ? 'text' : 'accessible-name', value: quoted(body) });
        }
        return { tag: '', tokens };
    }
    if (/^(xpath=|\/|\()/.test(trimmed)) {
        const xpath = trimmed.replace(/^xpath=/, '');
        for (const match of xpath.matchAll(/@([\w-]+)\s*=\s*["']([^"']*)["']/g)) {
            tokens.push({ attr: match[1], value: match[2] });
        }
        for (const match of xpath.matchAll(/contains\(\s*@([\w-]+)\s*,\s*["']([^"']*)["']\s*\)/g)) {
            tokens.push({ attr: match[1], value: match[2] });
        }
        for (const match of xpath.matchAll(/(?:text\(\)|normalize-space\([^)]*\)|\.)\s*=\s*["']([^"']*)["']/g)) {
            tokens.push({ attr: 'text', value: match[1] });
        }
        const lastStep = xpath.match(/\/([a-z][a-z0-9]*)(?:\[[^\]]*\])*\s*$/i)?.[1].toLowerCase() ?? '';
        return { tag: knownTags.has(lastStep) ? lastStep : '', tokens };
    }
    const css = trimmed.replace(/^internal:attr=/, '');
    for (const match of css.matchAll(/:has-text\(\s*["'](.+?)["']\s*\)/g)) {
        tokens.push({ attr: 'text', value: match[1] });
    }
    for (const match of css.matchAll(/\[\s*([\w-]+)\s*[~|^$*]?=\s*["']?([^"'\]]+?)["']?\s*[is]?\s*\]/g)) {
        tokens.push({ attr: match[1], value: match[2] });
    }
    const outsideBrackets = css.replace(/\[[^\]]*\]|\([^)]*\)/g, ' ');
    for (const match of outsideBrackets.matchAll(/([#.])([\w-]+)/g)) {
        tokens.push({ attr: match[1] === '#' ? 'id' : 'class', value: match[2] });
    }
    const lastCompound = outsideBrackets.trim().split(/[\s>+~]+/).pop() ?? '';
    const leadingWord = lastCompound.match(/^[a-z][a-z0-9]*/i)?.[0].toLowerCase() ?? '';
    const tag = knownTags.has(leadingWord) ? leadingWord : '';
    if (tokens.length === 0 && !tag && trimmed) {
        tokens.push({ attr: 'any', value: trimmed });
    }
    return { tag, tokens };
}
function elementValues(element) {
    const present = (...values) => values.filter((value) => !!value);
    const testIds = present(element.testId);
    return {
        id: present(element.id),
        'data-testid': testIds,
        'data-test-id': testIds,
        'data-test': testIds,
        'data-qa': testIds,
        name: present(element.name),
        class: present(...(element.className || '').split(/\s+/)),
        'aria-label': present(element.ariaLabel),
        'accessible-name': present(element.accessibleName, element.ariaLabel, element.textContent),
        placeholder: present(element.placeholder),
        title: present(element.title),
        text: present(element.textContent),
        type: present(element.type),
        role: present(element.role),
        href: present(element.href),
        alt: present(element.alt),
        value: present(element.value),
    };
}
/**
 * Score how well an element matches what the selector identified it by.
 * Each selector value is compared with the element's value of the same attribute: characters
 * (levenshteinWeight) and words (semanticWeight), and with its other identifying values at a discount
 * (a data-testid renamed into an id, a readable id replaced by a generated one). structuralWeight rewards the same
 * tag or role and only counts when the selector names a tag.
 */
function scoreElement(selector, element, weights) {
    const tagRoles = { a: 'link', button: 'button', input: 'textbox', select: 'combobox', textarea: 'textbox' };
    const identifying = ['id', 'data-testid', 'name', 'class', 'accessible-name', 'aria-label', 'placeholder', 'title', 'text'];
    const { levenshteinWeight, semanticWeight, structuralWeight } = weights;
    const { tag, tokens } = parseSelector(selector);
    const values = elementValues(element);
    // Words that name the kind of element, not which one it is.
    const generic = new Set(['button', 'btn', 'input', 'field', 'link', 'icon', 'wrapper', 'container', 'label', 'text', 'item', 'new', 'old']);
    const splitWords = (text) => text.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const distinctWords = (text) => splitWords(text).filter(word => !generic.has(word) && !/^v?\d+$/.test(word));
    // The selector may name this element's own kind: `toggle-checkbox` on a checkbox is just `toggle`.
    // Only control kinds: a `footer-save` id must not read as `save` on the <footer> itself.
    const controlTags = ['button', 'input', 'select', 'textarea', 'a', 'img'];
    const kindWords = new Set([controlTags.includes(element.tagName) ? element.tagName : '', element.type, element.role]
        .filter(Boolean).map(word => word.toLowerCase()));
    if (kindWords.has('button'))
        kindWords.add('btn');
    if (kindWords.has('img'))
        kindWords.add('image');
    if (kindWords.has('select'))
        kindWords.add('dropdown');
    const rawScore = (a, b) => levenshteinWeight * levenshteinRatio(a.toLowerCase(), b.toLowerCase()) + semanticWeight * wordOverlap(a, b);
    const pairScore = (a, b) => {
        const withoutKind = splitWords(a).filter(word => !kindWords.has(word)).join(' ');
        const score = withoutKind && withoutKind !== splitWords(a).join(' ')
            ? Math.max(rawScore(a, b), rawScore(withoutKind, b))
            : rawScore(a, b);
        // `confirm-button` vs `cancel-button`: a shared generic word must not carry the match on its own.
        const wordsA = distinctWords(a);
        const wordsB = distinctWords(b);
        const related = wordsA.length === 0 || wordsB.length === 0 ||
            wordsA.some(x => wordsB.some(y => levenshteinRatio(x, y) >= 0.75));
        return related ? score : score / 2;
    };
    let attributeScore = 0;
    for (const token of tokens) {
        const ownValues = token.attr === 'any' ? [] : values[token.attr] ?? [];
        const otherValues = identifying.filter(attr => attr !== token.attr).flatMap(attr => values[attr] ?? []);
        let best = 0;
        for (const value of ownValues)
            best = Math.max(best, pairScore(token.value, value));
        // Another attribute counts at a discount: an old id may live on as a generated id plus the same text,
        // and an element whose own attribute matches beats a look-alike that only matches by text (a label).
        const discount = token.attr === 'any' ? 1 : 0.85;
        for (const value of otherValues)
            best = Math.max(best, discount * pairScore(token.value, value));
        attributeScore += best / tokens.length;
    }
    let totalScore = attributeScore / (levenshteinWeight + semanticWeight || 1);
    if (tag) {
        const sameKind = element.tagName === tag || element.role === (tagRoles[tag] ?? tag);
        totalScore = (totalScore * (levenshteinWeight + semanticWeight) + (sameKind ? structuralWeight : 0)) /
            (levenshteinWeight + semanticWeight + structuralWeight || 1);
    }
    return Math.max(0, Math.min(totalScore, 1));
}
// ---------------------------------------------------------------------------------------------
// DOM side: called only inside the page.
// ---------------------------------------------------------------------------------------------
/**
 * Explicit role, or the implicit one for the elements Playwright's getByRole is usually used on.
 */
// ponytail: covers interactive elements, headings and images, not the whole ARIA table.
function implicitRole(el) {
    const explicit = el.getAttribute('role');
    if (explicit)
        return explicit.split(/\s+/)[0];
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (tag === 'button')
        return 'button';
    if ((tag === 'a' || tag === 'area') && el.hasAttribute('href'))
        return 'link';
    if (/^h[1-6]$/.test(tag))
        return 'heading';
    if (tag === 'textarea')
        return 'textbox';
    if (tag === 'select')
        return el.hasAttribute('multiple') ? 'listbox' : 'combobox';
    if (tag === 'img' && el.getAttribute('alt'))
        return 'img';
    if (tag === 'input') {
        if (['button', 'submit', 'reset', 'image'].includes(type))
            return 'button';
        if (type === 'checkbox')
            return 'checkbox';
        if (type === 'radio')
            return 'radio';
        if (type === 'search')
            return 'searchbox';
        if (type === 'number')
            return 'spinbutton';
        if (type === 'range')
            return 'slider';
        if (['', 'text', 'email', 'tel', 'url'].includes(type))
            return 'textbox';
    }
    return '';
}
/**
 * What getByLabel matches: aria-labelledby, aria-label, or a <label>.
 */
function labelText(el) {
    const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim();
    const doc = el.ownerDocument;
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
        return normalize(labelledBy.split(/\s+/).map(id => doc.getElementById(id)?.textContent ?? '').join(' '));
    }
    const ariaLabel = normalize(el.getAttribute('aria-label'));
    if (ariaLabel)
        return ariaLabel;
    const labels = el.labels;
    return labels && labels.length > 0 ? normalize(Array.from(labels).map(label => label.textContent).join(' ')) : '';
}
function accessibleName(el) {
    const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim();
    const label = labelText(el);
    if (label)
        return label;
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' && ['button', 'submit', 'reset'].includes((el.getAttribute('type') || '').toLowerCase())) {
        return normalize(el.getAttribute('value'));
    }
    if (tag === 'img')
        return normalize(el.getAttribute('alt'));
    if (['button', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag) || el.hasAttribute('role')) {
        return normalize(el.textContent);
    }
    return normalize(el.getAttribute('title'));
}
function serializeElement(el) {
    const attr = (name) => el.getAttribute(name) || '';
    return {
        tagName: el.tagName.toLowerCase(),
        id: el.id || '',
        className: attr('class'),
        textContent: (el.textContent || '').trim().substring(0, 50),
        placeholder: attr('placeholder'),
        name: attr('name'),
        type: attr('type'),
        role: implicitRole(el),
        ariaLabel: attr('aria-label'),
        title: attr('title'),
        value: el.value || '',
        href: attr('href'),
        src: attr('src'),
        alt: attr('alt'),
        testId: ['data-testid', 'data-test-id', 'data-test', 'data-qa'].map(attr).find(Boolean) || '',
        accessibleName: accessibleName(el),
    };
}
/**
 * querySelectorAll that also enters open shadow roots, as Playwright's CSS engine does.
 */
// ponytail: each shadow root is queried with the whole selector, so a selector that crosses a shadow
// boundary (`#host #inner`) matches nothing here. Walk the selector per compound if that is needed.
function deepQueryAll(root, selector) {
    const found = Array.from(root.querySelectorAll(selector));
    root.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot)
            found.push(...deepQueryAll(el.shadowRoot, selector));
    });
    return found;
}
/**
 * Elements worth scoring, best first: visible before hidden, interactive before the rest.
 * Hidden elements stay in, so assertions such as toBeHidden or toHaveValue on a hidden input can heal.
 */
function collectCandidates(root, limit) {
    const skipped = new Set(['HTML', 'HEAD', 'BODY', 'SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'NOSCRIPT', 'TEMPLATE']);
    const interactive = 'input,button,select,textarea,a,[role],[id],[name],[aria-label],[placeholder],' +
        '[data-testid],[data-test-id],[data-test],[data-qa]';
    const rank = (el) => {
        const rect = el.getBoundingClientRect();
        return (rect.width > 0 && rect.height > 0 ? 2 : 0) + (el.matches(interactive) ? 1 : 0);
    };
    return deepQueryAll(root, '*')
        .filter(el => !skipped.has(el.tagName))
        .map(el => ({ el, rank: rank(el) }))
        .sort((a, b) => b.rank - a.rank)
        .slice(0, limit)
        .map(({ el }) => el);
}
/**
 * How many elements in the document share each role and accessible name.
 * A getByRole candidate is used only when its pair is unique.
 */
function countRoles(doc) {
    const counts = {};
    deepQueryAll(doc, '*').forEach(el => {
        const role = implicitRole(el);
        const name = role ? accessibleName(el) : '';
        if (name) {
            const key = `${role}|${name}`;
            counts[key] = (counts[key] ?? 0) + 1;
        }
    });
    return counts;
}
/**
 * Locators for one element, in the order to try them: test id, Playwright's getBy* locators
 * (in the order Playwright's docs recommend), CSS, XPath. Each one is checked to match only this
 * element where the page can check it; the caller still verifies it through Playwright.
 */
function selectorCandidates(el, roleCounts) {
    const doc = el.ownerDocument;
    const tag = el.tagName.toLowerCase();
    const exact = (value) => `${JSON.stringify(value)}s`;
    const cssValue = (value) => `"${CSS.escape(value)}"`;
    const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim();
    const inShadow = el.getRootNode() !== doc;
    const countCss = (selector) => {
        try {
            return deepQueryAll(doc, selector).length;
        }
        catch {
            return 0;
        }
    };
    const countXPath = (xpath) => {
        try {
            return doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength;
        }
        catch {
            return 0;
        }
    };
    const candidates = [];
    // 1. Test id
    for (const attr of ['data-testid', 'data-test-id', 'data-test', 'data-qa']) {
        const value = el.getAttribute(attr);
        if (value && countCss(`[${attr}=${cssValue(value)}]`) === 1)
            candidates.push(`[${attr}=${cssValue(value)}]`);
    }
    // 2. Playwright getBy* locators, as the selector strings they compile to
    const role = implicitRole(el);
    const name = role ? accessibleName(el) : '';
    if (role && name && roleCounts[`${role}|${name}`] === 1) {
        candidates.push(`internal:role=${role}[name=${exact(name)}]`);
    }
    const text = normalize(el.textContent);
    if (text && text.length <= 80 && el.children.length === 0) {
        candidates.push(`internal:text=${exact(text)}`);
    }
    const label = ['input', 'select', 'textarea'].includes(tag) ? labelText(el) : '';
    if (label)
        candidates.push(`internal:label=${exact(label)}`);
    for (const attr of ['placeholder', 'alt', 'title']) {
        const value = el.getAttribute(attr);
        if (value && countCss(`[${attr}=${cssValue(value)}]`) === 1)
            candidates.push(`internal:attr=[${attr}=${exact(value)}]`);
    }
    // 3. CSS
    const css = [];
    if (el.id)
        css.push(`#${CSS.escape(el.id)}`);
    for (const attr of ['name', 'aria-label', 'href']) {
        const value = el.getAttribute(attr);
        if (value)
            css.push(`${tag}[${attr}=${cssValue(value)}]`);
    }
    if (el.classList[0])
        css.push(`${tag}.${CSS.escape(el.classList[0])}`);
    candidates.push(...css.filter(selector => countCss(selector) === 1));
    // 4. XPath: by text, then by position, which always matches exactly one element
    const step = (node) => node.namespaceURI === 'http://www.w3.org/1999/xhtml'
        ? node.tagName.toLowerCase()
        : `*[local-name()="${node.localName}"]`;
    // XPath does not enter shadow roots.
    if (inShadow)
        return candidates;
    if (text && text.length <= 80 && !text.includes('"')) {
        const byText = `//${step(el)}[normalize-space(.)="${text}"]`;
        if (countXPath(byText) === 1)
            candidates.push(`xpath=${byText}`);
    }
    const path = [];
    for (let node = el; node; node = node.parentElement) {
        let index = 1;
        for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
            if (sibling.localName === node.localName)
                index++;
        }
        path.unshift(`${step(node)}[${index}]`);
    }
    candidates.push(`xpath=/${path.join('/')}`);
    return candidates;
}
/**
 * Elements the original selector still matches inside `root`: CSS (entering open shadow roots) or XPath.
 * A selector that is neither (a Playwright-only selector, a bare word) matches nothing.
 */
function matchOriginal(root, selector) {
    const trimmed = selector.trim();
    if (/^(xpath=|\/|\()/.test(trimmed)) {
        let xpath = trimmed.replace(/^xpath=/, '');
        // Under a chained parent, `//x` must stay inside it, as in Playwright's own XPath engine.
        if (root.nodeType !== 9 && xpath.startsWith('/'))
            xpath = `.${xpath}`;
        try {
            const doc = root.ownerDocument ?? root;
            const result = doc.evaluate(xpath, root, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            const found = [];
            for (let i = 0; i < result.snapshotLength; i++) {
                const node = result.snapshotItem(i);
                if (node instanceof Element)
                    found.push(node);
            }
            return found;
        }
        catch {
            return [];
        }
    }
    try {
        return deepQueryAll(root, trimmed);
    }
    catch {
        return [];
    }
}
/**
 * The best-scoring element above the threshold, plus its look-alike siblings (same tag and class,
 * same score), so a renamed list still has all its items.
 */
function healBest(root, selector, options) {
    const scored = collectCandidates(root, options.maxElementsToAnalyze)
        .map(el => ({ el, data: serializeElement(el) }))
        .map(item => ({ ...item, score: scoreElement(selector, item.data, options) }));
    let best = null;
    for (const item of scored) {
        if (item.score >= options.minSimilarityThreshold && (!best || item.score > best.score))
            best = item;
    }
    if (!best)
        return [];
    const top = best;
    return scored
        .filter(item => item === top || (Math.abs(item.score - top.score) < 1e-9 &&
        item.data.tagName === top.data.tagName &&
        item.data.className === top.data.className))
        .map(item => item.el)
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
}
const PAGE_FUNCTIONS = [
    levenshteinRatio, wordOverlap, parseSelector, elementValues, scoreElement, implicitRole, labelText, accessibleName,
    serializeElement, deepQueryAll, collectCandidates, countRoles, selectorCandidates, matchOriginal, healBest,
].map(fn => fn.toString()).join('\n');
/**
 * Page expression that returns the serialized candidates with their locator candidates.
 */
function collectElementsScript(limit) {
    return `(() => {
${PAGE_FUNCTIONS}
const roleCounts = countRoles(document);
return collectCandidates(document, ${Number(limit)}).map(el => ({ ...serializeElement(el), selectors: selectorCandidates(el, roleCounts) }));
})()`;
}
/**
 * Source of the selector engine registered with `selectors.register()`.
 */
function healingEngineScript(options) {
    return `(() => {
${PAGE_FUNCTIONS}
const options = ${JSON.stringify(options)};
// Per selector: when the original first went missing, and when it was last looked up.
const misses = new Map();
function queryAll(root, selector) {
  const original = matchOriginal(root, selector);
  if (original.length > 0) {
    misses.delete(selector);
    return original;
  }
  // Give the original healAfterMs to render before healing, so a page that is still loading
  // does not get a look-alike. A miss from a lookup long ago starts a new wait.
  const now = Date.now();
  const miss = misses.get(selector);
  if (!miss || now - miss.last > options.healAfterMs + 2000) misses.set(selector, { first: now, last: now });
  else miss.last = now;
  return now - misses.get(selector).first < options.healAfterMs ? [] : healBest(root, selector, options);
}
return {
  query(root, selector) { return queryAll(root, selector)[0] || null; },
  queryAll,
};
})()`;
}
//# sourceMappingURL=page-scripts.js.map