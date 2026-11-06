import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { prepareFocusDocument } from '../focus-content.mjs';

const original = await readFile(new URL('../../몰입도.html', import.meta.url), 'utf8');
const embedded = await readFile(new URL('../focus-content.html', import.meta.url), 'utf8');
const scriptBodies = html => [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]);

test('the integrated focus dashboard preserves the original styles, scripts and all working controls', () => {
  assert.equal(embedded, prepareFocusDocument(original));
  const oldScripts = scriptBodies(original);
  const newScripts = scriptBodies(embedded);
  assert.equal(newScripts.length, oldScripts.length + 1);
  oldScripts.forEach((script, index) => assert.equal(newScripts[index], script));
  for (const style of original.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) assert.ok(embedded.includes(style[0]));
  for (const id of ['personal-panel', 'comparison-panel', 'add-button', 'export-button', 'record-form', 'history-dialog', 'guide-dialog', 'compare-page-next', 'compare-weeks', 'comparison-table']) {
    assert.ok(embedded.includes(`id="${id}"`), id);
  }
  assert.match(embedded, /id="n-focus-history"/);
  assert.match(embedded, /id="n-focus-help"/);
  assert.doesNotMatch(embedded, /<script\b[^>]*\bsrc=|<link\b[^>]*rel="stylesheet"/);
});

test('the existing photo-based weekly data and class comparison table are available in the embedded app', () => {
  const script = scriptBodies(embedded)[0];
  const delimiter = '})(globalThis);';
  const firstEnd = script.indexOf(delimiter) + delimiter.length;
  const secondEnd = script.indexOf(delimiter, firstEnd) + delimiter.length;
  assert.ok(firstEnd > delimiter.length && secondEnd > firstEnd);
  const context = vm.createContext({});
  vm.runInContext(script.slice(0, secondEnd), context);
  const { FocusData: data, FocusComparisonData: comparison } = context;
  assert.equal(data.seedRecords.length, 40);
  const day = data.aggregateDay(data.seedRecords, '2026-10-26');
  assert.equal(day.lecture, 130);
  assert.equal(day.self, 390);
  assert.equal(day.focus, 5);
  const detail = comparison.getDetail([], comparison.getPeriods(2026, 9)[0]);
  assert.deepEqual(JSON.parse(JSON.stringify(detail.rows.map(row => row.values))), [
    [8, 8, 8, 'class', 8], ['class', 'class', 8, 'class', 8],
    [7.5, 7.5, 'class', 7.5, 7.5], [7.5, 7.5, 7.5, 8, 'class'],
  ]);
});

test('record management and help remain reachable after hiding the duplicate app header', () => {
  const events = new Map();
  const clicks = [];
  const document = { getElementById: id => ({ addEventListener: (type, callback) => events.set(`${id}:${type}`, callback), click: () => clicks.push(id) }) };
  vm.runInNewContext(scriptBodies(embedded).at(-1), { document });
  events.get('n-focus-history:click')();
  events.get('n-focus-help:click')();
  assert.deepEqual(clicks, ['history-nav', 'help-nav']);
});
