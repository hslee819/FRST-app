(function () {
  'use strict';
  const $ = selector => document.querySelector(selector);
  let dialog, frame, previousFocus;

  function bundledTA() {
    try { return JSON.parse($('#ebook-linked-apps')?.textContent || '{}').ta || null; }
    catch (_) { return null; }
  }

  function createDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.id = 'linked-app-dialog';
    dialog.className = 'linked-app-dialog';
    dialog.setAttribute('aria-labelledby', 'linked-app-title');
    dialog.innerHTML = '<header class="linked-app-header"><button type="button" id="linked-app-back">← eBook으로 돌아가기</button><div><strong id="linked-app-title">TA · 문항 질문</strong><span id="linked-app-source"></span></div></header><p id="linked-app-status" class="linked-app-status" role="status">TA 질문 화면을 여는 중입니다.</p><iframe id="linked-app-frame" class="linked-app-frame" title="TA 문항 질문 앱"></iframe>';
    document.body.appendChild(dialog);
    frame = $('#linked-app-frame');
    $('#linked-app-back').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      frame.onload = null;
      frame.onerror = null;
      frame.removeAttribute('src');
      frame.srcdoc = '';
      previousFocus?.focus();
    });
  }

  function openTA({url, source}) {
    if (!url) return false;
    createDialog();
    previousFocus = document.activeElement;
    const query = String(url).includes('?') ? String(url).slice(String(url).indexOf('?')) : '';
    const params = new URLSearchParams(query);
    $('#linked-app-source').textContent = source || `${params.get('subject') || ''} · ${params.get('content') || ''} ${params.get('round') || ''}회 · ${params.get('number') || ''}번`;
    const status = $('#linked-app-status');
    status.textContent = 'TA 질문 화면을 여는 중입니다.';
    status.hidden = false;
    frame.onload = () => { status.hidden = true; };
    frame.onerror = () => { status.textContent = 'TA 화면을 열지 못했어요. EBOOK.html을 다시 열어 주세요.'; };
    const html = bundledTA();
    if (html) {
      // srcdoc has no URL search string. Pass the exact validated link query to
      // the packaged TA app before its own scripts run; never auto-submit it.
      const literal = JSON.stringify(query).replace(/</g, '\\u003c');
      const boot = `<script>window.__EBOOK_BOOT_QUERY__=${literal};<\/script>`;
      frame.removeAttribute('src');
      frame.srcdoc = html.replace(/<head([^>]*)>/i, match => match + boot);
    } else {
      // The editable multi-file source uses its sibling TA app directly.
      frame.removeAttribute('srcdoc');
      frame.src = url;
    }
    if (!dialog.open) dialog.showModal();
    $('#linked-app-back').focus();
    return true;
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-ta-link]');
    if (!link) return;
    event.preventDefault();
    openTA({url:link.getAttribute('href')});
  });
  globalThis.EbookIntegrations = {openTA};
})();
