import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const files = ['my.js', 'services.js', 'focus.js', 'app.js'];
const sources = await Promise.all(files.map(async name => ({ name, code: await readFile(new URL('../src/' + name, import.meta.url), 'utf8') })));
const plain = value => JSON.parse(JSON.stringify(value));

// This harness runs the actual application and its delegated event listeners.
// Its small DOM stub cannot verify layout, native form validation, or focus order.
function boot({ page = 'home', saved = new Map(), storageAccess = {}, focusHTML, gradesHTML } = {}) {
  const nodes = new Map();
  const listeners = new Map();
  const timers = new Map();
  let timerId = 0;
  let document;
  let renderedFrames = [];

  function element(selector = '', options = {}) {
    const classes = new Set();
    const attributes = new Map();
    const node = {
      id: selector.startsWith('#') ? selector.slice(1) : '',
      innerHTML: '', textContent: '', hidden: false, disabled: false,
      className: '', dataset: {}, scrollTop: 0, isConnected: true,
      style: { setProperty(name, value) { this[name] = value; } },
      classList: {
        add: name => classes.add(name),
        remove: name => classes.delete(name),
        contains: name => classes.has(name),
        toggle(name, force) {
          const active = force ?? !classes.has(name);
          if (active) classes.add(name); else classes.delete(name);
          return active;
        },
      },
      setAttribute(name, value) { attributes.set(name, String(value)); },
      getAttribute(name) { return attributes.get(name) ?? null; },
      removeAttribute(name) { attributes.delete(name); },
      getBoundingClientRect() { return { width: 1180, height: 820 }; },
      getClientRects() { return [{}]; },
      querySelectorAll() { return []; },
      closest(query) { return query === '[data-action]' && this.dataset.action ? this : null; },
      focus() { document.activeElement = this; },
      appendChild(child) { child.isConnected = true; return child; },
      remove() { this.isConnected = false; },
      click() {},
      ...options,
    };
    if (selector === '#screen') {
      let html = '';
      Object.defineProperty(node, 'innerHTML', {
        get() { return html; },
        set(value) {
          html = String(value);
          for (const id of renderedFrames) nodes.delete('#' + id);
          renderedFrames = [];
          for (const match of html.matchAll(/<iframe\b([^>]*)>/g)) {
            const attrs = new Map([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(attr => [attr[1], attr[2]]));
            const id = attrs.get('id');
            if (!id) continue;
            const frame = element('#' + id, { tagName: 'IFRAME', srcdoc: '', src: attrs.get('src') || '' });
            for (const [name, val] of attrs) frame.setAttribute(name, val);
            nodes.set('#' + id, frame);
            renderedFrames.push(id);
          }
        },
      });
    }
    return node;
  }

  function get(selector) {
    if (!nodes.has(selector)) nodes.set(selector, element(selector));
    return nodes.get(selector);
  }

  document = {
    title: '', activeElement: null,
    querySelector: get,
    createElement: tag => element('', { tagName: tag.toUpperCase() }),
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
  };
  document.body = element('body');
  ['#navigation', '#drawer-shade', '#modal', '#modal-shade', '#toast'].forEach(selector => { get(selector).hidden = true; });

  class FormDataStub {
    constructor(form) { this.values = form.values || {}; }
    get(key) { return this.values[key] ?? null; }
  }
  const window = { addEventListener() {} };
  if (focusHTML !== undefined) window.NFocusHTML = focusHTML;
  if (gradesHTML !== undefined) window.NGradesHTML = gradesHTML;
  const context = vm.createContext({
    window, document, console, URL, URLSearchParams, Blob,
    FormData: FormDataStub,
    location: { search: '?page=' + encodeURIComponent(page) },
    localStorage: {
      getItem(key) { if (storageAccess.readDenied) throw Error('Storage unavailable'); return saved.get(key) ?? null; },
      setItem(key, value) { if (storageAccess.writeDenied) throw Error('Storage unavailable'); saved.set(key, String(value)); },
    },
    setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  for (const source of sources) vm.runInContext(source.code, context, { filename: source.name, timeout: 1000 });

  function dispatch(type, target, extra = {}) {
    const event = { target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra };
    for (const listener of listeners.get(type) || []) listener(event);
    return event;
  }
  return {
    app: window.NApp, screens: window.NScreens, window,
    saved, storageAccess, get, document,
    html: () => get('#screen').innerHTML,
    click(action, data = {}, options = {}) { return dispatch('click', element('', { dataset: { action, ...data }, ...options })); },
    submit(id, values, dataset = {}) { return dispatch('submit', element('', { id, values, dataset })); },
    key(key) { return dispatch('keydown', document.activeElement, { key }); },
  };
}

test('all 17 screens render and are reachable through the actual main menu', () => {
  const h = boot();
  const pages = ['home', 'attendance', 'timetable', 'focus', 'grades', 'penalty', 'meals', 'notices', 'calendar', 'surveys', 'counseling', 'consulting', 'lectures', 'reclass', 'guide', 'faq', 'call'];
  assert.deepEqual(Object.keys(h.screens).sort(), [...pages].sort());
  for (const page of pages) {
    h.click('open-menu');
    assert.equal(h.get('#navigation').hidden, false);
    assert.equal(h.get('#menu-button').getAttribute('aria-expanded'), 'true');
    assert.ok(h.get('#menu-groups').innerHTML.includes(`data-page="${page}"`), `${page} is in the menu`);
    h.click('navigate', { page });
    assert.equal(h.app.state.page, page);
    assert.equal(h.get('#navigation').hidden, true);
    assert.equal(h.get('#screen').getAttribute('data-page'), page);
    assert.ok(h.html().trim().length > 0, `${page} has content`);
    assert.ok(!h.html().includes('undefined'), `${page} renders without missing values`);
    assert.equal(h.document.title, `${h.screens[page].title} · 시대인재 N`);
  }
  h.click('navigate', { page: 'missing' });
  assert.equal(h.app.state.page, 'call');
  assert.equal(boot({ page: 'missing' }).app.state.page, 'home');
});

function embeddedFrame(h, label) {
  const frame = h.html().match(/<iframe\b([^>]*)>/);
  assert.ok(frame, `The ${label} app is hosted in an iframe.`);
  const id = frame[1].match(/\bid="([^"]+)"/)?.[1];
  assert.ok(id, `The mounted ${label} frame has an identifier.`);
  assert.ok(frame[1].match(/\btitle="[^"]+"/), `The ${label} frame has an accessible title.`);
  return h.get('#' + id);
}
const focusFrame = h => embeddedFrame(h, 'focus');
const gradesFrame = h => embeddedFrame(h, 'grades');

test('the focus screen uses the generated local HTML as its editable-source fallback', () => {
  for (const focusHTML of [undefined, null, { invalid: true }]) {
    const h = boot({ page: 'focus', focusHTML });
    const frame = focusFrame(h);
    assert.match(frame.src, /(?:^|\/)focus-content\.html$/);
    assert.equal(frame.srcdoc, '');
    assert.equal(h.screens.focus.fullBleed, true);
    assert.equal(h.get('#screen').classList.contains('full-bleed'), true);
    assert.equal(h.get('#page-header').hidden, false, 'The host keeps its navigation header reachable.');
    assert.equal(h.app.state.focus, undefined, 'The host does not recreate a separate focus dataset.');
    assert.equal(h.window.NFocusData, undefined);
  }
});

test('the standalone focus payload is mounted unchanged into srcdoc without copying its UI into the host', () => {
  const payload = '<!doctype html><html lang="ko"><head><style>.original-focus{color:red}</style></head><body><main class="original-focus">original focus payload & content</main><script>window.focusSentinel = true;</script></body></html>';
  const h = boot({ page: 'focus', focusHTML: payload });
  const frame = focusFrame(h);
  assert.equal(frame.srcdoc, payload);
  assert.equal(frame.getAttribute('src'), null, 'The standalone frame does not request a separate local file.');
  assert.doesNotMatch(h.html(), /original focus payload|focusSentinel|<style>|<script>/);
  assert.equal(h.get('#header-actions').innerHTML, '', 'The former custom focus controls are absent from the host header.');
  assert.equal(h.saved.size, 0, 'Mounting a focus app does not alter host storage.');
});

test('returning to focus remounts the same embedded document and keeps other screen selections', () => {
  const payload = '<!doctype html><html><body>existing focus application</body></html>';
  const h = boot({ page: 'surveys', focusHTML: payload });
  h.click('my-survey-tab', { tab: 'closed' });
  h.click('navigate', { page: 'lectures' });
  h.click('svc-subject', { subject: '수학' });
  const myBefore = plain(h.app.state.my);
  const servicesBefore = plain(h.app.state.services);
  h.click('navigate', { page: 'focus' });
  const first = focusFrame(h);
  assert.equal(first.srcdoc, payload);
  assert.deepEqual(plain(h.app.state.my), myBefore);
  assert.deepEqual(plain(h.app.state.services), servicesBefore);
  const hostBefore = plain(h.app.state);
  h.click('focus-view', { view: 'monthly' });
  h.click('focus-mode');
  h.click('focus-week', { week: '2' });
  assert.deepEqual(plain(h.app.state), hostBefore, 'Retired host focus actions cannot mutate host or other-screen state.');
  h.click('navigate', { page: 'surveys' });
  assert.equal(h.app.state.my.surveyTab, 'closed');
  assert.match(h.html(), /참여불가/);
  h.click('navigate', { page: 'lectures' });
  assert.equal(h.app.state.services.subject, '수학');
  h.click('navigate', { page: 'focus' });
  assert.notEqual(focusFrame(h), first, 'Navigation creates a fresh iframe element.');
  assert.equal(focusFrame(h).srcdoc, payload);
  assert.equal(h.app.state.focus, undefined);
});

test('attendance month controls retain their existing boundaries and captured-event scope', () => {
  const h = boot({ page: 'attendance' });
  assert.match(h.html(), /2027학년도 대학수/);
  h.click('my-month-prev');
  assert.equal(h.app.state.my.month, 9);
  assert.doesNotMatch(h.html(), /2027학년도 대학수/);
  h.click('my-month-next');
  h.click('my-month-next');
  assert.equal(h.app.state.my.month, 10);
});

test('the grades entry immediately follows focus and preserves the host header and menu', () => {
  const h = boot();
  const myGroup = h.get('#menu-groups').innerHTML.match(/<section class="menu-group"><h2>My<\/h2>([\s\S]*?)<\/section>/)?.[1];
  assert.ok(myGroup);
  const pages = [...myGroup.matchAll(/data-page="([^"]+)"/g)].map(match => match[1]);
  const focusIndex = pages.indexOf('focus');
  assert.ok(focusIndex >= 0);
  assert.deepEqual(pages.slice(focusIndex, focusIndex + 3), ['focus', 'grades', 'penalty']);
  h.click('navigate', { page: 'grades' });
  assert.equal(h.get('#page-title').textContent, '성적');
  assert.equal(h.get('#page-header').hidden, false);
  assert.equal(h.get('#screen').classList.contains('full-bleed'), true);
  assert.ok(gradesFrame(h).getAttribute('title'));
  h.click('open-menu');
  assert.equal(h.get('#navigation').hidden, false);
  assert.equal(h.get('#menu-button').getAttribute('aria-expanded'), 'true');
  h.key('Escape');
  assert.equal(h.get('#navigation').hidden, true);
  assert.equal(h.app.state.page, 'grades');
  assert.equal(h.saved.size, 0);
});

test('grades uses a local fallback when an embedded document is unavailable', () => {
  for (const gradesHTML of [undefined, null, { invalid: true }]) {
    const h = boot({ page: 'grades', gradesHTML });
    const frame = gradesFrame(h);
    assert.match(frame.src, /(?:^|\/)grades-content\.html$/);
    assert.equal(frame.srcdoc, '');
    assert.equal(h.screens.grades.fullBleed, true);
    assert.equal(h.app.state.grades, undefined, 'The wrapper does not invent separate grade data.');
  }
});

test('embedded grades mounts unchanged and remains separate from focus and host screen state', () => {
  const gradesHTML = '<!doctype html><html lang="ko"><head><style>.original-grades{color:blue}</style></head><body><main class="original-grades">grade source payload</main><script>window.gradesSentinel=true;</script></body></html>';
  const focusHTML = '<!doctype html><html><body>focus source payload</body></html>';
  const h = boot({ page: 'surveys', gradesHTML, focusHTML });
  h.click('my-survey-tab', { tab: 'closed' });
  h.click('navigate', { page: 'lectures' });
  h.click('svc-subject', { subject: '수학' });
  const myBefore = plain(h.app.state.my);
  const servicesBefore = plain(h.app.state.services);
  h.click('navigate', { page: 'grades' });
  const firstFrame = gradesFrame(h);
  assert.equal(firstFrame.srcdoc, gradesHTML);
  assert.equal(firstFrame.getAttribute('src'), null, 'The standalone grades frame needs no sibling file.');
  assert.doesNotMatch(h.html(), /grade source payload|gradesSentinel|<style>|<script>/);
  assert.equal(h.get('#header-actions').innerHTML, '');
  assert.deepEqual(plain(h.app.state.my), myBefore);
  assert.deepEqual(plain(h.app.state.services), servicesBefore);
  h.click('navigate', { page: 'focus' });
  assert.equal(focusFrame(h).srcdoc, focusHTML);
  h.click('navigate', { page: 'grades' });
  assert.notEqual(gradesFrame(h), firstFrame);
  assert.equal(gradesFrame(h).srcdoc, gradesHTML);
  h.click('navigate', { page: 'surveys' });
  assert.match(h.html(), /참여불가/);
  assert.equal(h.saved.size, 0, 'Mounting the grades document does not write host records.');
});
test('storage wrappers fall back on malformed JSON and report denied writes honestly', () => {
  const saved = new Map([['sidae-n-bad', '{oops'], ['sidae-n-good', '{"value":7}']]);
  const access = {};
  const h = boot({ saved, storageAccess: access });
  assert.equal(h.app.ctx.read('missing', 'fallback'), 'fallback');
  assert.equal(h.app.ctx.read('bad', 'fallback'), 'fallback');
  assert.deepEqual(plain(h.app.ctx.read('good', {})), { value: 7 });
  access.readDenied = true;
  assert.equal(h.app.ctx.read('good', 'fallback'), 'fallback');
  access.readDenied = false;
  assert.equal(h.app.ctx.store('new', { kept: true }), true);
  assert.equal(saved.get('sidae-n-new'), '{"kept":true}');
  access.writeDenied = true;
  assert.equal(h.app.ctx.store('new', { kept: false }), false);
  assert.equal(saved.get('sidae-n-new'), '{"kept":true}');
  assert.match(h.get('#toast').textContent, /저장 공간을 사용할 수 없습니다/);
});

test('local Call forms reject missing values, save valid content locally, and escape it on display', () => {
  const h = boot({ page: 'call' });
  h.click('svc-call', { kind: 'question' });
  assert.equal(h.get('#modal').hidden, false);
  for (const values of [{ date: '', message: '내용' }, { date: '2026-11-06', message: '   ' }]) {
    const event = h.submit('svc-call-form', values, { kind: 'question' });
    assert.equal(event.defaultPrevented, true);
    assert.equal(h.saved.size, 0);
    assert.equal(h.get('#modal').hidden, false);
  }
  h.submit('svc-call-form', { date: '2026-11-06', message: '  <img src=x onerror=alert(1)>  ' }, { kind: 'missing' });
  assert.equal(h.saved.size, 0);
  h.submit('svc-call-form', { date: '2026-11-06', message: '  <img src=x onerror=alert(1)>  ' }, { kind: 'question' });
  assert.equal(h.get('#modal').hidden, true);
  const saved = JSON.parse(h.saved.get('sidae-n-n-local-calls'));
  assert.deepEqual(saved, [{ title: '문의신청', date: '2026-11-06', message: '<img src=x onerror=alert(1)>' }]);
  h.click('svc-call-records');
  assert.match(h.get('#modal-body').innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(h.get('#modal-body').innerHTML, /<img src=x/);
  assert.match(h.get('#modal-body').innerHTML, /실제 신청 내역과는 연결되어 있지 않습니다/);
});

test('Call history treats a malformed saved collection as empty', () => {
  for (const value of ['{broken', '{"not":"an array"}', 'null']) {
    const h = boot({ page: 'call', saved: new Map([['sidae-n-n-local-calls', value]]) });
    h.click('svc-call-records');
    assert.match(h.get('#modal-body').innerHTML, /보관한 내용이 없습니다/);
  }
});

test('failed Call storage leaves the form open and does not claim the request was saved', () => {
  const h = boot({ page: 'call', storageAccess: { writeDenied: true } });
  h.click('svc-call', { kind: 'absence' });
  h.submit('svc-call-form', { date: '2026-11-06', message: '보관할 사유' }, { kind: 'absence' });
  assert.equal(h.saved.size, 0);
  assert.equal(h.get('#modal').hidden, false, 'The unsaved form must remain available to the user.');
  assert.doesNotMatch(h.get('#toast').textContent, /보관했습니다/);
  assert.match(h.get('#toast').textContent, /저장/);
});

test('meal feedback rejects empty values and does not close the form after storage failure', () => {
  const h = boot({ page: 'meals' });
  h.click('my-meal-rate', { meal: '0' });
  h.submit('', { ratingKey: 'n-meal-rating-6-0', rating: '' }, { form: 'my-rating' });
  assert.equal(h.saved.size, 0);
  assert.equal(h.get('#modal').hidden, false);
  h.storageAccess.writeDenied = true;
  h.submit('', { ratingKey: 'n-meal-rating-6-0', rating: '4' }, { form: 'my-rating' });
  assert.equal(h.get('#modal').hidden, false);
  h.storageAccess.writeDenied = false;
  h.submit('', { ratingKey: 'n-meal-rating-6-0', rating: '4' }, { form: 'my-rating' });
  assert.equal(JSON.parse(h.saved.get('sidae-n-n-meal-rating-6-0')), 4);
  h.click('my-meal-comment');
  h.submit('', { comment: '   ' }, { form: 'my-comment' });
  assert.equal(h.saved.has('sidae-n-n-meal-comment'), false);
  assert.equal(h.get('#modal').hidden, false);
});

test('survey tabs distinguish active and ended surveys; next does not fabricate a submitted response', () => {
  const h = boot({ page: 'surveys' });
  assert.match(h.html(), /26.11.05 ~ 26.11.09/);
  h.click('my-survey-open');
  assert.match(h.get('#modal-body').innerHTML, /올해 배부된 Shortcut을 풀어본 적이 있나요/);
  h.click('my-survey-next');
  assert.match(h.get('#modal-body').innerHTML, /응답을 제출하지 않습니다/);
  assert.equal(h.saved.size, 0);
  h.key('Escape');
  assert.equal(h.get('#modal').hidden, true);
  h.click('my-survey-tab', { tab: 'closed' });
  assert.match(h.html(), /26.10.29 ~ 26.11.02/);
  assert.match(h.html(), /참여불가/);
  h.click('my-survey-open', {}, { disabled: true });
  assert.equal(h.get('#modal').hidden, true);
});

test('the homeroom-teacher menu entry selects the teacher while the manager entry selects the manager', () => {
  const h = boot();
  h.click('navigate', { page: 'counseling', label: '담임 선생님' });
  assert.match(h.html(), /data-person="teacher" aria-pressed="true"/);
  h.click('navigate', { page: 'counseling', label: '학습 매니저' });
  assert.match(h.html(), /data-person="manager" aria-pressed="true"/);
});
