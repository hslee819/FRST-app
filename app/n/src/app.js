(() => {
  'use strict';
  const screens = window.NScreens;
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const paths = {
    menu:'<path d="M3 5h18M3 12h10M3 19h14"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>',
    'chevron-left':'<path d="m15 5-7 7 7 7"/>', 'chevron-right':'<path d="m9 5 7 7-7 7"/>',
    bell:'<path d="M5 17h14l-2-3V8a5 5 0 0 0-10 0v6zm5 4h4"/>', search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>', edit:'<path d="m15 3 6 6-12 12H3v-6zm-1 2 6 6"/>',
    settings:'<circle cx="12" cy="12" r="4"/><path d="m9 2 6 0 1 3 3 1 3 6-3 6-3 1-1 3H9l-1-3-3-1-3-6 3-6 3-1z"/>',
    user:'<circle cx="12" cy="7" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>',
    'arrow-right':'<path d="M3 12h18m-6-6 6 6-6 6"/>', wifi:'<path d="M2 8a16 16 0 0 1 20 0M6 13a10 10 0 0 1 12 0M10 18a3 3 0 0 1 4 0"/>',
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths['chevron-right']}</svg>`;
  const asset = name => window.NAssets?.[name] || `assets/${name}.png`;
  const read = (key, fallback) => { try { const value = localStorage.getItem(`sidae-n-${key}`); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } };
  const store = (key, value) => { try { localStorage.setItem(`sidae-n-${key}`, JSON.stringify(value)); return true; } catch { toast('브라우저 저장 공간을 사용할 수 없습니다.'); return false; } };
  const initial = new URLSearchParams(location.search).get('page');
  const state = {page: Object.hasOwn(screens, initial) ? initial : 'home'};
  let toastTimer, returnFocus;
  const menuGroups = [
    ['Home',[['home','홈']]],
    ['My',[['attendance','출결'],['timetable','시간표'],['focus','몰입도'],['penalty','벌점'],['meals','급식'],['notices','공지 사항'],['calendar','캘린더'],['surveys','설문']]],
    ['1:1상담',[['counseling','학습 매니저'],['counseling','담임 선생님'],['consulting','컨설팅신청']]],
    ['강의/보강',[['lectures','선택특강 신청'],['reclass','리클래스 수강']]],
    ['부엉이 Library',[['guide','가이드북'],['faq','FAQ'],['call','바로Call']]],
  ];
  const ctx = {state,escape,icon,asset,go,render,modal,closeModal,toast,read,store};
  function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3200); }
  function toggleMenu(open) {
    $('#navigation').hidden = !open; $('#drawer-shade').hidden = !open;
    $('#menu-button').setAttribute('aria-expanded', String(open)); $('#app').classList.toggle('menu-open',open);
    if (open) { $('#navigation').scrollTop = 0; $('.drawer-close').focus(); } else { $('#menu-button').focus(); }
  }
  function renderMenu() { $('#menu-groups').innerHTML = menuGroups.map(([title,items]) => `<section class="menu-group"><h2>${title}</h2><div class="menu-grid">${items.map(([page,label]) => `<button data-action="navigate" data-page="${page}" data-label="${label}" ${state.page === page ? 'aria-current="page"' : ''}>${label}</button>`).join('')}</div></section>`).join(''); }
  function render() {
    const screen = screens[state.page];
    document.title = `${screen.title} · 시대인재 N`;
    $('#page-title').textContent = screen.title;
    $('#page-header').hidden = Boolean(screen.headerless);
    $('#screen').classList.toggle('full-bleed', Boolean(screen.fullBleed));
    $('#screen').setAttribute('data-page',state.page);
    $('#header-actions').innerHTML = screen.header?.(ctx) || '';
    $('#screen').innerHTML = screen.render(ctx);
    renderMenu(); screen.mount?.(ctx);
  }
  function go(page) {
    if (!Object.hasOwn(screens, page)) return;
    closeModal(); toggleMenu(false); state.page = page;
    render(); $('#screen').scrollTop = 0;
  }
  function modal(title, html, className = '') {
    returnFocus = document.activeElement;
    $('#modal-title').textContent = title; $('#modal-body').innerHTML = html;
    $('#modal').className = `app-modal ${className}`; $('#modal').hidden = false; $('#modal-shade').hidden = false;
    $('#app').classList.add('modal-open'); $('#modal').scrollTop = 0; $('.modal-close').focus();
  }
  function closeModal() {
    const wasOpen = !$('#modal').hidden;
    $('#modal').hidden = true; $('#modal-shade').hidden = true; $('#app').classList.remove('modal-open');
    if (wasOpen && returnFocus?.isConnected) returnFocus.focus();
  }
  document.addEventListener('click', event => {
    const el = event.target.closest('[data-action]'); if (!el || el.disabled) return;
    const action = el.dataset.action;
    if(action === 'open-menu') return toggleMenu(true);
    if(action === 'close-menu') return toggleMenu(false);
    if(action === 'close-modal') return closeModal();
    if(action === 'navigate') { if (el.dataset.page === 'counseling') state.counselChoice = el.dataset.label === '담임 선생님' ? 'teacher' : 'manager'; return go(el.dataset.page); }
    if(action === 'notifications') return modal('알림','<p>새로운 알림이 없습니다.</p>');
    if(action === 'profile') return modal('내 정보','<p><strong>이현서t</strong></p><p>78174191 / 임시관 / 1 / 4</p><p class="modal-note">캡처에 표시된 프로필입니다.</p>');
    screens[state.page].onAction?.(action,el,ctx);
  });
  document.addEventListener('change', event => screens[state.page].onChange?.(event,ctx));
  document.addEventListener('input', event => screens[state.page].onInput?.(event,ctx));
  document.addEventListener('submit', event => { event.preventDefault(); screens[state.page].onSubmit?.(event,ctx); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else if (!$('#navigation').hidden) toggleMenu(false); }
    if (event.key !== 'Tab') return;
    const host = !$('#modal').hidden ? $('#modal') : !$('#navigation').hidden ? $('#navigation') : null;
    if (!host) return;
    const items = [...host.querySelectorAll('button:not([disabled]),input,select,textarea,a[href]')].filter(el => el.getClientRects().length);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  function scale() { $('#app').style.setProperty('--app-scale', $('#tablet-frame').getBoundingClientRect().width / 1180); }
  window.addEventListener('resize',scale);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(scale).observe($('#tablet-frame'));
  scale(); render();
  window.NApp = {state,go,render,ctx};
})();
