(function () {
  'use strict';
  window.NScreens ||= {};

  const student = '백하영t';
  const studentInfo = '78174191 / 임시관 / 1 / 4';
  const categories = ['전체', '몰입도', '공지', '앱', '수업', '콘텐츠', '벌점'];
  const notices = [
    { id: 'class', category: '수업', date: '03-16', pinned: true, title: '제목이긴긴긴긴긴긴긴긴긴긴긴긴긴긴긴긴긴긴긴긴긴긴긴긴긴 공지사항입니다. 길고길고길고길고길고길고길고길고길어요', body: '공지사항입니다.' },
    { id: 'app', category: '앱', date: '03-16', pinned: true, attachment: true, title: '첨부파일이 등록된 중요 공지', body: '첨부파일이 등록된 중요 공지' },
    { id: 'notice', category: '공지', date: '03-16', pinned: true, title: '이미지 형태로 등록된 중요 공지' },
    { id: 'penalty', category: '벌점', date: '03-16', title: '중요하지않은일반공지' },
    { id: 'content', category: '콘텐츠', date: '03-12', attachment: true, title: '(테스트) 선택과목 교재 구매 안내' },
    { id: 'focus', category: '몰입도', date: '', title: '' },
  ];

  function state(ctx) {
    ctx.state.my ||= { month: 10, year: 2026, noticeCategory: '전체', surveyTab: 'active', mealDay: 6, mealWeek: 0, homeDay: 6 };
    return ctx.state.my;
  }

  function arrow(ctx, action, label, extra = '', direction = 'right') {
    return `<button type="button" class="my-chevron" data-action="${action}" aria-label="${label}" ${extra}>${ctx.icon('chevron-' + direction)}</button>`;
  }

  function navigate(ctx, page, label) {
    return `<button type="button" class="my-text-link" data-action="navigate" data-page="${page}">${label}${ctx.icon('chevron-right')}</button>`;
  }

  function month(ctx) {
    const s = state(ctx);
    return `<div class="my-month" aria-label="${s.year}년 ${s.month + 1}월">${arrow(ctx, 'my-month-prev', '이전 달', '', 'left')}<strong>${s.month + 1}</strong>${arrow(ctx, 'my-month-next', '다음 달', s.year === 2026 && s.month === 10 ? 'disabled' : '')}</div>`;
  }

  function calendar(ctx, attendance = false) {
    const s = state(ctx);
    const start = new Date(s.year, s.month, 1).getDay();
    const total = new Date(s.year, s.month + 1, 0).getDate();
    const captured = s.year === 2026 && s.month === 10;
    let cells = '';
    for (let index = 0; index < Math.ceil((start + total) / 7) * 7; index++) {
      const day = index - start + 1;
      if (day < 1 || day > total) { cells += '<div class="my-calendar-cell my-calendar-blank"></div>'; continue; }
      const weekend = captured && [1, 8, 15, 21, 22, 28, 29].includes(day);
      const exam = captured && day === 19;
      const event = weekend ? '주말' : exam ? '2027학년도 대학수학능력시험' : '';
      cells += `<div class="my-calendar-cell${weekend ? ' my-weekend' : ''}${captured && day === 6 ? ' my-today-cell' : ''}"><span class="my-day-number">${day}</span>${event ? `<button type="button" class="my-calendar-event" data-action="my-calendar-event" data-day="${day}" data-event="${event}">${attendance && exam ? '2027학년도 대학수...' : event}</button>` : ''}</div>`;
    }
    return `<div class="my-calendar-scroll${attendance ? ' my-attendance-calendar' : ''}" aria-label="${s.year}년 ${s.month + 1}월 달력"><div class="my-calendar-weekdays">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => `<span${i === 0 ? ' class="my-sunday"' : ''}>${d}</span>`).join('')}</div><div class="my-calendar-days">${cells}</div></div>`;
  }

  function renderCalendar(ctx, attendance = false) {
    return `<section class="my-calendar-page${attendance ? ' my-attendance' : ''}">${month(ctx)}<div class="my-calendar-toolbar">${attendance ? '<div class="my-legend"><span><i class="absence"></i>결석</span><span><i class="late"></i>지각</span><span><i class="out"></i>외출</span><span><i class="early"></i>조퇴</span><span><i class="other"></i>기타</span></div><button type="button" class="my-text-link" data-action="my-attendance-detail">상세현황 보기' + ctx.icon('chevron-right') + '</button>' : navigate(ctx, 'notices', '공지사항')}</div>${calendar(ctx, attendance)}</section>`;
  }

  function renderHome(ctx) {
    const s = state(ctx);
    const date = new Date(2026, 10, s.homeDay);
    const following = new Date(2026, 10, s.homeDay + 1);
    const number = value => String(value).padStart(2, '0');
    const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return `<section class="my-home"><div class="my-home-profile"><strong>${student}</strong><span>${studentInfo}</span></div><div class="my-home-date"><span>D-13</span><strong>2026.11.06</strong></div><div class="my-home-columns"><aside class="my-important"><h2>필/독/공/지</h2><div>${notices.slice(0, 3).map(n => `<button type="button" data-action="my-notice-open" data-notice="${n.id}"><strong>• ${ctx.escape(n.title)}</strong>${n.body ? `<span>${ctx.escape(n.body)}</span>` : ''}</button>`).join('')}</div></aside><div class="my-home-agenda"><div class="my-agenda-days"><article class="my-agenda-today"><div class="my-agenda-date"><strong>${number(date.getDate())}</strong><span>${weekdays[date.getDay()]}</span></div>${s.homeDay === 6 ? '<span class="my-today-badge">Today</span>' : ''}<p>새로운 공지 및 일정이<br>없습니다.</p><img class="my-home-study" src="${ctx.asset('home-study')}" alt="책상에서 공부하는 학생"></article><article class="my-agenda-next"><div class="my-agenda-date"><strong>${number(following.getDate())}</strong><span>${weekdays[following.getDay()]}</span></div><p>새로운 공지 및 일정이<br>없습니다.</p>${arrow(ctx, 'my-home-next', '다음 일정')}</article></div><button type="button" class="my-home-notice" data-action="navigate" data-page="notices"><b>공지</b><span>새로운 공지 및 일정이 없습니다.</span>${ctx.icon('chevron-right')}</button><button type="button" class="my-library-call" data-action="my-library-call">Library 바로 Call</button></div></div></section>`;
  }

  function renderTimetable(ctx) {
    const row = (period, monday = '', wednesday = '') => `<tr><th scope="row">${period}</th><td>${monday}</td><td></td><td>${wednesday}</td><td></td><td></td></tr>`;
    const breakRow = label => `<tr class="my-timetable-break"><th colspan="6">${label}</th></tr>`;
    const physics = '물리학2<br>현정훈<br>임시관 201호';
    return `<section class="my-timetable"><h2>${student}님의 시간표</h2><p>${studentInfo}</p><div class="my-timetable-download"><button type="button" class="my-text-link" data-action="my-timetable-download">시간표 다운로드${ctx.icon('download')}</button></div><div class="my-timetable-scroll"><table><thead><tr>${['교시', '월', '화', '수', '목', '금'].map(day => `<th scope="col">${day}</th>`).join('')}</tr></thead><tbody>${breakRow('아침시간')}${row(1, '', '사회문화A<br>김미향<br>임시관 L층 103호')}${row(2)}${breakRow('점심시간')}${row(3, physics)}${row(4, physics)}${breakRow('저녁시간')}</tbody></table></div></section>`;
  }

  function renderPenalty(ctx) {
    return `<section class="my-penalty"><div class="my-penalty-summary"><strong>누적 벌점 : 0점</strong><span>벌점 누계 : 0점 <i></i> 챌린지 누계 : 0점</span></div><button type="button" class="my-penalty-rules" data-action="my-penalty-rules">벌점 기준 보기</button><div class="my-penalty-empty"><img src="${ctx.asset('penalty-empty')}" alt="엄지를 들어 응원하는 두 사람"><p>${student} 학생은 벌점이 없어요!!<br>앞으로도 쭈욱 벌점은 만들지 말아요~</p></div></section>`;
  }

  function pin() {
    return '<svg class="my-pin" viewBox="0 0 24 24" aria-hidden="true"><path fill="#7564c9" d="m8 1 4 4-2 3 6 6 3-2 4 4-6 6-4-4 2-3-6-6-3 2-4-4Z"/><path stroke="#333" stroke-width="3" d="m17 18 5 5"/></svg>';
  }

  function attachment() {
    return '<svg class="my-attachment" viewBox="0 0 24 24" aria-label="첨부파일"><path d="m8 15 8-8a2 2 0 0 1 3 3L9 20a4 4 0 0 1-6-6L15 2a5 5 0 0 1 7 7L10 21" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  }

  function renderNotices(ctx) {
    const s = state(ctx);
    const visible = notices.filter(n => s.noticeCategory === '전체' || n.category === s.noticeCategory);
    return `<section class="my-notices"><div class="my-notice-tabs" role="group" aria-label="공지 분류">${categories.map(c => `<button type="button" class="${s.noticeCategory === c ? 'active' : ''}" data-action="my-notice-filter" data-category="${c}" aria-pressed="${s.noticeCategory === c}">${c}(${c === '전체' ? 6 : 1})</button>`).join('')}</div><div class="my-notice-toolbar">${navigate(ctx, 'calendar', '캘린더로 보기')}</div><div class="my-notice-list">${visible.map(n => `<button type="button" class="my-notice-row${n.pinned ? ' pinned' : ''}" data-action="my-notice-open" data-notice="${n.id}"><span class="my-notice-category">${n.category}</span><time>${n.date}</time><span class="my-notice-title">${n.pinned ? pin() : n.title ? '<b class="my-new-badge">N</b>' : ''}${ctx.escape(n.title || '제공된 화면에서 제목을 확인할 수 없습니다.')}${n.attachment ? attachment() : ''}</span></button>`).join('')}</div></section>`;
  }

  function openNotice(ctx, id) {
    const n = notices.find(item => item.id === id);
    if (!n) return;
    ctx.modal('공지 사항', `<article class="my-notice-detail"><div class="my-detail-meta">${n.category}${n.date ? ' · ' + n.date : ''}</div><h3>${ctx.escape(n.title || '몰입도 공지')}</h3><p>${ctx.escape(n.body || '제공된 화면에서 공지 본문을 확인할 수 없습니다.')}</p>${n.attachment ? '<p class="my-local-note">첨부파일 원본은 제공된 화면에 포함되어 있지 않습니다.</p>' : ''}${n.id === 'notice' ? '<p class="my-local-note">이 공지에 등록된 원본 이미지는 제공되지 않았습니다.</p>' : ''}<button type="button" class="my-black-button" data-action="my-modal-close">닫기</button></article>`, 'my-detail-dialog');
  }

  function renderSurveys(ctx) {
    const active = state(ctx).surveyTab === 'active';
    return `<section class="my-surveys"><div class="my-survey-tabs" role="group" aria-label="설문 상태"><button type="button" data-action="my-survey-tab" data-tab="active" class="${active ? 'active' : ''}" aria-pressed="${active}">진행 중인 설문</button><button type="button" data-action="my-survey-tab" data-tab="closed" class="${active ? '' : 'active'}" aria-pressed="${!active}">종료된 설문</button></div><p class="my-survey-count">총 1개</p><div class="my-survey-row"><time>${active ? '11월 5일(목)' : '10월 28일(수)'}</time><strong>${active ? '[대치] 하반기 수학 콘텐츠 평가' : '[대치] 시대N 10기 4차 서베이'}</strong><span class="my-survey-period">설문기간<br>${active ? '26.11.05 ~ 26.11.09' : '26.10.29 ~ 26.11.02'}</span><button type="button" data-action="my-survey-open" ${active ? '' : 'disabled'}>${active ? '참여하기' : '참여불가'}</button></div></section>`;
  }

  function openSurvey(ctx) {
    ctx.modal('시대인재N 설문조사', `<div class="my-survey-modal"><h3>[대치] 하반기 수학 콘텐츠 평가</h3><div class="my-survey-question"><span class="my-question-number">1</span><div><h4>1-1. 풀이 여부 <b>*</b></h4><strong>올해 배부된 Shortcut을 풀어본 적이 있나요? (필수)</strong><p>* Shortcut : 하반기 수학 학습을 위한 테마별 집중 학습 고난도 N제</p><img src="${ctx.asset('shortcut')}" alt="SHORTCUT 수학 I 01 교재 표지"></div></div><div class="my-survey-actions"><button type="button" disabled>이전</button><button type="button" class="my-black-button" data-action="my-survey-next">다음</button></div></div>`, 'my-survey-dialog');
  }

  function renderMeals(ctx) {
    const s = state(ctx);
    const firstDay = 2 + s.mealWeek * 7;
    return `<section class="my-meals"><div class="my-meal-week">${arrow(ctx, 'my-meal-week-prev', '이전 주', '', 'left')}${Array.from({ length: 5 }, (_, index) => { const date = new Date(2026, 10, firstDay + index); return `<button type="button" data-action="my-meal-day" data-day="${firstDay + index}" class="${s.mealDay === firstDay + index ? 'active' : ''}"><strong>${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}</strong><span>(${['월', '화', '수', '목', '금'][index]})</span></button>`; }).join('')}${arrow(ctx, 'my-meal-week-next', '다음 주')}</div><div class="my-meal-toolbar"><button type="button" class="my-text-link" data-action="my-meal-usage">이용 현황${ctx.icon('chevron-right')}</button></div><div class="my-meal-cards">${['점심', '저녁'].map((label, index) => `<article class="my-meal"><h2>${label}</h2><div class="my-meal-card"><div class="my-meal-food"><button type="button" class="my-meal-photo" data-action="my-meal-photo" aria-label="${label} 이미지 확대"><img src="${ctx.asset('meal')}" alt="그릇에 담긴 밥"><span>+</span></button><span class="my-meal-menu">-</span></div><button type="button" class="my-meal-rate" data-action="my-meal-rate" data-meal="${index}">맛 있었나요?</button></div></article>`).join('')}</div><button type="button" class="my-meal-write" data-action="my-meal-comment" aria-label="급식 의견 작성">${ctx.icon('edit')}</button></section>`;
  }

  function rating(ctx, meal) {
    const s = state(ctx);
    const key = `n-meal-rating-${s.mealDay}-${meal}`;
    const saved = ctx.read(key, null);
    ctx.modal('맛 있었나요?', `<form class="my-rating-form" data-form="my-rating"><p class="my-local-note">로컬 체험 · 선택한 평가는 이 브라우저에만 저장됩니다.</p><fieldset><legend>${meal === '0' ? '점심' : '저녁'} 만족도</legend><div class="my-rating-options">${[1, 2, 3, 4, 5].map(value => `<label><input type="radio" name="rating" value="${value}" ${Number(saved) === value ? 'checked' : ''} required><span>${value}점</span></label>`).join('')}</div></fieldset><input type="hidden" name="ratingKey" value="${key}"><button class="my-black-button" type="submit">이 브라우저에 저장</button></form>`, 'my-detail-dialog');
  }

  function downloadTimetable(ctx) {
    const rows = [['교시', '월', '화', '수', '목', '금'], ['아침시간', '', '', '', '', ''], ['1', '', '', '사회문화A / 김미향 / 임시관 L층 103호', '', ''], ['2', '', '', '', '', ''], ['점심시간', '', '', '', '', ''], ['3', '물리학2 / 현정훈 / 임시관 201호', '', '', '', ''], ['4', '물리학2 / 현정훈 / 임시관 201호', '', '', '', ''], ['저녁시간', '', '', '', '', '']];
    const csv = '\ufeff' + rows.map(row => row.map(value => '"' + value.replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = '백하영t-시간표.csv';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ctx.toast('화면에 표시된 시간표를 CSV로 다운로드했습니다.');
  }

  function onAction(action, el, ctx) {
    if (!action.startsWith('my-')) return false;
    const s = state(ctx);
    switch (action) {
      case 'my-month-prev':
      case 'my-month-next': {
        const date = new Date(s.year, s.month + (action.endsWith('prev') ? -1 : 1), 1);
        if (date > new Date(2026, 10, 1)) return true;
        s.year = date.getFullYear(); s.month = date.getMonth(); ctx.render(); break;
      }
      case 'my-calendar-event': ctx.modal('일정', `<div class="my-event-detail"><p>${s.year}.${String(s.month + 1).padStart(2, '0')}.${el.dataset.day}</p><h3>${ctx.escape(el.dataset.event)}</h3><button class="my-black-button" data-action="my-modal-close">닫기</button></div>`, 'my-detail-dialog'); break;
      case 'my-attendance-detail': ctx.modal('출결 상세현황', '<p class="my-local-note">제공된 11월 화면에는 출결 내역이 표시되어 있지 않습니다.</p><button class="my-black-button" data-action="my-modal-close">닫기</button>', 'my-detail-dialog'); break;
      case 'my-home-next': s.homeDay = s.homeDay >= 29 ? 6 : s.homeDay + 1; ctx.render(); break;
      case 'my-library-call': ctx.go('call'); break;
      case 'my-penalty-rules': ctx.modal('벌점 기준', '<p>벌점 기준표는 제공된 화면에 포함되어 있지 않습니다.</p><p>현재 누적 벌점 : 0점</p><button class="my-black-button" data-action="my-modal-close">닫기</button>', 'my-detail-dialog'); break;
      case 'my-timetable-download': downloadTimetable(ctx); break;
      case 'my-notice-filter': s.noticeCategory = el.dataset.category; ctx.render(); break;
      case 'my-notice-open': openNotice(ctx, el.dataset.notice); break;
      case 'my-survey-tab': s.surveyTab = el.dataset.tab; ctx.render(); break;
      case 'my-survey-open': openSurvey(ctx); break;
      case 'my-survey-next': ctx.modal('설문 화면 안내', '<p>제공된 화면에서 확인할 수 있는 설문은 여기까지입니다. 선택지와 다음 문항은 제공되지 않아 응답을 제출하지 않습니다.</p><div class="my-survey-actions"><button type="button" data-action="my-survey-open">이전 화면</button><button type="button" class="my-black-button" data-action="my-modal-close">닫기</button></div>', 'my-detail-dialog'); break;
      case 'my-meal-day': s.mealDay = Number(el.dataset.day); ctx.render(); break;
      case 'my-meal-week-prev': s.mealWeek -= 1; s.mealDay = 6 + s.mealWeek * 7; ctx.render(); break;
      case 'my-meal-week-next': s.mealWeek += 1; s.mealDay = 6 + s.mealWeek * 7; ctx.render(); break;
      case 'my-meal-photo': ctx.modal('급식 이미지', `<img class="my-meal-enlarged" src="${ctx.asset('meal')}" alt="그릇에 담긴 밥">`, 'my-photo-dialog'); break;
      case 'my-meal-rate': rating(ctx, el.dataset.meal); break;
      case 'my-meal-usage': ctx.modal('급식 이용 현황', '<p class="my-local-note">제공된 화면에는 실제 이용 내역이 포함되어 있지 않습니다.</p><button class="my-black-button" data-action="my-modal-close">닫기</button>', 'my-detail-dialog'); break;
      case 'my-meal-comment': ctx.modal('급식 의견', `<form class="my-comment-form" data-form="my-comment"><p class="my-local-note">로컬 체험 · 의견은 이 브라우저에만 저장됩니다.</p><label for="my-meal-comment">의견</label><textarea id="my-meal-comment" name="comment" maxlength="1000" required>${ctx.escape(ctx.read('n-meal-comment', ''))}</textarea><button class="my-black-button" type="submit">이 브라우저에 저장</button></form>`, 'my-detail-dialog'); break;
      case 'my-modal-close': ctx.closeModal(); break;
      default: return false;
    }
    return true;
  }

  function onSubmit(event, ctx) {
    const form = event.target;
    if (form.dataset.form === 'my-rating') {
      event.preventDefault();
      const values = new FormData(form);
      if (!values.get('rating')) return true;
      if (ctx.store(values.get('ratingKey'), Number(values.get('rating'))) === false) return true;
      ctx.closeModal(); ctx.toast('평가를 이 브라우저에 저장했습니다.'); return true;
    }
    if (form.dataset.form === 'my-comment') {
      event.preventDefault();
      const value = String(new FormData(form).get('comment') || '').trim();
      if (!value) return true;
      if (ctx.store('n-meal-comment', value) === false) return true;
      ctx.closeModal(); ctx.toast('의견을 이 브라우저에 저장했습니다.'); return true;
    }
    return false;
  }

  const screen = (title, render) => ({ title, render, onAction, onSubmit });
  Object.assign(window.NScreens, {
    home: screen('시대인재 N', renderHome),
    attendance: screen('출결 현황', ctx => renderCalendar(ctx, true)),
    calendar: screen('캘린더', ctx => renderCalendar(ctx)),
    timetable: screen('시간표', renderTimetable),
    penalty: screen('벌점 현황', renderPenalty),
    notices: screen('공지 사항', renderNotices),
    meals: screen('급식 현황', renderMeals),
    surveys: screen('설문지', renderSurveys),
  });
})();
