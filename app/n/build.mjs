import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { buildGradesContent } from './grades-content.mjs';

const projectRoot = fileURLToPath(new URL('./', import.meta.url));
const styles = ['src/base.css', 'src/my.css', 'src/services.css', 'src/focus.css', 'src/grades.css'];
const scripts = ['src/my.js', 'src/services.js', 'src/focus.js', 'src/grades.js', 'src/app.js'];

export async function buildStandalone(root = projectRoot) {
  let html = await readFile(path.join(root, 'index.html'), 'utf8');
  const styleTags = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)];
  const scriptTags = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)];
  if (JSON.stringify(styleTags.map(match => match[1])) !== JSON.stringify(styles)) {
    throw new Error(`Expected stylesheet links in this order: ${styles.join(', ')}`);
  }
  if (JSON.stringify(scriptTags.map(match => match[1])) !== JSON.stringify(scripts)) {
    throw new Error(`Expected script links in this order: ${scripts.join(', ')}`);
  }
  if (!html.includes('</body>')) throw new Error('index.html is missing its closing body tag.');

  for (const match of styleTags) {
    const css = await readFile(path.join(root, match[1]), 'utf8');
    html = html.replace(match[0], () => `<style>\n${css.replace(/<\/style/gi, '<\\/style')}\n</style>`);
  }
  const inlineScripts = [];
  for (const match of scriptTags) {
    const source = await readFile(path.join(root, match[1]), 'utf8');
    new Script(source, { filename: match[1] });
    inlineScripts.push(`<script>\n${source.replace(/<\/script/gi, '<\\/script')}\n</script>`);
    html = html.replace(match[0], '');
  }

  const assets = {};
  const entries = await readdir(path.join(root, 'assets'), { withFileTypes: true });
  const names = entries.filter(entry => entry.isFile() && /^[a-z0-9-]+\.png$/.test(entry.name)).map(entry => entry.name).sort();
  if (!names.length) throw new Error('No PNG assets found in assets/.');
  for (const name of names) {
    const image = await readFile(path.join(root, 'assets', name));
    assets[name.slice(0, -4)] = `data:image/png;base64,${image.toString('base64')}`;
  }
  const gradesHTML = await buildGradesContent(root);
  const assetScript = `<script>window.NAssets=${JSON.stringify(assets).replace(/</g, '\\u003c')};window.NGradesHTML=${JSON.stringify(gradesHTML).replace(/</g, '\\u003c')};</script>`;
  html = html.replace('</body>', () => `${assetScript}\n${inlineScripts.join('\n')}\n</body>`);
  const output = path.join(root, 'N.html');
  await writeFile(output, html, 'utf8');
  return { output, bytes: Buffer.byteLength(html, 'utf8'), assets: names.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await buildStandalone();
    console.log(`Built N.html (${result.bytes.toLocaleString('en-US')} bytes; ${result.assets} embedded assets).`);
  } catch (error) {
    console.error(`Build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
