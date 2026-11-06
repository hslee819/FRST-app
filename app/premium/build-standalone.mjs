import { readFile, writeFile } from 'node:fs/promises';

const read = (name) => readFile(new URL(name, import.meta.url), 'utf8');
let html = await read('index.html');
for (const match of [...html.matchAll(/<link rel="stylesheet" href="([^\"]+)">/g)]) {
  const css = (await read(match[1])).replace(/@charset\s+"UTF-8";/gi, '');
  html = html.replace(match[0], () => `<style>\n${css}\n</style>`);
}
const scripts = [];
for (const match of [...html.matchAll(/<script src="([^\"]+)" defer><\/script>/g)]) {
  scripts.push(await read(match[1]));
  html = html.replace(match[0], '');
}
html = html.replace('href="./index.html"', 'href="#main"');
html = html.replace('</body>', () => `<script>\n${scripts.join('\n').replace(/<\/script/gi, '<\\/script')}\n</script>\n</body>`);
await writeFile(new URL('../몰입도-리디자인.html', import.meta.url), html, 'utf8');
console.log(`Standalone HTML updated (${Buffer.byteLength(html)} bytes).`);
