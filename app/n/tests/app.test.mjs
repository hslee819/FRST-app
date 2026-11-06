import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const files = ['my.js', 'services.js', 'focus.js', 'grades.js', 'app.js'];
const sources = await Promise.all(files.map(async name => ({ name, code: await readFile(new URL('../src/' + name, import.meta.url), 'utf8') })));
const plain = value => JSON.parse(JSON.stringify(value));

// This harness runs the actual application and its delegated event listeners.
// Its small DOM stub cannot verify layout, native form validation, or focus order.
function boot({ page = 'home', saved = new Map(), storageAccess = {} } = {}) {
  const nodes = new Map();
  const listeners = new Map();
  const timers = new Map();
  let timerId = 0;
  let document;

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
    app: window.NApp, screens: window.NScreens, focusData: window.NFocusData,
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
    assert.ok(h.html().length > 100, `${page} has content`);
    assert.ok(!h.html().includes('undefined'), `${page} renders without missing values`);
    assert.equal(h.document.title, `${h.screens[page].title} · 시대인재 N`);
  }
  h.click('navigate', { page: 'missing' });
  assert.equal(h.app.state.page, 'call');
  assert.equal(boot({ page: 'missing' }).app.state.page, 'home');
});

test('the observed focus table retains every period, weekday value, and lecture marker', () => {
  const h = boot({ page: 'focus' });
  const table = h.html().match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1];
  const rows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(match => [...match[1].matchAll(/<(?:th|td)\b[^>]*>([^<]*)<\/(?:th|td)>/g)].map(cell => cell[1]));
  assert.deepEqual(rows, [
    ['3교시', '8.0', '8.0', '8.0', '수업', '8.0', '-', '-', '-'],
    ['4교시', '수업', '수업', '8.0', '수업', '8.0', '-', '-', '-'],
    ['5교시', '7.5', '7.5', '수업', '7.5', '7.5', '-', '-', '-'],
    ['6교시', '7.5', '7.5', '7.5', '8.0', '수업', '-', '-', '-'],
  ]);
  assert.match(h.html(), /개인 평균/);
  assert.match(h.html(), /50% 평균/);
  assert.match(h.html(), /20% 평균/);
});

test('all four photographed study weeks preserve their scores, durations, and displayed totals', () => {
  const h = boot({ page: 'focus' });
  assert.deepEqual(plain(h.focusData.weeks), [
    { focus: [6, 7, 7, 6, 7], lecture: [140, 180, 170, 160, 170], self: [340, 410, 380, 350, 410], shownTotal: '40h 20m' },
    { focus: [5, 6, 6, 6, 7], lecture: [130, 170, 160, 170, 180], self: [360, 420, 400, 390, 440], shownTotal: '42h 10m' },
    { focus: [6, 8, 7, 7, 8], lecture: [160, 190, 180, 170, 120], self: [410, 460, 430, 420, 470], shownTotal: '44h 30m' },
    { focus: [5, 8, 6, 6, 7], lecture: [130, 190, 120, 120, 170], self: [390, 440, 410, 400, 430], shownTotal: '43h 40m' },
  ]);
  h.click('focus-mode');
  for (let week = 0; week < 4; week++) {
    h.click('focus-week', { week: String(week) });
    assert.equal(h.app.state.focus.week, week);
    assert.ok(h.html().includes(h.focusData.weeks[week].shownTotal));
    for (const minutes of [...h.focusData.weeks[week].lecture, ...h.focusData.weeks[week].self]) {
      assert.ok(h.html().includes(h.focusData.duration(minutes)), `week ${week + 1}: ${minutes} minutes is displayed`);
    }
  }
  // Totals are transcribed labels from the photographs; no invented aggregation
  // replaces them. A 720-minute axis deliberately accommodates the tallest bar.
  assert.ok(Math.max(...h.focusData.weeks.flatMap(week => week.self.map((value, i) => value + week.lecture[i]))) <= 720);
});

test('focus controls switch between comparison, monthly trend, daily and weekly study views', () => {
  const h = boot({ page: 'focus' });
  h.click('focus-view', { view: 'summary' });
  assert.equal(h.app.state.focus.view, 'summary');
  for (const value of ['7.75', '8.07', '8.23']) assert.ok(h.html().includes(value));
  h.click('focus-view', { view: 'monthly' });
  assert.match(h.html(), /당월 몰입도 추이/);
  h.click('focus-view', { view: 'detail' });
  assert.match(h.html(), /3교시/);
  h.click('focus-mode');
  assert.equal(h.app.state.focus.mode, 'study');
  assert.equal(h.app.state.focus.week, 3);
  assert.match(h.html(), /43h 40m/);
  h.click('focus-study-view', { view: 'daily' });
  assert.equal(h.app.state.focus.studyView, 'daily');
  assert.match(h.html(), /8시부터 22시까지/);
  h.click('focus-week', { week: '0' });
  assert.match(h.html(), /이 기간의 몰입도 기록이 없습니다/);
  h.click('focus-study-view', { view: 'weekly' });
  assert.match(h.html(), /40h 20m/);
  h.click('focus-mode');
  assert.equal(h.app.state.focus.mode, 'comparison');
  assert.equal(h.app.state.focus.view, 'detail');
  assert.match(h.html(), /3교시/);
});

test('focus and attendance month controls do not display captured data under other months', () => {
  const h = boot({ page: 'focus' });
  h.click('focus-month', { delta: '-1' });
  assert.equal(h.app.state.focus.month, 9);
  assert.match(h.html(), /이 기간의 몰입도 기록이 없습니다/);
  assert.doesNotMatch(h.html(), /3교시/);
  h.click('focus-month', { delta: '1' });
  assert.equal(h.app.state.focus.month, 10);
  h.click('focus-month', { delta: '1' });
  assert.equal(h.app.state.focus.month, 10);
  h.click('navigate', { page: 'attendance' });
  assert.match(h.html(), /2027학년도 대학수/);
  h.click('my-month-prev');
  assert.equal(h.app.state.my.month, 9);
  assert.doesNotMatch(h.html(), /2027학년도 대학수/);
  h.click('my-month-next');
  h.click('my-month-next');
  assert.equal(h.app.state.my.month, 10);
});

test('navigation preserves screen selections and focus actions leave other screens unchanged', () => {
  const h = boot({ page: 'surveys' });
  h.click('my-survey-tab', { tab: 'closed' });
  h.click('navigate', { page: 'lectures' });
  h.click('svc-subject', { subject: '수학' });
  const myBefore = plain(h.app.state.my);
  const servicesBefore = plain(h.app.state.services);
  h.click('navigate', { page: 'focus' });
  h.click('focus-view', { view: 'monthly' });
  h.click('focus-mode');
  h.click('focus-week', { week: '2' });
  assert.deepEqual(plain(h.app.state.my), myBefore);
  assert.deepEqual(plain(h.app.state.services), servicesBefore);
  const focusBefore = plain(h.app.state.focus);
  h.click('navigate', { page: 'surveys' });
  assert.equal(h.app.state.my.surveyTab, 'closed');
  assert.match(h.html(), /참여불가/);
  h.click('my-survey-tab', { tab: 'active' });
  h.click('navigate', { page: 'lectures' });
  assert.equal(h.app.state.services.subject, '수학');
  h.click('svc-lecture-tab', { tab: 'history' });
  assert.deepEqual(plain(h.app.state.focus), focusBefore);
  h.click('navigate', { page: 'focus' });
  assert.deepEqual(plain(h.app.state.focus), focusBefore);
  assert.match(h.html(), /44h 30m/);
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
