import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Script } from 'node:vm';
import { buildStandalone } from '../tools/build.mjs';
import { createPreviewServer } from '../tools/preview.mjs';

const baselineScript = 'globalThis.TA = { title: "문항 검색", literal: "$&" };\nglobalThis.loaded = true;';
const baseline = `<!doctype html><html><head><style>body { color: black; }</style></head><body><main>TA 문항 검색</main><script>${baselineScript}</script></body></html>`;
const uiLink = '<link rel="stylesheet" href="./renewal-ui.css">';
const referencePhotoName = 'KakaoTalk_20261106_151959657_14.jpg';
const referencePhotoBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x45, 0x78, 0x69, 0x66, 0, 0xff, 0xd9]);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ta-prototype-test-'));
  t.after(async () => {
    const target = path.resolve(root);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert.ok(path.basename(target).startsWith('ta-prototype-test-'));
    await rm(target, { recursive: true, force: true });
  });
  await mkdir(path.join(root, 'src'));
  await Promise.all([
    writeFile(path.join(root, 'basic.html'), baseline),
    writeFile(path.join(root, 'src/renewal-base.html'), baseline.replace('</head>', `${uiLink}</head>`)),
    writeFile(path.join(root, 'src/renewal-ui.css'), 'body { color: green; } /* $& */'),
  ]);
  return root;
}

test('UI build preserves baseline file, content, and scripts while inlining only the new stylesheet', async (t) => {
  const root = await fixture(t);
  const result = await buildStandalone(root);
  const html = await readFile(result.output, 'utf8');
  assert.equal(await readFile(path.join(root, 'basic.html'), 'utf8'), baseline);
  assert.match(html, /<main>TA 문항 검색<\/main>/);
  assert.ok(html.includes('<style>body { color: black; }</style>'));
  assert.ok(html.includes('body { color: green; } /* $& */'));
  assert.equal(html.match(/<script>([\s\S]*?)<\/script>/)?.[1], baselineScript);
  assert.equal((html.match(/<script>/g) || []).length, 1);
  assert.doesNotMatch(html, /href="\.\/renewal-ui\.css"/);
  assert.equal(await readFile(result.appOutput, 'utf8'), html);
});

test('rebuilding replaces stale layouts in both standalone entry files', async (t) => {
  const root = await fixture(t);
  const oldLayout = '<main class="screen-pagination">Old paged picker</main>';
  await writeFile(path.join(root, 'renewal.html'), oldLayout);
  await writeFile(path.join(root, 'TA.html'), oldLayout);
  await buildStandalone(root);
  const updatedSource = baseline.replace('</head>', `${uiLink}</head>`).replace('TA 문항 검색</main>', 'TA 원래 문항 선택</main>');
  await writeFile(path.join(root, 'src/renewal-base.html'), updatedSource);
  const result = await buildStandalone(root);
  const html = await readFile(result.output, 'utf8');
  assert.equal(await readFile(result.appOutput, 'utf8'), html);
  assert.match(html, /TA 원래 문항 선택/);
  assert.doesNotMatch(html, /screen-pagination|Old paged picker/);
  assert.equal(await readFile(path.join(root, 'basic.html'), 'utf8'), baseline);
});

test('missing or duplicate UI links fail without replacing a completed build', async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'renewal.html'), 'previous build');
  await writeFile(path.join(root, 'TA.html'), 'previous TA build');
  for (const source of [baseline, baseline.replace('</head>', `${uiLink}${uiLink}</head>`)]) {
    await writeFile(path.join(root, 'src/renewal-base.html'), source);
    await assert.rejects(buildStandalone(root), /Expected exactly one/);
    assert.equal(await readFile(path.join(root, 'renewal.html'), 'utf8'), 'previous build');
    assert.equal(await readFile(path.join(root, 'TA.html'), 'utf8'), 'previous TA build');
  }
});

test('optional review assets become standalone and execute before the app', async (t) => {
  const root = await fixture(t);
  const reviewScript = 'globalThis.TAReviewCards = { ready: true, literal: "</script>", marker: "$&" };';
  const appScript = 'globalThis.reviewReadyAtStartup = globalThis.TAReviewCards.ready;';
  const source = baseline.replace('</head>', `${uiLink}<link rel="stylesheet" href="./review-cards.css"></head>`)
    .replace(`<script>${baselineScript}</script>`, `<script src="./review-cards.js"></script><script>${appScript}</script>`);
  await Promise.all([
    writeFile(path.join(root, 'src/renewal-base.html'), source),
    writeFile(path.join(root, 'src/review-cards.js'), reviewScript),
    writeFile(path.join(root, 'src/review-cards.css'), '.review-card { color: blue; } /* $& */'),
  ]);
  const result = await buildStandalone(root);
  const html = await readFile(result.output, 'utf8');
  assert.doesNotMatch(html, /(?:src|href)="\.\/review-cards\.(?:js|css)"/);
  assert.doesNotMatch(html, /src="\.\/screen-pages\.js"/);
  assert.ok(html.includes('.review-card { color: blue; } /* $& */'));
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert.equal(scripts.length, 2);
  assert.ok(scripts[0].includes('globalThis.TAReviewCards'));
  assert.equal(scripts[1], appScript);
  const sandbox = {};
  for (const script of scripts) new Script(script).runInNewContext(sandbox);
  assert.equal(sandbox.reviewReadyAtStartup, true);
  assert.equal(sandbox.TAReviewCards.literal, '</script>');
  assert.equal(sandbox.TAReviewCards.marker, '$&');
  assert.equal(await readFile(path.join(root, 'basic.html'), 'utf8'), baseline);
});

test('unsupported or missing local script cannot replace an existing build', async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'renewal.html'), 'previous build');
  await writeFile(path.join(root, 'TA.html'), 'previous TA build');
  for (const asset of ['./unknown.js', './review-cards.js', './screen-pages.js']) {
    const source = baseline.replace('</head>', `${uiLink}</head>`).replace(`<script>${baselineScript}</script>`, `<script src="${asset}"></script>`);
    await writeFile(path.join(root, 'src/renewal-base.html'), source);
    await assert.rejects(buildStandalone(root));
    assert.equal(await readFile(path.join(root, 'renewal.html'), 'utf8'), 'previous build');
    assert.equal(await readFile(path.join(root, 'TA.html'), 'utf8'), 'previous TA build');
  }
});

test('reference photo is embedded byte-for-byte while baseline and original image remain unchanged', async (t) => {
  const root = await fixture(t);
  const photoScript = `const referencePhotoUrl='../${referencePhotoName}';\nglobalThis.originalText = '기존 답변 그대로';`;
  const source = baseline.replace('</head>', `${uiLink}</head>`).replace(baselineScript, photoScript);
  await Promise.all([
    writeFile(path.join(root, referencePhotoName), referencePhotoBytes),
    writeFile(path.join(root, 'src/renewal-base.html'), source),
  ]);
  const result = await buildStandalone(root);
  const html = await readFile(result.output, 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  const dataUrl = script.match(/const referencePhotoUrl='([^']+)'/)?.[1];
  assert.equal(dataUrl, `data:image/jpeg;base64,${referencePhotoBytes.toString('base64')}`);
  assert.deepEqual(Buffer.from(dataUrl.split(',')[1], 'base64'), referencePhotoBytes);
  assert.deepEqual(await readFile(path.join(root, referencePhotoName)), referencePhotoBytes);
  assert.equal(await readFile(path.join(root, 'basic.html'), 'utf8'), baseline);
  assert.ok(script.includes("globalThis.originalText = '기존 답변 그대로'"));
  assert.doesNotThrow(() => new Script(script));
  assert.ok(!html.includes(`../${referencePhotoName}`));
});

test('missing required reference photo fails before replacing the previous output', async (t) => {
  const root = await fixture(t);
  const source = baseline.replace('</head>', `${uiLink}</head>`).replace(baselineScript, `const referencePhotoUrl='../${referencePhotoName}';`);
  await Promise.all([
    writeFile(path.join(root, 'src/renewal-base.html'), source),
    writeFile(path.join(root, 'renewal.html'), 'previous build'),
    writeFile(path.join(root, 'TA.html'), 'previous TA build'),
  ]);
  await assert.rejects(buildStandalone(root), { code: 'ENOENT' });
  assert.equal(await readFile(path.join(root, 'renewal.html'), 'utf8'), 'previous build');
  assert.equal(await readFile(path.join(root, 'TA.html'), 'utf8'), 'previous TA build');
  assert.equal(await readFile(path.join(root, 'basic.html'), 'utf8'), baseline);
});

test('invalid inline app script fails before replacing a completed build', async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'renewal.html'), 'previous build');
  await writeFile(path.join(root, 'TA.html'), 'previous TA build');
  await writeFile(path.join(root, 'src/renewal-base.html'), `<html><head>${uiLink}</head><body><script>const invalid = ;</script></body></html>`);
  await assert.rejects(buildStandalone(root), SyntaxError);
  assert.equal(await readFile(path.join(root, 'renewal.html'), 'utf8'), 'previous build');
  assert.equal(await readFile(path.join(root, 'TA.html'), 'utf8'), 'previous TA build');
  assert.equal(await readFile(path.join(root, 'basic.html'), 'utf8'), baseline);
});

test('preview limits files, serves the source version link, and handles redirects and errors', async (t) => {
  const root = await fixture(t);
  await buildStandalone(root);
  await writeFile(path.join(root, 'private.txt'), 'must not be served');
  await writeFile(path.join(root, referencePhotoName), referencePhotoBytes);
  await writeFile(path.join(root, 'src/review-cards.js'), 'globalThis.TAReviewCards = {};');
  await writeFile(path.join(root, 'src/review-cards.css'), '.review-card {}');
  const server = createPreviewServer(root);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${server.address().port}`;
  const home = await fetch(base, { redirect: 'manual' });
  assert.equal(home.status, 302);
  assert.equal(home.headers.get('location'), '/renewal.html');
  const page = await fetch(`${base}/renewal.html`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html; charset=utf-8/);
  const pageHtml = await page.text();
  assert.match(pageHtml, /<main>TA 문항 검색<\/main>/);
  const appPage = await fetch(`${base}/TA.html`);
  assert.equal(appPage.status, 200);
  assert.match(appPage.headers.get('content-type'), /text\/html; charset=utf-8/);
  assert.equal(await appPage.text(), pageHtml);
  const head = await fetch(`${base}/basic.html`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const sourceBaselineLink = await fetch(`${base}/src/basic.html`);
  assert.equal(sourceBaselineLink.status, 200);
  assert.equal(await sourceBaselineLink.text(), baseline);
  assert.equal((await fetch(`${base}/src/renewal-base.html`)).status, 200);
  assert.equal((await fetch(`${base}/src/renewal-ui.css`)).status, 200);
  const reviewJs = await fetch(`${base}/src/review-cards.js`);
  assert.equal(reviewJs.status, 200);
  assert.match(reviewJs.headers.get('content-type'), /text\/javascript; charset=utf-8/);
  const screenJs = await fetch(`${base}/src/screen-pages.js`);
  assert.equal(screenJs.status, 404);
  const reviewStyle = await fetch(`${base}/src/review-cards.css`);
  assert.equal(reviewStyle.status, 200);
  assert.match(reviewStyle.headers.get('content-type'), /text\/css; charset=utf-8/);
  const photo = await fetch(`${base}/${referencePhotoName}`);
  assert.equal(photo.status, 200);
  assert.equal(photo.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(Buffer.from(await photo.arrayBuffer()), referencePhotoBytes);
  for (const url of ['/private.txt', '/%2e%2e/private.txt', '/src%2f..%2fprivate.txt', '/src/renewal.html', '/src/renewal.js', '/src/renewal-data.js', '/KakaoTalk_20261106_151959657_13.jpg']) {
    assert.equal((await fetch(`${base}${url}`)).status, 404);
  }
  assert.equal((await fetch(`${base}/renewal.html`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${base}/%ZZ`)).status, 400);
});
