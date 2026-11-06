import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { prepareGradesDocument } from '../grades-content.mjs';

const originalBytes = await readFile(new URL('../reference/sdij_drawer_tobe.html', import.meta.url));
const original = originalBytes.toString('utf8');
const embedded = prepareGradesDocument(original);
const scripts = html => [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);

// Executes the supplied application and its real delegated listeners. This small
// DOM stub checks state and generated markup, not browser layout or focus behavior.
function boot(width = 1180, height = 672) {
  const nodes = new Map();
  const events = new Map();
  const windowEvents = new Map();
  const timers = new Map();
  let timerId = 0;
  let document;
  const shellIds = new Set([...original.split('<script>')[0].matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const markup = () => (nodes.get('app')?.innerHTML || '') + (nodes.get('overlay')?.innerHTML || '');
  function element(key = '', options = {}) {
    const classes = new Set();
    return {
      innerHTML: '', textContent: '', dataset: {}, tagName: 'BUTTON',
      scrollLeft: 0, scrollTop: 0, scrollWidth: 1400,
      style: { setProperty(name, value) { this[name] = value; } },
      classList: {
        add: name => classes.add(name), remove: name => classes.delete(name),
        toggle(name, force = !classes.has(name)) { if (force) classes.add(name); else classes.delete(name); return force; },
      },
      addEventListener(type, callback) { events.set(`${key}:${type}`, callback); },
      focus() { document.activeElement = this; },
      setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
      getBoundingClientRect() { return { width: 1180, height: 672, left: 0, top: 0, bottom: 672 }; },
      appendChild() {}, remove() {},
      ...options,
    };
  }
  function get(id) {
    if (!shellIds.has(id) && !markup().includes(`id="${id}"`)) return null;
    if (!nodes.has(id)) nodes.set(id, element(id));
    return nodes.get(id);
  }
  function query(selector) {
    if (selector === '[data-a="q"]') return markup().includes('data-a="q"') ? search : null;
    const className = selector.startsWith('.') ? selector.slice(1) : '';
    if (!className) return null;
    const tag = markup().match(new RegExp(`<[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`))?.[0];
    if (!tag) return null;
    if (!nodes.has(selector)) nodes.set(selector, element(selector));
    const found = nodes.get(selector);
    const sl = tag.match(/data-sl="([^"]+)"/)?.[1];
    if (sl !== undefined) found.dataset.sl = sl;
    return found;
  }
  const search = element('search', { tagName: 'INPUT', dataset: { a: 'q' }, selectionStart: 0, value: '' });
  document = {
    getElementById: get,
    querySelector: query,
    querySelectorAll(selector) { const found = query(selector === '.card .hsc' ? '.hsc' : selector); return found ? [found] : []; },
    createElement: () => element(),
    addEventListener(type, callback) { events.set(type, callback); },
  };
  const context = vm.createContext({
    document, innerWidth: width, innerHeight: height,
    addEventListener(type, callback) {
      if (!windowEvents.has(type)) windowEvents.set(type, []);
      windowEvents.get(type).push(callback);
    },
    setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  for (const [index, script] of scripts(embedded).entries()) {
    vm.runInContext(script, context, { filename: `grades inline ${index + 1}`, timeout: 1000 });
  }
  return {
    get, context,
    pendingTimers: () => [...timers.values()],
    state: () => vm.runInContext('S', context),
    html: () => get('app').innerHTML,
    overlay: () => get('overlay').innerHTML,
    click(action, value, options = {}) {
      const tags = [...markup().matchAll(/<[^>]*\bdata-a="([^"]+)"[^>]*>/g)].map(match => match[0]);
      assert.ok(tags.some(tag => tag.includes(`data-a="${action}"`) && (value === undefined || tag.includes(`data-v="${value}"`))), `Rendered action ${action}:${value ?? ''} is reachable`);
      const inFilters = ['dd', 'ftype', 'fname', 'fhide', 'clrtype', 'clrname'].includes(action);
      const target = element('', {
        dataset: { a: action, v: value === undefined ? undefined : String(value) },
        closest(selector) {
          if (selector === '[data-a]') return this;
          if (selector === '.filters') return inFilters ? this : null;
          return null;
        },
        ...options,
      });
      events.get('click')({ target, stopPropagation() {} });
    },
    input(value) {
      assert.ok(query('[data-a="q"]'));
      search.value = value; search.selectionStart = value.length;
      events.get('input')({ target: search });
    },
    key(key) { events.get('keydown')({ key }); },
    resize(nextWidth, nextHeight) {
      context.innerWidth = nextWidth; context.innerHeight = nextHeight;
      for (const listener of windowEvents.get('resize') || []) listener();
    },
  };
}

test('grades integration preserves the supplied file and limits script edits to the requested navigation, push and profile changes', () => {
  assert.equal(createHash('sha256').update(originalBytes).digest('hex'), '9dd035fa6634b870fa2485263010ad466e3b02714f6dd5a523a02b56a3b0adf4');
  const sourceScripts = scripts(original), resultScripts = scripts(embedded);
  assert.equal(resultScripts.length, sourceScripts.length + 1);
  sourceScripts.forEach((source, index) => {
    const expected = source
      .replace("['drawer','콘텐츠 서랍장',I.box],", '')
      .replace("const S={tab:'drawer'", "const S={tab:'report'")
      .replace('setTimeout(showPush,700);', '');
    const header = /function header\(\)\{[\s\S]*?(?=\r?\nfunction subjTabs)/;
    assert.equal(resultScripts[index].replace(header, '/* adapted host header */'), expected.replace(header, '/* adapted host header */'));
  });
  for (const match of original.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)) assert.ok(embedded.includes(match[0]));
  assert.doesNotMatch(embedded, /cdn\.jsdelivr\.net|<script\b[^>]*\bsrc=|<link\b[^>]*rel="stylesheet"/i);
  for (const id of ['stage', 'ipad', 'app', 'overlay', 'toast', 'jumplist']) assert.ok(embedded.includes(`id="${id}"`));
});

test('grades preparation rejects incomplete markup, extra remote assets and invalid scripts', () => {
  assert.throws(() => prepareGradesDocument(original.replace('id="ipad"', 'id="missing"')), /missing ipad/);
  assert.throws(() => prepareGradesDocument(original.replace('</body>', '')), /incomplete/);
  assert.throws(() => prepareGradesDocument(original.replace('</head>', '<script src="https://example.invalid/app.js"></script></head>')), /self-contained/);
  assert.throws(() => prepareGradesDocument(original.replace('</head>', '<link rel="stylesheet" href="extra.css"></head>')), /self-contained/);
  assert.throws(() => prepareGradesDocument(original.replace('</body>', '<script>const broken = ;</script></body>')), SyntaxError);
});

test('the grades bridge fits the 1180 by 672 shell below the host header with top tabs and no duplicate profile', () => {
  const hostStyle = embedded.match(/<style id="n-grades-host-style">([\s\S]*?)<\/style>/)[1];
  assert.match(hostStyle, /#ipad\{[^}]*height:672px;[^}]*transform:scale\(var\(--n-grades-scale,1\)\)!important/);
  assert.match(hostStyle, /#app\{top:0/);
  for (const selector of ['#sbar', '#jump']) {
    assert.ok(hostStyle.split('}').some(rule => rule.split('{')[0].split(',').some(item => item.trim() === selector) && /display:none!important/.test(rule)), `${selector} is hidden by the host adapter`);
  }
  const topTabs = hostStyle.match(/\.tabbar\{([^}]+)\}/)?.[1];
  assert.ok(topTabs);
  assert.match(topTabs, /(?:^|;)top:0(?:;|$)/);
  assert.match(topTabs, /(?:^|;)bottom:auto(?:;|$)/);
  assert.match(topTabs, /(?:^|;)height:56px(?:;|$)/);
  const h = boot();
  assert.doesNotMatch(h.html(), /class="who"|class="dday"|이현서|임시관|배부완료도/);
  for (const action of ['noti', 'settings']) assert.ok(h.html().includes(`data-a="${action}"`));
  const verifyFit = (width, height) => {
    const scale = Number(h.get('ipad').style['--n-grades-scale']);
    assert.ok(scale > 0);
    assert.ok(1180 * scale <= width + 1e-8);
    assert.ok(672 * scale <= height + 1e-8);
    assert.ok(Math.abs(1180 * scale - width) < 1e-8 || Math.abs(672 * scale - height) < 1e-8);
  };
  verifyFit(1180, 820 - 32 - 116);
  assert.equal(Number(h.get('ipad').style['--n-grades-scale']), 1);
  for (const [width, height] of [[590, 672], [1180, 400], [1180, 672]]) {
    h.resize(width, height); verifyFit(width, height);
  }
});

test('grades starts on report with only two tabs, no automatic push, and working subject and exam filters', () => {
  const h = boot();
  assert.equal(h.state().tab, 'report');
  assert.equal(h.pendingTimers().length, 0, 'Opening grades must not schedule a push popup.');
  assert.doesNotMatch(h.html(), /data-a="tab" data-v="drawer"|콘텐츠 서랍장/);
  assert.deepEqual([...h.html().matchAll(/data-a="tab" data-v="([^"]+)"/g)].map(match => match[1]), ['report', 'owl']);
  for (const [tab, label] of [['report', '리포트 서랍장'], ['owl', '부엉이 분석실'], ['report', '리포트 서랍장']]) {
    h.click('tab', tab);
    assert.equal(h.state().tab, tab);
    assert.match(h.html(), new RegExp(`class="tb on" data-a="tab" data-v="${tab}"`));
    assert.ok(h.html().includes(label));
  }
  h.click('rsubj', '국어');
  assert.equal(h.state().rSubj, '국어');
  assert.equal(h.state().rNo, 16);
  h.click('rlist'); h.click('rpick', '17');
  assert.equal(h.state().rNo, 17);
  assert.match(h.html(), /92점/);
  h.click('rtype');
  assert.equal(h.state().rType, '상상(FINAL)');
  assert.equal(h.state().rNo, 8);
  assert.match(h.html(), /90점/);
  h.click('rsubj', '한국사');
  assert.equal(h.state().rType, '월례고사');
  assert.equal(h.state().rNo, 10);
  assert.equal([...h.html().matchAll(/data-a="qview" data-v="(\d+)"/g)].length, 20);
});

test('report controls retain question viewing, explanation, navigation and prefilled question context', () => {
  const h = boot();
  h.click('tab', 'report');
  assert.match(h.html(), /개인 성적 분석/);
  h.click('rnext');
  assert.equal(h.state().rNo, 24);
  h.click('ratio');
  assert.match(h.html(), /선택 비율 \(①~⑤\)/);
  h.click('sortnum');
  const expectedOrder = vm.runInContext('REPORT[S.rSubj][S.rType][S.rNo].items.slice().sort((a,b)=>a.rate-b.rate).map(item=>item.q)', h.context);
  assert.deepEqual([...h.html().matchAll(/data-a="qview" data-v="(\d+)"/g)].map(match => Number(match[1])), Array.from(expectedOrder));
  h.click('qview', '14');
  assert.equal(h.state().modal, 'qview');
  assert.match(h.overlay(), /서바이벌 24회/);
  assert.match(h.overlay(), /14\/30/);
  h.click('qrev'); h.click('qexpl');
  assert.equal(h.state().qRev, true);
  assert.match(h.overlay(), /14번 해설/);
  h.click('qnav', '1');
  assert.match(h.overlay(), /15\/30/);
  assert.equal(h.state().qRev, false);
  assert.equal(h.state().qExpl, false);
  h.click('qask', '15');
  assert.equal(h.state().modal, 'qask');
  for (const value of ['수학', '서바이벌', '24회', '15번', '서랍장에서 자동으로 채워졌어요']) assert.ok(h.overlay().includes(value));
  h.key('Escape');
  assert.equal(h.overlay(), '');
  assert.equal(h.state().tab, 'report');
});

test('analysis graphs respond to subject, exam, metric and average controls and keep cumulative views', () => {
  const h = boot();
  h.click('tab', 'owl');
  h.click('osubj', '수학'); h.click('otype', '서바이벌');
  assert.match(h.html(), /개인 성적 추이 그래프/);
  assert.match(h.html(), /<polyline points=/);
  assert.match(h.html(), /<rect [^>]*fill="#efefef"/);
  h.click('oavg');
  assert.doesNotMatch(h.html(), /<rect [^>]*fill="#efefef"/);
  h.click('og', '1');
  assert.equal(h.state().oG, 1);
  assert.match(h.html(), /class="on" data-a="og" data-v="1">백분위/);
  h.click('oavg'); h.click('og', '2');
  assert.equal(h.state().oG, 2);
  assert.doesNotMatch(h.html(), /<rect [^>]*fill="#efefef"/);
  h.click('osub', '1');
  assert.match(h.html(), /class="ctb"/);
  h.click('osub', '2');
  assert.match(h.html(), /class="ctb"/);
  h.click('osubj', '성적 통지표');
  assert.match(h.html(), /발급된 성적 통지표가 없어요/);
});
