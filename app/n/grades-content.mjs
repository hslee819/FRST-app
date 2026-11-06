import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 성적 탭은 개선안 콘텐츠 서랍장의 리포트 서랍장·부엉이 분석실을 N 앱 안에 띄운다.
const projectRoot = fileURLToPath(new URL('./', import.meta.url));
const drawerPath = ['..', '..', '개선 앱 화면', 'sdij_drawer_tobe.html'];

const hostStyle = `<style id="n-grades-host-style">
    @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css");
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
  </style>
</head>`;

const fitScript = `<script>
(() => {
    'use strict';
    function fitGrades() {
      const scale = Math.min(innerWidth / 1180, innerHeight / 672);
      document.getElementById('ipad').style.setProperty('--n-grades-scale', String(scale));
    }
    addEventListener('resize', fitGrades);
    fitGrades();
  })();
</script>
</body>`;

function replaceOnce(html, from, to, label) {
  const count = html.split(from).length - 1;
  if (count !== 1) throw new Error(`grades: expected one ${label}, found ${count}. 서랍장 개선안 구조가 바뀌었는지 확인하세요.`);
  return html.replace(from, () => to);
}

export function transformDrawer(html) {
  html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>\s*/g, '');
  html = replaceOnce(html, '</head>', hostStyle, 'closing head tag');
  html = replaceOnce(html, "const S={tab:'drawer',", "const S={tab:'report',", 'initial tab');
  html = html.replace(/function header\(\)\{return `<div class="hdr">[\s\S]*?<\/div><\/div>`\}/, () =>
    'function header(){return `<div class="hdr"><div class="rt"><button class="cic" data-a="noti" aria-label="알림">${I.bell}</button><button class="cic" data-a="settings" aria-label="설정">${I.gear}</button></div></div>`}');
  if (!html.includes('<div class="hdr"><div class="rt">')) throw new Error('grades: header was not replaced.');
  html = replaceOnce(html, "[['drawer','콘텐츠 서랍장',I.box],['report','리포트 서랍장',I.rep]", "[['report','리포트 서랍장',I.rep]", 'tab list');
  html = replaceOnce(html, 'render();setTimeout(showPush,700);', 'render();', 'push start');
  html = replaceOnce(html, '</body>', fitScript, 'closing body tag');
  return html;
}

export async function buildGradesContent(root = projectRoot) {
  const drawer = await readFile(path.join(root, ...drawerPath), 'utf8');
  const html = transformDrawer(drawer);
  await writeFile(path.join(root, 'grades-content.html'), html, 'utf8');
  return html;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const html = await buildGradesContent();
  console.log(`Built grades-content.html (${Buffer.byteLength(html, 'utf8').toLocaleString('en-US')} bytes).`);
}
