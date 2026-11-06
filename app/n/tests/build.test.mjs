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

test('preview serves source, standalone and artwork, but not screenshots or working files', async t => {
  const server = createPreviewServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const name of ['/', '/N.html', '/src/app.js', '/src/focus.css', '/assets/meal.png']) {
    const response = await fetch(base + name);
    assert.equal(response.status, 200, name);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    await response.arrayBuffer();
  }
  for (const name of ['/README.md', '/.qa/asset-manifest.json', '/KakaoTalk_20261106_203229242.png', '/assets/../README.md', '/missing']) {
    assert.equal((await fetch(base + name)).status, 404, name);
  }
  const head = await fetch(base + '/N.html', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
});
