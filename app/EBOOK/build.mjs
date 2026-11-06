import {readFile, writeFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import {ipadShell} from './ipad-shell.mjs';

const root = new URL('./', import.meta.url);
let html = await readFile(new URL('ebook.html', root), 'utf8');
for (const name of ['ebook.css', 'flash.css', 'integrations.css']) {
  const css = await readFile(new URL(name, root), 'utf8');
  html = html.replace(`<link rel="stylesheet" href="${name}">`, () => `<style>\n${css}\n</style>`);
}
const scripts=[];
for (const name of ['ebook-data.js','flash.js','integrations.js','app.js']) {
  const js = await readFile(new URL(name, root), 'utf8');
  new Script(js, {filename:name});
  html = html.replace(`<script src="${name}" defer></script>`, '');
  scripts.push(`<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`);
}
html=html.replace('content="../ta/renewal.html"','content="ta/renewal.html"');
// Include the real TA app so EBOOK.html still works when moved on its own.
// Adapt only the copied bootstrap input; preserve the TA source and UI.
let ta = await readFile(new URL('../ta/renewal.html', root), 'utf8');
const queryInput = "readQuestionDeepLink(window.location?.search||'')";
if (ta.split(queryInput).length !== 2) throw new Error('TA deep-link bootstrap changed; review its integration before packaging.');
ta = ta.replace(queryInput, () => "readQuestionDeepLink(window.__EBOOK_BOOT_QUERY__||window.location?.search||'')");
const payload = JSON.stringify({ta}).replace(/</g, '\\u003c');
html=html.replace('</body>',()=>`<script type="application/json" id="ebook-linked-apps">${payload}</script>\n`+scripts.join('\n')+'\n</body>');
const output=new URL('../EBOOK.html', root);
const standalone=ipadShell(html);
await writeFile(output,standalone,'utf8');
console.log(`Built EBOOK.html (${Buffer.byteLength(standalone).toLocaleString()} bytes). iPad 4:3; TA app included; no network dependencies.`);
