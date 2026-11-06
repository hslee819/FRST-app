/** Present the complete app in a fixed landscape iPad canvas, scaled to fit. */
export function ipadShell(appHtml) {
  const payload=JSON.stringify({width:1280,height:960,html:appHtml}).replace(/</g,'\\u003c');
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ededed"><title>sdij E-BOOK · iPad</title>
<style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{display:grid;place-items:center;background:#ededed;font-family:"Malgun Gothic",sans-serif}#ipad-frame{position:relative;overflow:hidden;background:#fff;border-radius:10px;box-shadow:0 8px 36px #00000012,0 0 0 1px #0000000b}#ipad-app{position:absolute;left:0;top:0;width:1280px;height:960px;border:0;background:#fff;transform-origin:top left}noscript{padding:24px;color:#555}
</style></head><body><main id="ipad-frame" aria-label="아이패드 가로 화면, 4:3 비율"><iframe id="ipad-app" width="1280" height="960" title="sdij E-BOOK 아이패드 앱"></iframe></main><noscript>앱을 사용하려면 JavaScript를 켜 주세요.</noscript>
<script type="application/json" id="ebook-ipad-app">${payload}</script>
<script>
(function(){
  const config=JSON.parse(document.getElementById('ebook-ipad-app').textContent);
  const frame=document.getElementById('ipad-frame'),app=document.getElementById('ipad-app');
  function fit(){
    const scale=Math.min(1,Math.max(1,window.innerWidth-32)/config.width,Math.max(1,window.innerHeight-32)/config.height);
    frame.style.width=config.width*scale+'px';frame.style.height=config.height*scale+'px';
    app.style.transform='scale('+scale+')';
  }
  fit();app.srcdoc=config.html;window.addEventListener('resize',fit);
})();
</script></body></html>`;
}
