import { Script } from 'node:vm';

// Adapt the existing dashboard's shell only. Its data, markup, and app script
// remain intact inside an iframe, isolated from the N app's IDs and CSS.
export function prepareFocusDocument(source) {
  for (const id of ['personal-panel', 'comparison-panel', 'history-nav', 'help-nav']) {
    if (!source.includes(`id="${id}"`)) throw new Error(`The focus source is missing ${id}.`);
  }
  if (!source.includes('<div class="heading-actions">')) throw new Error('The focus toolbar could not be found.');
  if (!source.includes('</head>') || !source.includes('</body>')) throw new Error('The focus HTML is incomplete.');
  if (/<script\b[^>]*\bsrc=|<link\b[^>]*rel="stylesheet"/i.test(source)) throw new Error('Build the standalone focus HTML before packaging N.');
  for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Script(match[1]);

  const styles = `<style id="n-focus-host-style">
    .app-header{display:none}
    .dashboard{max-width:none;padding:18px 24px 24px}
    .page-heading{justify-content:flex-end;margin-bottom:22px}
    .page-heading>div:first-child{display:none}
    .heading-actions{padding-top:0;flex-wrap:wrap}
    .nav-backdrop,.navigation{top:0}
  </style>`;
  const buttons = '<button class="button button-secondary" id="n-focus-history" type="button">기록 관리</button><button class="button button-secondary" id="n-focus-help" type="button">사용 안내</button>';
  const bridge = `(() => {
    'use strict';
    document.getElementById('n-focus-history').addEventListener('click', () => document.getElementById('history-nav').click());
    document.getElementById('n-focus-help').addEventListener('click', () => document.getElementById('help-nav').click());
  })();`;
  new Script(bridge);
  return source
    .replace('<span data-icon="chart"></span>나의 학습</button>', '<span data-icon="chart"></span>몰입도 추이</button>')
    .replace('<span data-icon="target"></span>다른 사람과 비교<span class="new-label">', '<span data-icon="target"></span>몰입도 분석<span class="new-label">')
    .replace('</head>', () => `${styles}\n</head>`)
    .replace('<div class="heading-actions">', () => `<div class="heading-actions">${buttons}`)
    .replace('</body>', () => `<script>\n${bridge}\n</script>\n</body>`);
}
