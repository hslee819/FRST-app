import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const referencePhotoName = 'KakaoTalk_20261106_151959657_14.jpg';
const referencePhotoAssignment = /(const\s+referencePhotoUrl\s*=\s*)(["'])\.\.\/KakaoTalk_20261106_151959657_14\.jpg\2/;

/** Package the app, optional browser modules, styling, and supplied reference photo. */
export async function buildStandalone(root = projectRoot) {
  const source = path.join(root, 'src');
  const [template, css] = await Promise.all([
    readFile(path.join(source, 'renewal-base.html'), 'utf8'),
    readFile(path.join(source, 'renewal-ui.css'), 'utf8'),
  ]);

  let html = template;
  const browserScriptsFound = new Set();
  for (const [index, match] of [...template.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].entries()) {
    if (/\bsrc\s*=/i.test(match[1])) {
      const scriptSource = match[1].match(/\bsrc\s*=\s*(["'])([^"']+)\1/i)?.[2];
      if (scriptSource !== './review-cards.js') throw new Error('Only ./review-cards.js is supported as a local external app script.');
      if (browserScriptsFound.has(scriptSource)) throw new Error(`Expected at most one ${scriptSource} script.`);
      browserScriptsFound.add(scriptSource);
      const scriptName = scriptSource.slice(2);
      const browserScript = await readFile(path.join(source, scriptName), 'utf8');
      new Script(browserScript, { filename: scriptName });
      html = html.replace(match[0], () => `<script>\n${browserScript.replace(/<\/script/gi, '<\\/script')}\n</script>`);
    } else {
      new Script(match[2], { filename: `renewal-base.html inline script ${index + 1}` });
    }
  }

  let stylesFound = 0;
  let reviewStylesFound = 0;
  const hasReviewStyle = /<link\b[^>]*\bhref\s*=\s*(["'])\.\/review-cards\.css\1[^>]*>/i.test(html);
  const reviewCss = hasReviewStyle ? await readFile(path.join(source, 'review-cards.css'), 'utf8') : '';
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (/\bhref\s*=\s*(["'])\.\/renewal-ui\.css\1/i.test(tag)) {
      stylesFound++;
      return `<style>\n${css.replace(/<\/style/gi, '<\\/style')}\n</style>`;
    }
    if (/\bhref\s*=\s*(["'])\.\/review-cards\.css\1/i.test(tag)) {
      reviewStylesFound++;
      return `<style>\n${reviewCss.replace(/<\/style/gi, '<\\/style')}\n</style>`;
    }
    return tag;
  });

  if (stylesFound !== 1) {
    throw new Error('Expected exactly one ./renewal-ui.css stylesheet link in renewal-base.html.');
  }
  if (reviewStylesFound > 1) throw new Error('Expected at most one ./review-cards.css stylesheet link.');
  if (!/<\/body\s*>/i.test(html)) throw new Error('The source HTML is missing a closing body tag.');
  if (referencePhotoAssignment.test(html)) {
    const originalPhoto = await readFile(path.join(root, referencePhotoName));
    const dataUrl = `data:image/jpeg;base64,${originalPhoto.toString('base64')}`;
    html = html.replace(referencePhotoAssignment, (_, declaration, quote) => `${declaration}${quote}${dataUrl}${quote}`);
  }

  const output = path.join(root, 'renewal.html');
  const appOutput = path.join(root, 'TA.html');
  await writeFile(output, html, 'utf8');
  await writeFile(appOutput, html, 'utf8');
  return { output, appOutput, bytes: Buffer.byteLength(html, 'utf8') };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await buildStandalone();
    console.log(`Built renewal.html and TA.html (${result.bytes.toLocaleString('en-US')} bytes each). basic.html is preserved.`);
  } catch (error) {
    console.error(`Build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
