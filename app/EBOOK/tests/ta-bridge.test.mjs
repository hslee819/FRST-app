import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [shell, integrations, originalTA] = await Promise.all([
  read('../../EBOOK.html'), read('../integrations.js'), read('../../ta/renewal.html'),
]);
const shellPayloadText = shell.match(/<script type="application\/json" id="ebook-ipad-app">([\s\S]*?)<\/script>/)?.[1];
assert.ok(shellPayloadText, 'Build the iPad EBOOK.html before running the TA bridge regression checks.');
const shellPayload = JSON.parse(shellPayloadText);
const bundle = shellPayload.html;
const payloadText = bundle.match(/<script type="application\/json" id="ebook-linked-apps">([\s\S]*?)<\/script>/)?.[1];
assert.ok(payloadText, 'Build EBOOK.html before running the TA bridge regression checks.');
const payload = JSON.parse(payloadText);
const executableScripts = html => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);

// This harness executes the actual packaged applications and event listeners.
// It does not emulate browser layout, native iframe navigation, or dialog focus
// rules. The generated srcdoc is executed separately with an empty URL search,
// matching the condition that requires the injected query bootstrap.
function appHarness(html, { storage = new Map(), search = '' } = {}) {
  const nodes = new Map();
  const documentListeners = new Map();
  const windowListeners = new Map();
  let popupCalls = 0;
  let document;

  function element(key = '', tagName = 'DIV') {
    const classes = new Set();
    const attributes = new Map();
    const listeners = new Map();
    return {
      id: key.startsWith('#') ? key.slice(1) : '', tagName,
      innerHTML: '', textContent: '', value: '', content: '', dataset: {},
      hidden: false, disabled: false, checked: false, open: false,
      clientWidth: 1100, scrollTop: 0, offsetTop: 0,
      listeners, attributes,
      style: { setProperty(name, value) { this[name] = value; } },
      classList: {
        add: name => classes.add(name), remove: name => classes.delete(name),
        toggle(name, force) {
          const enabled = force === undefined ? !classes.has(name) : force;
          if (enabled) classes.add(name); else classes.delete(name);
          return enabled;
        },
      },
      setAttribute(name, value) { attributes.set(name, String(value)); this[name] = value; },
      getAttribute(name) { return attributes.get(name) ?? this[name] ?? null; },
      removeAttribute(name) { attributes.delete(name); delete this[name]; },
      addEventListener(type, listener) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(listener);
      },
      appendChild(child) {
        child.parent = this;
        if (child.id) nodes.set('#' + child.id, child);
      },
      append() {}, replaceChildren() {}, setPointerCapture() {}, scrollIntoView() {},
      focus() { document.activeElement = this; },
      showModal() { this.open = true; },
      close() { this.open = false; (listeners.get('close') || []).forEach(listener => listener()); },
      querySelector: selector => get(selector), querySelectorAll: () => [],
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1100, height: 900 }),
      closest(selector) {
        if (selector === 'button,a') return ['BUTTON', 'A'].includes(this.tagName) ? this : null;
        if (selector === '[data-ta-link]') return 'taLink' in this.dataset ? this : null;
        if (selector === '[data-flash-action]') return 'flashAction' in this.dataset ? this : null;
        if (selector === '[data-flash-close]') return 'flashClose' in this.dataset ? this : null;
        if (selector === 'dialog') return get('#flash-review-dialog');
        return null;
      },
    };
  }

  function get(selector) {
    if (selector === 'dialog[open]') return [...nodes.values()].find(node => node.open) || null;
    if (!nodes.has(selector)) nodes.set(selector, element(selector));
    return nodes.get(selector);
  }

  document = {
    hidden: false, activeElement: null, body: element('body', 'BODY'),
    querySelector: get, querySelectorAll: () => [],
    createElement: tag => element('', tag.toUpperCase()),
    createElementNS: (_, tag) => element('', tag.toUpperCase()),
    addEventListener(type, listener) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(listener);
    },
  };
  const window = {
    location: { search }, innerWidth: 1200, scrollTo() {},
    open() { popupCalls++; throw new Error('TA handoff must not open a popup.'); },
    addEventListener(type, listener) { windowListeners.set(type, listener); },
  };
  const embedded = html.match(/<script type="application\/json" id="ebook-linked-apps">([\s\S]*?)<\/script>/)?.[1];
  if (embedded) get('#ebook-linked-apps').textContent = embedded;
  get('meta[name="ta-app-path"]').content = html.match(/name="ta-app-path" content="([^"]+)"/)?.[1] || '';
  const context = vm.createContext({
    document, window, URLSearchParams, Date, Math, Set, console,
    performance: { now: () => 1000 },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1,
  });
  executableScripts(html).forEach((script, index) => vm.runInContext(script, context, { filename: 'packaged-script-' + index, timeout: 1000 }));

  function dispatch(target, scope) {
    const event = { target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
    if (scope) (get(scope).listeners.get('click') || []).forEach(listener => listener(event));
    (documentListeners.get('click') || []).forEach(listener => listener(event));
    return event;
  }
  return {
    get, context, document, storage,
    popupCalls: () => popupCalls,
    click(dataset, scope) { const target = element('', 'BUTTON'); target.dataset = dataset; return dispatch(target, scope); },
    clickLink(href) {
      const link = element('', 'A');
      link.dataset.taLink = '';
      link.setAttribute('href', href);
      link.focus();
      return { link, event: dispatch(link) };
    },
    clickBound(selector) {
      const node = get(selector);
      (node.listeners.get('click') || []).forEach(listener => listener({ target: node, preventDefault() {} }));
    },
  };
}

test('the outer iPad shell loads the complete app and keeps a 4:3 canvas on resize', () => {
  assert.equal(shellPayload.width, 1280);
  assert.equal(shellPayload.height, 960);
  const nodes = {
    'ebook-ipad-app': { textContent: shellPayloadText },
    'ipad-frame': { style: {} },
    'ipad-app': { style: {} },
  };
  const events = new Map();
  const window = { innerWidth: 1440, innerHeight: 1080, addEventListener: (name, listener) => events.set(name, listener) };
  const context = vm.createContext({ document: { getElementById: id => nodes[id] }, window });
  executableScripts(shell).forEach(script => vm.runInContext(script, context, { timeout: 1000 }));
  assert.ok(nodes['ipad-app'].srcdoc === bundle, 'The shell must load the exact complete app payload.');
  assert.equal(typeof events.get('resize'), 'function');
  for (const [width, height] of [[1920, 1080], [1280, 960], [1024, 768], [375, 812]]) {
    window.innerWidth = width;
    window.innerHeight = height;
    events.get('resize')();
    const canvasWidth = parseFloat(nodes['ipad-frame'].style.width);
    const canvasHeight = parseFloat(nodes['ipad-frame'].style.height);
    assert.ok(Math.abs(canvasWidth / canvasHeight - 4 / 3) < 1e-12);
    assert.ok(canvasWidth <= width - 32 && canvasHeight <= height - 32);
    assert.ok(canvasWidth <= 1280 && canvasHeight <= 960);
    const scale = Number(nodes['ipad-app'].style.transform.match(/^scale\(([^)]+)\)$/)?.[1]);
    assert.ok(Math.abs(canvasWidth - 1280 * scale) < 1e-9);
    assert.ok(Math.abs(canvasHeight - 960 * scale) < 1e-9);
  }
  assert.ok(nodes['ipad-app'].srcdoc === bundle, 'Resizing must preserve the live app document.');
});

test('the packaged TA app differs only in its single deep-link bootstrap input', () => {
  const before = "readQuestionDeepLink(window.location?.search||'')";
  const after = "readQuestionDeepLink(window.__EBOOK_BOOT_QUERY__||window.location?.search||'')";
  assert.equal(originalTA.split(before).length - 1, 1);
  assert.equal(payload.ta.split(after).length - 1, 1);
  assert.ok(payload.ta === originalTA.replace(before, after), 'All TA markup, styles, content, and other scripts must remain unchanged.');
  assert.ok(executableScripts(bundle).some(script => script.trim() === integrations.trim()), 'The test must run the current integrations.js from the real bundle.');
});

const sources = [
  { id: 'korean-survival-18', subject: '국어', title: '서바이벌', issue: '18', number: 1 },
  { id: 'korean-accelerator-29', subject: '국어', title: '엑셀러레이터', issue: '29', number: 45 },
  { id: 'math-survival-18', subject: '수학', title: '서바이벌', issue: '18', number: 30 },
  { id: 'physics-survival-18', subject: '물리학Ⅱ', title: '서바이벌', issue: '18', number: 20 },
];

for (const source of sources) {
  test(`a real eBook link opens the packaged TA form and returns: ${source.id} #${source.number}`, () => {
    const ebook = appHarness(bundle);
    ebook.click({ flashAction: 'start' }, '#flash-dialogs');
    ebook.click({ view: 'study' });
    ebook.click({ openBook: source.id });
    ebook.click({ startMode: 'study' });
    ebook.click({ page: String(source.number) });
    ebook.click({ answer: '2' });
    const panel = ebook.get('#question-panel').innerHTML;
    const href = panel.match(/<a\b[^>]*data-ta-link[^>]*href="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
    assert.ok(href, 'The actual question panel must generate a TA link.');
    const expectedQuery = new URL(href, 'file:///a-moved-folder/EBOOK.html').search;
    const savedBefore = ebook.storage.get('sdij-ebook-library-v1');

    const { link, event } = ebook.clickLink(href);
    assert.equal(event.defaultPrevented, true, 'Default new-tab navigation must be intercepted.');
    assert.equal(ebook.popupCalls(), 0);
    assert.equal(ebook.get('#linked-app-dialog').open, true);
    const frame = ebook.get('#linked-app-frame');
    assert.equal(frame.getAttribute('src'), null, 'The standalone bundle must not rely on a sibling TA file.');
    assert.ok(frame.srcdoc.includes('window.__EBOOK_BOOT_QUERY__='));

    // Execute the injected query first, then both genuine TA app scripts.
    // No URL query is present in this isolated srcdoc browsing context.
    const ta = appHarness(frame.srcdoc, { storage: ebook.storage, search: '' });
    assert.equal(executableScripts(frame.srcdoc).length, executableScripts(payload.ta).length + 1);
    assert.equal(ta.context.window.__EBOOK_BOOT_QUERY__, expectedQuery);
    const form = ta.get('#main').innerHTML;
    assert.match(form, /id="ask-form"/);
    for (const value of [source.subject, source.title, source.issue + '회', source.number + '번']) {
      assert.ok(form.includes(value + '</span>'), 'The TA form must preserve ' + value);
    }
    assert.equal(ta.popupCalls(), 0);
    const questions = JSON.parse(ebook.storage.get('ta-original-demo-v1') || '{"questions":[]}').questions;
    assert.equal(questions.length, 0, 'Opening the question form must not submit a question.');
    frame.onload();
    assert.equal(ebook.get('#linked-app-status').hidden, true);

    ebook.clickBound('#linked-app-back');
    assert.equal(ebook.get('#linked-app-dialog').open, false);
    assert.equal(frame.srcdoc, '', 'Returning must unload the TA document.');
    assert.equal(frame.getAttribute('src'), null);
    assert.equal(frame.onload, null);
    assert.equal(frame.onerror, null);
    assert.equal(ebook.document.activeElement, link, 'Focus returns to the initiating TA action.');
    assert.equal(ebook.get('#reader').hidden, false);
    assert.equal(ebook.get('#question-panel').innerHTML, panel);
    assert.equal(ebook.storage.get('sdij-ebook-library-v1'), savedBefore, 'The eBook question, answer, and progress must survive the round trip.');
  });
}
