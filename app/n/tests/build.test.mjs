import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { Script } from 'node:vm';
import { createPreviewServer } from '../preview.mjs';

const root = new URL('../', import.meta.url);

test('standalone app embeds source scripts and all referenced artwork without network resources', async () => {
  const html = await readFile(new URL('N.html', root), 'utf8');
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=|<link\b[^>]*rel="stylesheet"/);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert.equal(scripts.length, 5);
  for (const script of scripts) new Script(script);
  const sandbox = { window: {} };
  new Script(scripts[0]).runInNewContext(sandbox);
  assert.equal(sandbox.window.NFocusHTML, await readFile(new URL('focus-content.html', root), 'utf8'));
  assert.equal(sandbox.window.NGradesHTML, await readFile(new URL('grades-content.html', root), 'utf8'));
  assert.match(sandbox.window.NFocusHTML, /몰입도 추이<\/button>/);
  assert.match(sandbox.window.NFocusHTML, /몰입도 분석<span/);
  assert.equal(Object.keys(sandbox.window.NAssets).length, 15);
  for (const [name, url] of Object.entries(sandbox.window.NAssets)) {
    assert.match(url, /^data:image\/png;base64,/);
    assert.deepEqual(Buffer.from(url.split(',')[1], 'base64'), await readFile(new URL(`assets/${name}.png`, root)));
  }
  for (const [index, name] of ['my', 'services', 'focus', 'app'].entries()) {
    const source = await readFile(new URL(`src/${name}.js`, root), 'utf8');
    assert.equal(scripts[index + 1].trim(), source.replace(/<\/script/gi, '<\\/script').trim());
  }
});

test('the packaged grades document contains valid inline scripts and no external resource dependencies', async () => {
  const html = await readFile(new URL('grades-content.html', root), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0, 'The original interactive grades scripts are present.');
  for (const [index, match] of scripts.entries()) {
    assert.doesNotMatch(match[1], /\bsrc\s*=/i);
    if (!/\btype\s*=\s*["']application\/json["']/i.test(match[1])) new Script(match[2], { filename: `grades-inline-${index}.js` });
  }
  assert.doesNotMatch(html, /<(?:script|img|iframe|source|video|audio)\b[^>]*\bsrc\s*=\s*["'](?:https?:)?\/\//i);
  assert.doesNotMatch(html, /<link\b[^>]*\bhref\s*=\s*["'](?:https?:)?\/\//i);
  assert.doesNotMatch(html, /@import\s+(?:url\()?\s*["']?(?:https?:)?\/\//i);
  assert.doesNotMatch(html, /url\(\s*["']?(?:https?:)?\/\//i);
});

test('preview serves source, standalone and artwork, but not screenshots or working files', async t => {
  const server = createPreviewServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const name of ['/', '/N.html', '/focus-content.html', '/grades-content.html', '/src/app.js', '/src/focus.css', '/src/grades.css', '/assets/meal.png']) {
    const response = await fetch(base + name);
    assert.equal(response.status, 200, name);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    await response.arrayBuffer();
  }
  for (const name of ['/README.md', '/.qa/asset-manifest.json', '/reference/sdij_drawer_tobe.html', '/KakaoTalk_20261106_203229242.png', '/assets/../README.md', '/missing']) {
    assert.equal((await fetch(base + name)).status, 404, name);
  }
  const head = await fetch(base + '/N.html', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
});
