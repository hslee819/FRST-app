import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const expectedBasicSha256 = '996146692DDE8CB54CB68681E9DAC4C0C04EE2BC0657622D984A83C42F2C8FF5';
const firstInlineStyle = html => html.match(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/i)?.[1];

test('basic.html remains the exact preserved original file', async () => {
  const original = await readFile(new URL('basic.html', root));
  const sha256 = createHash('sha256').update(original).digest('hex').toUpperCase();
  assert.equal(sha256, expectedBasicSha256, 'Do not change basic.html when adding requested features.');
});

test('the feature variant retains the original inline screen styles byte-for-byte', async () => {
  const [original, variant] = await Promise.all([
    readFile(new URL('basic.html', root), 'utf8'),
    readFile(new URL('src/renewal-base.html', root), 'utf8'),
  ]);
  const baselineStyle = firstInlineStyle(original);
  assert.ok(baselineStyle, 'The baseline must contain its existing screen stylesheet.');
  assert.equal(firstInlineStyle(variant), baselineStyle);
});

test('new feature styles do not restyle global elements or existing app layouts', async () => {
  const globalElement = /^(?:html|body|main|nav|header|footer|button|input|select|textarea|svg|\*|:root)(?=$|[\s.#:\[>+~])/i;
  const originalClass = /^\.(?:main|app-shell|drawer|drawer-toggle|drawer-shade|page-head|head-left|head-right|topbar|nav-item|primary|outline|icon-btn|picker|pick-col|pick-row|question-form|result-grid|answer-card|card-top|card-writer|question-snippet|answer-snippet|select|tabs|tab|section-tools|subhead|form-source|field|choice|request-option|detail-columns|detail-box|empty|modal|footer|toast)(?=$|[\s.#:\[>+~])/;
  for (const filename of ['src/renewal-ui.css', 'src/review-cards.css']) {
    const css = (await readFile(new URL(filename, root), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
    const selectorGroups = [...css.matchAll(/([^{}]+)\{/g)].map(match => match[1].trim()).filter(value => !value.startsWith('@'));
    assert.ok(selectorGroups.length > 0, `${filename} should contain feature-specific rules.`);
    for (const group of selectorGroups) {
      for (const selector of group.split(',').map(value => value.trim())) {
        assert.ok(!globalElement.test(selector), `${filename} changes a global element: ${selector}`);
        assert.ok(!originalClass.test(selector), `${filename} changes an existing app selector: ${selector}`);
      }
    }
  }
});

test('the feature variant preserves the original unframed screen and drawer shell', async () => {
  const [original, variant, css] = await Promise.all([
    readFile(new URL('basic.html', root), 'utf8'),
    readFile(new URL('src/renewal-base.html', root), 'utf8'),
    readFile(new URL('src/renewal-ui.css', root), 'utf8'),
  ]);
  const bodyShell = html => html.slice(html.indexOf('<body>'), html.indexOf('<dialog'));
  const shell = bodyShell(variant);
  for (const id of ['drawer-toggle', 'drawer-shade', 'drawer']) {
    const pattern = new RegExp(`<[^>]+\\bid="${id}"[^>]*>`);
    assert.equal(shell.match(pattern)?.[0], bodyShell(original).match(pattern)?.[0], `${id} retains its original placement and initial state.`);
  }
  assert.match(shell, /<div class="app-shell"><main class="main" id="main"><\/main><\/div>/);
  assert.ok(shell.indexOf('class="topbar"') < shell.indexOf('id="drawer-toggle"'));
  assert.ok(shell.indexOf('id="drawer"') < shell.indexOf('class="app-shell"'));
  assert.doesNotMatch(shell, /tablet-stage|tablet-viewport|tablet-content|global-navigation|screen-pagination/);
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /\.tablet-(?:stage|viewport|content)\b|\.global-navigation\b|@container\s+ta-tablet/);
});
