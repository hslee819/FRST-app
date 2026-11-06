(() => {
  'use strict';
  window.NScreens ||= {};
  const categories = [
    { id: 'absence', title: '결석지각' },
    { id: 'outing', title: '외출신청' },
    { id: 'early', title: '조퇴신청' },
    { id: 'question', title: '문의신청' },
  ];
  const guides = [
    { id: 'space', title: '공간' }, { id: 'content', title: '컨텐츠' },
    { id: 'management', title: '매니지먼트' }, { id: 'signature', title: '시그니처' },
  ];
  const subjects = ['국어', '수학', '영어', '한국사', '과학', '논술/면접'];
  const courses = [
    { id: 'kang-eunyang', name: '(선특) 강은양T 문학 특강', teacher: '강은양', time: '화요일 10:30~12:10', room: '본관 101호' },
    { id: 'kang-jiyeon', name: '(선특) 강지연T 국어 종합 특강', teacher: '강지연', time: '수요일 08:30~10:10', room: '본관 301호' },
    { id: 'sim-chanwoo', name: '(선특) 심찬우T 문학 특강', teacher: '심찬우', time: '화요일 18:20~20:00', room: 'N관 L층 102호' },
  ];
  const icons = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 3v3m9 6h-3m-6 9v-3m-9-6h3m6-5v5h5"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="4"/>',
    document: '<path d="M5 2h14v17H5zM8 6h8M8 10h8M8 14h4"/><circle cx="17" cy="19" r="4"/><path d="m15 19 1.5 1.5 3-3"/>',
    thumb: '<path d="M8 11v11H3V11zm0 1 4-6V2h2c2 0 2 5 1 8h6v11H8"/>',
  };
  const glyph = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
  const dots = (active = false) => `<span class="svc-dots" aria-label="${active ? '소통원활' : '상태 정보 없음'}"><i${active ? ' class="is-available"' : ''}></i><i></i><i></i></span>`;
  function state(ctx) {
    const current = ctx.state.services ||= { faq: '', subject: '국어', lectureTab: 'available', counselor: 'manager', reclassTab: 'LIVE 강의' };
    if (ctx.state.counselChoice) {
      current.counselor = ctx.state.counselChoice === 'teacher' ? 'teacher' : 'manager';
      delete ctx.state.counselChoice;
    }
    return current;
  }
  function localCalls(ctx) {
    const value = ctx.read('n-local-calls', []);
    return Array.isArray(value) ? value : [];
  }
  function showCallForm(ctx, id) {
    const category = categories.find(item => item.id === id);
    if (!category) return;
    ctx.modal(category.title, `<form class="svc-form" id="svc-call-form" data-kind="${id}"><p class="svc-form-note">작성한 내용은 이 브라우저에만 보관됩니다. 학원으로 전송되거나 실제 신청이 접수되지는 않습니다.</p><label>신청 날짜<input name="date" type="date" value="2026-11-06" required></label><label>${id === 'question' ? '문의 내용' : '사유'}<textarea name="message" rows="4" maxlength="1000" placeholder="내용을 입력해 주세요." required></textarea></label><button class="pill blue" type="submit">작성 내용 보관하기</button></form>`);
  }
  function showCalls(ctx) {
    const entries = localCalls(ctx);
    ctx.modal('내가 신청한 Call 보기', `<div class="svc-call-records"><p class="svc-form-note">이 브라우저에 보관한 작성 내용입니다. 실제 신청 내역과는 연결되어 있지 않습니다.</p>${entries.length ? entries.map(item => `<article><strong>${ctx.escape(item.title)}</strong><time>${ctx.escape(item.date)}</time><p>${ctx.escape(item.message)}</p><small>내 브라우저에 보관됨</small></article>`).join('') : '<p class="svc-dialog-empty">보관한 내용이 없습니다.</p>'}</div>`);
  }
  function handleAction(action, el, ctx) {
    const s = state(ctx);
    if (action === 'svc-call') showCallForm(ctx, el.dataset.kind);
    else if (action === 'svc-call-records') showCalls(ctx);
    else if (action === 'svc-guide') {
      const guide = guides.find(item => item.id === el.dataset.guide);
      if (guide) ctx.modal(`Library 가이드북 · ${guide.title}`, `<div class="svc-guide-preview"><img src="${ctx.asset(`guide-${guide.id}`)}" alt="${guide.title}"><p>세부 안내는 등록된 가이드북에서 확인해 주세요.</p></div>`);
    } else if (action === 'svc-subject') { s.subject = el.dataset.subject; ctx.render(); }
    else if (action === 'svc-lecture-tab') { s.lectureTab = el.dataset.tab; ctx.render(); }
    else if (action === 'svc-course') {
      const course = courses.find(item => item.id === el.dataset.course);
      if (course) ctx.modal('선택 특강 신청', `<div class="svc-course-preview"><h3>${ctx.escape(course.name)}</h3><p>국어(국어) ${ctx.escape(course.teacher)} 선생님</p><p>${ctx.escape(course.time)} · ${ctx.escape(course.room)}</p><p class="svc-form-note">강좌 정보를 확인하는 화면입니다. 실제 수강 신청은 학원 신청 시스템에서 진행해 주세요.</p></div>`);
    } else if (action === 'svc-consult-apply') {
      ctx.modal('수시컨설팅 신청', '<p class="svc-dialog-message">신청 기간이 종료되었습니다.</p><p class="svc-form-note">신청 기한: 8월 13일 22:00까지</p>');
    } else if (action === 'svc-counselor') { s.counselor = el.dataset.person; ctx.render(); }
    else if (action === 'svc-reclass-tab') { s.reclassTab = el.dataset.tab; ctx.render(); }
    else if (action === 'svc-reclass-notice') ctx.modal('개인정보처리방침 개정공지', '<p class="svc-dialog-message">공지 본문이 등록되어 있지 않습니다.</p>');
    else if (action === 'svc-reclass-logout') ctx.modal('로그아웃', '<p class="svc-dialog-message">현재 로그인된 계정이 없습니다.</p>');
    else return false;
    return true;
  }
  function handleSubmit(event, ctx) {
    if (event.target.id === 'svc-faq-form') {
      event.preventDefault();
      state(ctx).faq = String(new FormData(event.target).get('query') || '').trim();
      ctx.render();
      ctx.toast('검색어에 대한 검색 결과가 없습니다.');
      return true;
    }
    if (event.target.id !== 'svc-call-form') return false;
    event.preventDefault();
    const data = new FormData(event.target);
    const category = categories.find(item => item.id === event.target.dataset.kind);
    const message = String(data.get('message') || '').trim();
    const date = String(data.get('date') || '');
    if (!category || !message || !date) { ctx.toast('신청 날짜와 내용을 입력해 주세요.'); return true; }
    const entries = localCalls(ctx);
    entries.unshift({ title: category.title, date, message });
    if (ctx.store('n-local-calls', entries) === false) return true;
    ctx.closeModal();
    ctx.toast('작성 내용을 이 브라우저에 보관했습니다.');
    return true;
  }
  const shared = { onAction: handleAction, onSubmit: handleSubmit };
  Object.assign(window.NScreens, {
    call: {
      ...shared, title: 'Library 바로 Call',
      header() { return `<div class="svc-call-status">${dots()}</div>`; },
      render(ctx) { return `<section class="svc-call"><div class="svc-call-options">${categories.map(item => `<button class="svc-call-option" data-action="svc-call" data-kind="${item.id}"><img src="${ctx.asset(`call-${item.id}`)}" alt=""><strong>${item.title}</strong></button>`).join('')}</div><button class="pill blue svc-call-history" data-action="svc-call-records">내가 신청한 Call 보기 ${ctx.icon('chevron-right')}</button></section>`; },
    },
    faq: {
      ...shared, title: 'Library FAQ',
      header(ctx) { return `<form class="svc-faq-search" id="svc-faq-form" role="search"><input name="query" aria-label="FAQ 검색어" placeholder="궁금하신 내용을 입력해주세요." value="${ctx.escape(state(ctx).faq)}"><button type="submit" aria-label="검색">${ctx.icon('search')}</button></form>`; },
      render(ctx) { return `<section class="svc-faq"><h2>${glyph('thumb')}<span>자주 찾는 질문 <em>TOP 5</em></span></h2><div class="svc-faq-empty"><img src="${ctx.asset('faq-empty')}" alt="검색 결과를 확인하는 안내 캐릭터"><p>검색어에 대한 검색 결과가 없습니다.<br>맞춤법이나 띄어쓰기를 한 번 더 확인해주세요.</p><p class="svc-faq-help">더 궁금하신 내용은 <button data-action="navigate" data-page="counseling">1:1 상담 신청</button>을 이용해 주세요.</p></div></section>`; },
    },
    guide: {
      ...shared, title: 'Library 가이드북',
      render(ctx) { return `<section class="svc-guide" aria-label="가이드북 분야">${guides.map(item => `<button class="svc-guide-card" data-action="svc-guide" data-guide="${item.id}" aria-label="${item.title} 가이드북 보기"><img src="${ctx.asset(`guide-${item.id}`)}" alt="${item.title}"></button>`).join('')}</section>`; },
    },
    reclass: {
      ...shared, title: 'LIVE 강의', headerless: true, fullBleed: true,
      render(ctx) {
        const tab = state(ctx).reclassTab;
        return `<section class="svc-reclass"><header class="svc-reclass-masthead"><button class="svc-reclass-brand" data-action="navigate" data-page="home" aria-label="시대인재 N 홈"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M3 25 16 2h9L12 25H3ZM15 4l10 21H12"/><circle cx="14" cy="15" r="1"/></svg><strong>시대인재 <b>N</b></strong><span>재수종합</span></button><button data-action="svc-reclass-logout">로그아웃</button></header><nav class="svc-reclass-tabs" aria-label="강의 메뉴">${['LIVE 강의', '복습/추가 강좌', '선생님 공지'].map(label => `<button class="${tab === label ? 'is-active' : ''}" data-action="svc-reclass-tab" data-tab="${label}" aria-pressed="${tab === label}">${label}</button>`).join('')}</nav><div class="svc-reclass-body"><button class="svc-reclass-notice" data-action="svc-reclass-notice"><strong>시대인재 공지</strong><span>개인정보처리방침 개정공지</span>${ctx.icon('chevron-right')}</button><h2>${tab}</h2><div class="svc-reclass-empty">${tab === 'LIVE 강의' ? 'LIVE 강좌가 없습니다.' : tab === '복습/추가 강좌' ? '등록된 강좌가 없습니다.' : '등록된 선생님 공지가 없습니다.'}</div><h3>안내사항</h3><table class="svc-player-guide"><tbody><tr><th>라이브 재생 안내</th><td>- 크롬 및 Edge만 지원 가능합니다. (IE 지원불가)<br>- 동일한 ID로 여러 개의 브라우저나 PC에서 접속 시 수강 제한 될 수 있습니다.</td></tr><tr><th>플레이어 수동설치<br>(PC)</th><td>- 플레이어가 자동 다운로드 되지 않을 경우 프로그램 수동설치를 진행해 주세요.<br>- 플레이어 수동 설치 파일: <a href="https://v.kr.kollus.com/pc_player_install/agent?cpk=catenoid-sample" target="_blank" rel="noopener noreferrer">https://v.kr.kollus.com/pc_player_install/agent?cpk=catenoid-sample</a><br>- 상세안내: <a href="https://catenoid-support.atlassian.net/wiki/spaces/SUP/pages/3310333/Kollus+Video+Player" target="_blank" rel="noopener noreferrer">https://catenoid-support.atlassian.net/wiki/spaces/SUP/pages/3310333/Kollus+Video+Player</a></td></tr></tbody></table></div></section>`;
      },
    },
    lectures: {
      ...shared, title: '선택 특강 신청',
      render(ctx) {
        const s = state(ctx);
        return `<section class="svc-lectures"><p class="svc-lecture-note">· 매주 목요일까지 신청된 선택 특강은 차주 월요일부터 반영됩니다.<br>· 선택 특강 신청 후 취소한 강좌는 추후 재신청이 불가하오니 신중한 선택 부탁드립니다.</p><div class="svc-subjects" role="group" aria-label="특강 과목">${subjects.map(subject => `<button class="pill ${s.subject === subject ? 'black' : ''}" data-action="svc-subject" data-subject="${subject}" aria-pressed="${s.subject === subject}">${subject}</button>`).join('')}</div><div class="svc-lecture-tabs" role="tablist" aria-label="특강 신청 내역"><button role="tab" aria-selected="${s.lectureTab === 'available'}" class="${s.lectureTab === 'available' ? 'is-active' : ''}" data-action="svc-lecture-tab" data-tab="available">선택 특강 신청 (6)</button><button role="tab" aria-selected="${s.lectureTab === 'history'}" class="${s.lectureTab === 'history' ? 'is-active' : ''}" data-action="svc-lecture-tab" data-tab="history">내 수강 이력 보기 (0)</button></div><div class="svc-courses">${s.lectureTab === 'history' ? '<p class="svc-course-empty">수강 이력이 없습니다.</p>' : s.subject !== '국어' ? '<p class="svc-course-empty">이 과목의 강좌 정보는 제공된 화면에 포함되어 있지 않습니다.</p>' : courses.map(course => `<article class="svc-course"><div class="svc-course-title"><h2>${course.name}</h2><p>국어(국어) <strong>${course.teacher}</strong> 선생님</p></div><span class="svc-course-meta">${glyph('clock')}${course.time}</span><span class="svc-course-meta">${glyph('pin')}${course.room}</span><span class="svc-course-meta svc-course-available">${glyph('document')}가능</span><button class="svc-apply" data-action="svc-course" data-course="${course.id}">신청하기</button></article>`).join('') + '<p class="svc-course-unavailable">전체 6개 중 화면에서 확인되는 3개 강좌입니다. 나머지 강좌 정보는 제공되지 않았습니다.</p>'}</div></section>`;
      },
    },
    consulting: {
      ...shared, title: '수시컨설팅 신청',
      header() { return '<button class="pill blue svc-consult-button" data-action="svc-consult-apply">상담 신청하기</button>'; },
      render() { return `<section class="svc-consulting"><h2>수시컨설팅 안내</h2><table class="svc-consult-table"><tbody><tr><th>상담기간</th><td>7월 중순 경 ~ 9월 초까지 순차적으로 진행</td></tr><tr><th>상담진행</th><td>시대인재 입시 R&amp;D센터, 시대인재 입시 HRD센터, 시대인재 입시평가연구소, 시대인재 입시 컨설턴트 등</td></tr><tr><th>상담장소</th><td>컨설턴트 배정 후, 개별 안내 예정</td></tr><tr><th>제출서류</th><td>6월 평가원 모의고사 성적표, 학생 생활 기록부<p>*학종,교과,기타 특이전형 지원자만 해당, 논술만 지원하는 학생들은 해당사항 없음</p></td></tr><tr><th>신청기한</th><td>8월 13일 22:00까지<p>* 신청 기간 이후 신청은 불가능하며 신청서의 내용을 변경하고자 하는 경우 제출기한 내 재신청 부탁드립니다.</p></td></tr></tbody></table><h2 class="svc-consult-caution-title">유의사항</h2><ul class="svc-consult-cautions"><li>잘못된 정보 기입 및 개인사정으로 인한 시간 변경 건으로 인한 불이익은 학원에서 책임을 지지 않습니다.</li><li>컨설팅 관련 정보(장소,컨설턴트 등)는 컨설팅 대상이 아닌 학생들에게 유출되지 않도록 주의 부탁드립니다.</li><li>학생부 종합 전형과 같이 서류제출이 필요한 경우 최소 7일 전에 제출 부탁드립니다.</li><li>기타 특이전형(기회균형 특별전형,장애인 전형,지역인재 전형 등)은 미리 준비사항에 입력 부탁드립니다.</li><li>컨설팅 시 학부모님과 같이 상담이 가능합니다.</li><li>컨설팅 일정으로 인한 외출은 담임선생님께 사전신청 부탁드립니다.</li></ul></section>`; },
    },
    counseling: {
      ...shared, title: '1:1 상담 신청',
      render(ctx) {
        const selected = state(ctx).counselor;
        return `<section class="svc-counseling"><article class="svc-counsel-person"><div class="svc-speech">지금 이렇게 공부하는 게<br>맞는 방법 일까요?</div><img class="svc-person-image" src="${ctx.asset('counsel-manager')}" alt="김기도 학습 매니저 일러스트"><button class="svc-person-button ${selected === 'manager' ? 'is-selected' : ''}" data-action="svc-counselor" data-person="manager" aria-pressed="${selected === 'manager'}">김기도<br>학습 매니저</button><div class="svc-counsel-state">${dots(true)}<span>소통원활</span></div></article><article class="svc-counsel-person"><div class="svc-speech">부엉이 생활을 하면서<br>말 못할 고민이 있나요?</div><img class="svc-person-image" src="${ctx.asset('counsel-teacher')}" alt="담임선생님 일러스트"><button class="svc-person-button ${selected === 'teacher' ? 'is-selected' : ''}" data-action="svc-counselor" data-person="teacher" aria-pressed="${selected === 'teacher'}">담임선생님<br>배정 예정</button><div class="svc-counsel-state">${dots()}</div></article></section>`;
      },
    },
  });
})();
