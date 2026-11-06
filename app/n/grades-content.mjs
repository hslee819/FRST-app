import { Script } from 'node:vm';

// Keep the supplied screen and its interactions together inside the grades frame.
// Adapt navigation and remove the profile/distribution header and automatic push.
export function prepareGradesDocument(source) {
  for (const id of ['stage', 'ipad', 'app', 'sbar', 'overlay', 'toast', 'jumplist']) {
    if (!source.includes(`id="${id}"`)) throw new Error(`The grades source is missing ${id}.`);
  }
  if (!source.includes('</head>') || !source.includes('</body>')) throw new Error('The grades HTML is incomplete.');
  let html = source.replace('<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">', '');
  const changes = [
    ["['drawer','콘텐츠 서랍장',I.box],", ''],
    ["const S={tab:'drawer',", "const S={tab:'report',"],
    ['setTimeout(showPush,700);', ''],
  ];
  for (const [before, after] of changes) {
    if (!html.includes(before)) throw new Error('The grades navigation or startup code has changed.');
    html = html.replace(before, after);
  }
  const headerPattern = /function header\(\)\{[\s\S]*?(?=\r?\nfunction subjTabs)/;
  if (!headerPattern.test(html)) throw new Error('The grades profile header could not be found.');
  html = html.replace(headerPattern, () => 'function header(){return `<div class="hdr"><div class="rt"><button class="cic" data-a="noti" aria-label="알림">${I.bell}</button><button class="cic" data-a="settings" aria-label="설정">${I.gear}</button></div></div>`}');
  if (/<script\b[^>]*\bsrc=|<link\b[^>]*rel="stylesheet"/i.test(html)) throw new Error('The grades document must be self-contained.');
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Script(match[1]);

  const styles = `<style id="n-grades-host-style">
    html,body{background:#fff;font-family:Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}
    #ipad{height:672px;border-radius:0;box-shadow:none;transform:scale(var(--n-grades-scale,1))!important}
    #app{top:0}
    #sbar,#jump{display:none!important}
    .tabbar{top:0;bottom:auto;height:56px;justify-content:flex-start;gap:32px;padding:0 30px;border-top:0;border-bottom:1px solid var(--line)}
    .tb{width:auto;flex-direction:row;gap:9px;padding:0 4px;font-size:16px;position:relative}
    .tb.on::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:#111}
    .hdr{top:0;left:auto;height:56px;z-index:1}
    .hdr .rt{margin-top:0;align-items:center}
    .subj{top:64px}
    .box{top:104px;bottom:8px}
    .cuttab{margin-top:12px}
    .modal{max-height:calc(100% - 24px);overflow:auto}
    .side{overflow-y:auto;padding-bottom:24px}
    .logout{position:static;display:block;width:228px;margin:24px auto 0}
  </style>`;
  const bridge = `(() => {
    'use strict';
    function fitGrades() {
      const scale = Math.min(innerWidth / 1180, innerHeight / 672);
      document.getElementById('ipad').style.setProperty('--n-grades-scale', String(scale));
    }
    addEventListener('resize', fitGrades);
    fitGrades();
  })();`;
  new Script(bridge);
  return html
    .replace('</head>', () => `${styles}\n</head>`)
    .replace('</body>', () => `<script>\n${bridge}\n</script>\n</body>`);
}
