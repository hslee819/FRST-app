(() => {
  'use strict';
  const D = window.FocusData;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const STORAGE_KEY = 'focus-study-records-v1';
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const parseDate = (date) => new Date(`${date}T12:00:00`);
  const shortDate = (date) => date.slice(5).replace('-', '.');
  const weekday = (date) => weekdays[parseDate(date).getDay()];
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const score = (value) => value === null ? '—' : Number(value.toFixed(1)).toString();
  const iconPaths = {
    'chevron-left': '<path d="m14 6-6 6 6 6"/>',
    'chevron-right': '<path d="m10 6 6 6-6 6"/>',
    'arrow-right': '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    'arrow-down': '<path d="M12 4v15m-5-5 5 5 5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h2m4 0h2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    sparkle: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
    trend: '<path d="m3 17 6-6 4 3 8-10m-6 0h6v6"/>',
    chart: '<path d="M4 4v16h17M8 15v-4m5 4V6m5 9V9"/>',
    book: '<path d="M12 5v15M3 4h5a4 4 0 0 1 4 3 4 4 0 0 1 4-3h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3V4Z"/>',
    school: '<path d="m3 8 9-5 9 5-9 5-9-5Zm4 3v6c3 3 7 3 10 0v-6m4-3v8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3v.1"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  };
  const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.info}</svg>`;
  $$('[data-icon]').forEach((element) => { element.innerHTML = icon(element.dataset.icon); });

  let storageAvailable = true;
  let userRecords = [];
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) throw new Error('Invalid records');
    const ids = new Set();
    userRecords = saved.filter((r) => {
      const valid = r && typeof r.id === 'string' && !ids.has(r.id) && /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
        D.dateKey(parseDate(r.date)) === r.date && ['lecture', 'self'].includes(r.type) &&
        Number.isInteger(r.minutes) && r.minutes > 0 && r.minutes <= 1440 &&
        (r.focus === null || (Number.isFinite(r.focus) && r.focus >= 0 && r.focus <= 10)) &&
        typeof r.note === 'string' && r.note.length <= 100;
      if (valid) ids.add(r.id);
      return valid;
    }).map((r) => ({ id: r.id, date: r.date, type: r.type, minutes: r.minutes, focus: r.focus, note: r.note, source: 'user' }));
  } catch { storageAvailable = false; }

  const state = { year: 2026, month: 9, periodId: '2026-10-26', view: 'weekly', day: '2026-10-26' };
  let visiblePeriods = [];
  let currentPeriod;
  let currentSummary;
  let tooltipData = [];
  let toastTimer;
  let activePage = 'personal';
  const records = () => [...D.seedRecords, ...userRecords];

  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3800);
  }

  function saveRecords(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      storageAvailable = true;
      userRecords = next;
      return true;
    } catch {
      $('#form-error').textContent = '브라우저에 저장할 수 없어요. 저장 공간과 브라우저의 사이트 데이터 설정을 확인해 주세요.';
      $('#form-error').hidden = false;
      return false;
    }
  }

  function render() {
    const focusedPeriod = document.activeElement?.closest('[data-period]');
    const focusParentId = focusedPeriod?.parentElement.id;
    const focusPeriodId = focusedPeriod?.dataset.period;
    const allRecords = records();
    const allPeriods = D.getPeriods(state.year, state.month);
    visiblePeriods = allPeriods.filter((period) => period.label !== '월초' || allRecords.some((r) => r.date >= period.start && r.date <= period.end) || period.id === state.periodId);
    currentPeriod = visiblePeriods.find((period) => period.id === state.periodId) || visiblePeriods.at(-1);
    state.periodId = currentPeriod.id;
    currentSummary = D.aggregatePeriod(allRecords, currentPeriod);
    if (!currentSummary.days.some((day) => day.date === state.day)) {
      state.day = currentSummary.days.find((day) => day.total > 0)?.date || currentSummary.days[0]?.date || currentPeriod.start;
    }
    $('#year-label').textContent = `${state.year}년`;
    $('#month-label').innerHTML = `${state.month + 1}<span>월</span>`;
    $('#week-tabs').innerHTML = visiblePeriods.map((p) => `<button class="week-tab${p.id === state.periodId ? ' active' : ''}" data-period="${p.id}" aria-pressed="${p.id === state.periodId}"><strong>${p.label}</strong><small>${shortDate(p.start)} – ${shortDate(p.end)}</small></button>`).join('');
    $('#date-range').textContent = `${shortDate(currentPeriod.start)} — ${shortDate(currentPeriod.end)}`;
    renderStats();
    renderChart();
    renderOverview();
    window.FocusComparison.refresh();
    if (focusParentId && focusPeriodId) document.getElementById(focusParentId)?.querySelector(`[data-period="${focusPeriodId}"]`)?.focus({ preventScroll: true });
  }

  function renderStats() {
    const summary = currentSummary;
    const prevIndex = visiblePeriods.findIndex((p) => p.id === state.periodId) - 1;
    const previous = prevIndex >= 0 ? D.aggregatePeriod(records(), visiblePeriods[prevIndex]) : null;
    const focusDifference = previous?.focus !== null && previous?.focus !== undefined && summary.focus !== null ? summary.focus - previous.focus : null;
    const focusFooter = focusDifference === null ? '매일의 몰입을 차곡차곡 기록해요' : Math.abs(focusDifference) < 0.05 ? '지난주와 같은 몰입도를 유지했어요' : `지난주보다 <b class="${focusDifference > 0 ? 'trend-up' : 'trend-neutral'}">${score(Math.abs(focusDifference))}점 ${focusDifference > 0 ? '높아요' : '낮아요'}</b>`;
    $('#stats-grid').innerHTML = [
      `<article class="stat-card"><div class="stat-top"><span>총 공부 시간</span><span class="stat-icon">${icon('clock')}</span></div><div class="stat-value">${Math.floor(summary.total / 60)}<em>시간</em>${summary.total % 60}<em>분</em></div><div class="stat-foot">${icon('calendar')}<b>${summary.activeDays}일</b> 동안 쌓아온 소중한 시간</div></article>`,
      `<article class="stat-card"><div class="stat-top"><span>평균 몰입도</span><span class="stat-icon">${icon('target')}</span></div><div class="stat-value"><span class="accent">${summary.focus === null ? '—' : summary.focus.toFixed(1)}</span><em>/ 10</em></div><div class="stat-foot">${icon('trend')}${focusFooter}</div></article>`,
      `<article class="stat-card"><div class="stat-top"><span>가장 몰입한 날</span><span class="stat-icon">${icon('sparkle')}</span></div><div class="stat-value">${summary.bestDay ? `${weekday(summary.bestDay.date)}요일<em>${shortDate(summary.bestDay.date)}</em>` : '—'}</div><div class="stat-foot">${summary.bestDay ? `<span class="day-tag">몰입도 ${score(summary.bestDay.focus)}</span> 나의 집중이 빛났던 하루` : '첫 몰입의 순간을 기록해 보세요'}</div></article>`,
    ].join('');
  }

  function renderOverview() {
    $('#overview-heading').textContent = `${state.month + 1}월, 차곡차곡`;
    $('#overview-grid').innerHTML = visiblePeriods.map((p) => {
      const summary = D.aggregatePeriod(records(), p);
      const active = p.id === state.periodId;
      const points = summary.days.map((d, i) => ({ x: 16 + i * (188 / Math.max(1, summary.days.length - 1)), y: 65 - (d.focus || 0) * 5 }));
      const line = summary.days.map((d, i) => d.focus === null ? '' : `${i === 0 || summary.days[i - 1].focus === null ? 'M' : 'L'}${points[i].x},${points[i].y}`).join(' ');
      const max = Math.max(720, ...summary.days.map((d) => d.total));
      const bars = summary.days.map((d, i) => `<rect x="${points[i].x - 10}" y="${67 - d.total / max * 49}" width="20" height="${d.total / max * 49}" rx="4" fill="${active ? '#f1e9e7' : '#eff1f4'}"/>`).join('');
      return `<button class="overview-card${active ? ' active' : ''}" data-period="${p.id}" aria-pressed="${active}" aria-label="${p.label} 학습 현황 보기"><div class="overview-top"><span class="week-badge">${p.label}</span><span>${shortDate(p.start)} – ${shortDate(p.end)}</span></div><div class="overview-value">${D.formatMinutes(summary.total, true)}<small>공부했어요</small></div><svg class="mini-chart" viewBox="0 0 220 78" preserveAspectRatio="none" aria-hidden="true">${bars}<path d="${line}" fill="none" stroke="${active ? '#ef736b' : '#bbc1ca'}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>${summary.days.map((d, i) => d.focus === null ? '' : `<circle cx="${points[i].x}" cy="${points[i].y}" r="2.7" fill="white" stroke="${active ? '#ef736b' : '#bbc1ca'}" stroke-width="1.5"/>`).join('')}</svg><div class="overview-bottom"><span>평균 몰입도</span><strong>${summary.focus === null ? '—' : summary.focus.toFixed(1)} <span>/ 10</span></strong></div></button>`;
    }).join('');
  }

  // The references provide daily totals, not individual hourly measurements.
  // Apportion the total into illustrative hourly slots; the UI labels this explicitly.
  function distribute(total, weights, caps) {
    const values = weights.map(() => 0);
    let left = Math.round(total);
    while (left > 0) {
      let best = -1;
      let bestPriority = -1;
      weights.forEach((weight, i) => {
        if (values[i] >= caps[i]) return;
        const priority = weight / (values[i] + 1);
        if (priority > bestPriority) { best = i; bestPriority = priority; }
      });
      if (best < 0) break;
      values[best]++;
      left--;
    }
    return values;
  }

  function hourlyData(day) {
    const count = Math.max(15, Math.ceil(day.total / 60));
    const start = count <= 16 ? 8 : 0;
    const profile = [4, 8, 0, 0, 4, 5, 5, 5, 5, 7, 5, 5, 5, 7, 3];
    const weights = Array.from({ length: count }, (_, i) => 0.18 + (profile[i % 15] / 8));
    const totals = distribute(day.total, weights, weights.map(() => 60));
    const lecture = distribute(day.lecture, weights.map((w, i) => totals[i] * (i < 7 ? 1.4 : 0.5)), totals);
    return totals.map((total, i) => ({ date: day.date, label: String((start + i) % 24).padStart(2, '0'), total, lecture: lecture[i], self: total - lecture[i], focus: day.focus === null || !total ? null : day.focus, hour: (start + i) % 24 }));
  }

  function renderChart() {
    const focusedDay = document.activeElement?.closest('[data-day]')?.dataset.day;
    const daily = state.view === 'daily';
    $$('[data-view]').forEach((button) => {
      const active = button.dataset.view === state.view;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', active);
    });
    $('#chart-heading').textContent = daily ? '하루의 몰입 흐름' : '한 주의 몰입 흐름';
    $('#daily-controls').hidden = !daily || !currentSummary.total;
    $('#day-tabs').innerHTML = currentSummary.days.map((day) => `<button class="day-tab${day.date === state.day ? ' active' : ''}" data-day="${day.date}" aria-pressed="${day.date === state.day}">${weekday(day.date)} <span>${parseDate(day.date).getDate()}</span></button>`).join('');
    const day = D.aggregateDay(records(), state.day);
    const data = daily ? hourlyData(day) : currentSummary.days.map((d) => ({ ...d, label: weekday(d.date) }));
    const hasData = daily ? day.total > 0 : currentSummary.total > 0;
    $('#chart-area').hidden = !hasData;
    $('#chart-legend').hidden = !hasData;
    $('#chart-empty').hidden = hasData;
    $('#chart-tooltip').hidden = true;
    tooltipData = data;
    if (hasData) $('#chart').innerHTML = chartSvg(data, daily);
    else $('#chart').innerHTML = '';
    const best = currentSummary.bestDay;
    $('#insight').innerHTML = `<span class="insight-icon">${icon(daily ? 'info' : 'sparkle')}</span><p>${!hasData ? '나의 속도로 시작해 보세요. <strong>작은 기록이 쌓이면 흐름이 보여요.</strong>' : daily ? '<strong>공부 시간은 시간대별 배분 예시</strong>이며, 몰입도 선은 해당 날짜의 평균이에요. 실제 시간대별 측정값은 아니에요.' : best ? `이번 주에는 <strong>${weekday(best.date)}요일</strong>에 가장 깊이 몰입했어요. <span class="accent">몰입도 ${score(best.focus)}점</span>의 좋은 흐름을 이어가 볼까요?` : '공부 시간을 꾸준히 기록하고 있어요. 몰입도도 함께 남겨 보세요.'}</p>`;
    const hourlyNote = $('.hourly-note');
    if (hourlyNote) hourlyNote.textContent = '시간대별 배분 예시 · 실제 측정값 아님';
    if (focusedDay) $('#day-tabs').querySelector(`[data-day="${focusedDay}"]`)?.focus({ preventScroll: true });
  }

  function chartSvg(data, daily) {
    const width = Math.max(daily ? 850 : 620, Math.round($('#chart').clientWidth || 1080));
    const height = 325, left = 40, right = width - 42, bottom = 273;
    const top = 30;
    const plotHeight = bottom - top;
    const maxTime = daily ? 60 : Math.max(720, Math.ceil(Math.max(...data.map((d) => d.total)) / 120) * 120);
    const step = (right - left) / data.length;
    const barWidth = daily ? Math.min(35, step * 0.61) : Math.min(104, step * 0.55);
    const x = (i) => left + step * (i + 0.5);
    const y = (focus) => bottom - focus / 10 * plotHeight;
    let svg = `<svg class="study-chart ${daily ? 'daily-chart' : ''}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="plot-title plot-description"><title id="plot-title">${daily ? '시간대별 예시 학습 차트' : '요일별 공부 시간과 몰입도'}</title><desc id="plot-description">${data.map((d) => `${d.label}${daily ? '시' : '요일'}: 현장강의 ${d.lecture}분, 자습 ${d.self}분, 몰입도 ${score(d.focus)}`).join('. ')}</desc><defs><linearGradient id="bar-self" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eceef2"/><stop offset="1" stop-color="#f0f2f5"/></linearGradient><linearGradient id="bar-lecture" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a4a8af"/><stop offset="1" stop-color="#969ca5"/></linearGradient></defs>`;
    for (let tick = 0; tick <= 5; tick++) {
      const yy = bottom - tick / 5 * plotHeight;
      svg += `<line x1="${left}" y1="${yy}" x2="${right}" y2="${yy}" stroke="#e9ecf0" stroke-width="1"/><text x="${left - 16}" y="${yy + 4}" fill="#a3a9b3" font-size="11" text-anchor="end">${tick * 2}</text><text x="${right + 16}" y="${yy + 4}" fill="#a3a9b3" font-size="11">${Math.round(maxTime * tick / 5)}</text>`;
    }
    data.forEach((d, i) => {
      const totalHeight = d.total / maxTime * plotHeight;
      const selfHeight = d.self / maxTime * plotHeight;
      const lectureHeight = d.lecture / maxTime * plotHeight;
      const bx = x(i) - barWidth / 2;
      svg += `<clipPath id="bar-${i}"><rect x="${bx}" y="${bottom - totalHeight}" width="${barWidth}" height="${Math.max(0, totalHeight)}" rx="${daily ? 7 : 10}"/></clipPath><g clip-path="url(#bar-${i})"><rect x="${bx}" y="${bottom - selfHeight}" width="${barWidth}" height="${selfHeight}" fill="url(#bar-self)"/><rect x="${bx}" y="${bottom - totalHeight}" width="${barWidth}" height="${lectureHeight}" fill="url(#bar-lecture)"/></g>`;
      if (!daily && lectureHeight >= 33) svg += `<text x="${x(i)}" y="${bottom - totalHeight + lectureHeight / 2 - 3}" fill="white" font-size="10" font-weight="500" text-anchor="middle">현장강의<tspan x="${x(i)}" dy="16" font-size="12" font-weight="650">${D.formatMinutes(d.lecture, true)}</tspan></text>`;
      if (!daily && selfHeight >= 36) svg += `<text x="${x(i)}" y="${bottom - selfHeight / 2 - 3}" fill="#969daa" font-size="10" text-anchor="middle">자습<tspan x="${x(i)}" dy="18" fill="#596271" font-size="13" font-weight="650">${D.formatMinutes(d.self, true)}</tspan></text>`;
      svg += `<text x="${x(i)}" y="${bottom + 24}" fill="#687281" font-size="${daily ? 11 : 12}" font-weight="${daily ? 400 : 600}" text-anchor="middle">${d.label}</text>`;
      if (!daily) svg += `<text x="${x(i)}" y="${bottom + 42}" fill="#b2b8c1" font-size="10" text-anchor="middle">${shortDate(d.date)}</text>`;
    });
    const line = data.map((d, i) => d.focus === null ? '' : `${i === 0 || data[i - 1].focus === null ? 'M' : 'L'}${x(i)},${y(d.focus)}`).join(' ');
    svg += `<path d="${line}" fill="none" stroke="#f25049" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
    data.forEach((d, i) => {
      if (d.focus === null) return;
      const label = daily ? `${d.label}시 (배분 예시)` : `${shortDate(d.date)} ${d.label}요일`;
      svg += `<g class="chart-point" tabindex="0" role="button" data-point="${i}" aria-label="${label}, 현장강의 ${d.lecture}분, 자습 ${d.self}분, 몰입도 ${score(d.focus)}점"><circle class="point-halo" cx="${x(i)}" cy="${y(d.focus)}" r="13" fill="#ffe1de"/><circle cx="${x(i)}" cy="${y(d.focus)}" r="${daily ? 4.5 : 5.5}" fill="white" stroke="#f25049" stroke-width="2.5"/><text x="${x(i)}" y="${y(d.focus) - 15}" fill="#ee5952" font-size="${daily ? 13 : 16}" font-weight="700" text-anchor="middle">${score(d.focus)}</text><circle cx="${x(i)}" cy="${y(d.focus)}" r="16" fill="transparent"/></g>`;
    });
    return svg + '</svg>';
  }

  function selectPeriod(id) {
    state.periodId = id;
    render();
  }

  function changeMonth(delta) {
    const date = new Date(state.year, state.month + delta, 1, 12);
    if (date.getFullYear() < 1900 || date.getFullYear() > 2100) return;
    state.year = date.getFullYear();
    state.month = date.getMonth();
    state.periodId = '';
    render();
  }

  function setNavigation(open) {
    const restoreFocus = !open && !$('#navigation').hidden && $('#navigation').contains(document.activeElement);
    $('#navigation').hidden = !open;
    $('#nav-backdrop').hidden = !open;
    $('#menu-button').setAttribute('aria-expanded', open);
    $('#menu-button').setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    if (open) $('#dashboard-nav').focus();
    else if (restoreFocus) $('#menu-button').focus();
  }

  function openRecord() {
    setNavigation(false);
    const form = $('#record-form');
    form.reset();
    form.elements.date.value = activePage === 'comparison' ? window.FocusComparison.selectedDate() : state.view === 'daily' ? state.day : currentPeriod.start;
    form.elements.date.min = '1900-01-01';
    form.elements.date.max = '2100-12-31';
    $('#focus-output').innerHTML = '7<span> / 10</span>';
    $('#form-error').hidden = true;
    $('.local-note').innerHTML = `${icon('lock')}${storageAvailable ? '기록은 이 브라우저에 저장됩니다.' : '브라우저 저장소를 사용할 수 있는지 확인해 주세요.'}`;
    $('#record-dialog').showModal();
  }

  function renderHistory() {
    const items = [...userRecords].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    $('#history-list').innerHTML = items.length ? items.map((r) => `<div class="history-item"><span class="history-type">${icon(r.type === 'lecture' ? 'school' : 'book')}</span><div class="history-details"><strong>${r.type === 'lecture' ? '현장강의' : '자습'} · ${D.formatMinutes(r.minutes)}</strong><small>${r.date} · 몰입도 ${score(r.focus)}${r.note ? ` · ${escapeHtml(r.note)}` : ''}</small></div><button class="icon-button delete-record" data-delete="${escapeHtml(r.id)}" aria-label="${r.date} ${r.type === 'lecture' ? '현장강의' : '자습'} 기록 삭제">${icon('trash')}</button></div>`).join('') : '<p class="history-empty">아직 직접 추가한 기록이 없어요.<br>학습 기록 추가 버튼으로 첫 공부를 남겨 보세요.</p>';
  }

  function showTooltip(target) {
    const d = tooltipData[Number(target.dataset.point)];
    if (!d) return;
    $('#chart-tooltip').innerHTML = `<strong>${state.view === 'daily' ? `${d.label}:00 · 시간 배분 예시` : `${shortDate(d.date)} ${weekday(d.date)}요일`}</strong><div>현장강의<b>${D.formatMinutes(d.lecture)}</b></div><div>자습<b>${D.formatMinutes(d.self)}</b></div><div>${state.view === 'daily' ? '일평균 몰입도' : '몰입도'}<b>${score(d.focus)} / 10</b></div>`;
    $('#chart-tooltip').hidden = false;
  }

  $('#week-tabs').addEventListener('click', (e) => { const button = e.target.closest('[data-period]'); if (button) selectPeriod(button.dataset.period); });
  $('#overview-grid').addEventListener('click', (e) => { const button = e.target.closest('[data-period]'); if (button) selectPeriod(button.dataset.period); });
  $('#prev-month').addEventListener('click', () => changeMonth(-1));
  $('#next-month').addEventListener('click', () => changeMonth(1));
  $('#current-month').addEventListener('click', () => {
    const today = new Date();
    state.year = today.getFullYear(); state.month = today.getMonth();
    state.periodId = D.getPeriods(state.year, state.month).find((p) => D.dateKey(today) >= p.start && D.dateKey(today) <= p.end).id;
    state.day = D.dateKey(today);
    render();
  });
  $$('[data-view]').forEach((button) => button.addEventListener('click', () => { state.view = button.dataset.view; renderChart(); }));
  $('#day-tabs').addEventListener('click', (e) => { const button = e.target.closest('[data-day]'); if (button) { state.day = button.dataset.day; renderChart(); } });
  ['add-button', 'empty-add'].forEach((id) => $(`#${id}`).addEventListener('click', openRecord));
  $('#menu-button').addEventListener('click', () => setNavigation($('#navigation').hidden));
  $('#nav-backdrop').addEventListener('click', () => setNavigation(false));
  function selectPage(page) {
    activePage = page;
    const comparison = page === 'comparison';
    $('#personal-panel').hidden = comparison;
    $('#comparison-panel').hidden = !comparison;
    $$('[data-page]').forEach((button) => {
      const selected = button.dataset.page === page;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', selected);
      button.tabIndex = selected ? 0 : -1;
    });
    $('#dashboard-nav').classList.toggle('active', !comparison);
    $('#comparison-nav').classList.toggle('active', comparison);
    $('#dashboard-nav .nav-active-dot').hidden = comparison;
    $('.page-description').textContent = comparison ? '나의 몰입을 함께 비교하고, 꾸준히 성장하는 흐름을 찾아보세요.' : '쌓여가는 공부 시간, 나만의 몰입의 흐름을 확인해 보세요.';
    if (comparison) window.FocusComparison.refresh();
    else renderChart();
  }
  $$('[data-page]').forEach((button) => button.addEventListener('click', () => selectPage(button.dataset.page)));
  $('.page-tabs').addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const page = event.key === 'Home' ? 'personal' : event.key === 'End' ? 'comparison' : activePage === 'personal' ? 'comparison' : 'personal';
    selectPage(page); $(`[data-page="${page}"]`).focus();
  });
  $('#dashboard-nav').addEventListener('click', () => { setNavigation(false); selectPage('personal'); $('#personal-tab').focus(); });
  $('#comparison-nav').addEventListener('click', () => { setNavigation(false); selectPage('comparison'); $('#comparison-tab').focus(); });
  $('#history-nav').addEventListener('click', () => { setNavigation(false); renderHistory(); $('#history-dialog').showModal(); });
  ['guide-button', 'help-nav'].forEach((id) => $(`#${id}`).addEventListener('click', () => { setNavigation(false); $('#guide-dialog').showModal(); }));
  $$('[data-close]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
  $$('dialog').forEach((dialog) => dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
  }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setNavigation(false); $('#chart-tooltip').hidden = true; }
  });
  $('#record-form').elements.focus.addEventListener('input', (e) => { $('#focus-output').innerHTML = `${e.target.value}<span> / 10</span>`; });
  $('#record-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = e.currentTarget.elements;
    const minutes = Number(fields.hours.value) * 60 + Number(fields.minutes.value);
    const date = fields.date.value;
    const total = D.aggregateDay(records(), date).total + minutes;
    if (minutes <= 0 || total > 1440) {
      $('#form-error').textContent = minutes <= 0 ? '공부 시간을 1분 이상 입력해 주세요.' : '하루의 총 공부 시간은 24시간을 넘을 수 없어요. 시간을 확인해 주세요.';
      $('#form-error').hidden = false;
      return;
    }
    const record = { id: `record-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date, type: fields.type.value, minutes, focus: Number(fields.focus.value), note: fields.note.value.trim(), source: 'user' };
    if (!saveRecords([...userRecords, record])) return;
    const day = parseDate(date);
    state.year = day.getFullYear(); state.month = day.getMonth(); state.day = date;
    state.periodId = D.getPeriods(state.year, state.month).find((p) => date >= p.start && date <= p.end).id;
    $('#record-dialog').close();
    if (activePage === 'comparison') window.FocusComparison.syncToDate(date);
    render();
    toast('오늘의 공부를 저장했어요. 한 걸음 더 나아갔네요!');
  });
  $('#history-list').addEventListener('click', (e) => {
    const button = e.target.closest('[data-delete]');
    if (!button) return;
    if (!saveRecords(userRecords.filter((record) => record.id !== button.dataset.delete))) {
      toast('기록을 삭제하지 못했어요. 브라우저 저장소를 확인해 주세요.');
      return;
    }
    renderHistory(); render(); toast('학습 기록을 삭제했어요.');
  });
  $('#export-button').addEventListener('click', () => {
    if (activePage === 'comparison') {
      toast(window.FocusComparison.exportCsv() ? '선택한 기간의 비교 리포트를 내보냈어요.' : '내보낼 비교 데이터가 없어요.');
      return;
    }
    if (!currentSummary.total) { toast('내보낼 학습 기록이 없어요. 먼저 기록을 추가해 주세요.'); return; }
    const rows = [['날짜', '요일', '현장강의(분)', '자습(분)', '총 공부 시간(분)', '평균 몰입도(0-10)'], ...currentSummary.days.map((day) => [day.date, weekday(day.date), day.lecture, day.self, day.total, day.focus === null ? '' : day.focus.toFixed(2)])];
    const csv = '\uFEFF' + rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `몰입도_학습리포트_${currentPeriod.start}.csv`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('선택한 주의 학습 리포트를 내보냈어요.');
  });
  $('#chart').addEventListener('pointerover', (e) => { const point = e.target.closest('[data-point]'); if (point) showTooltip(point); });
  $('#chart').addEventListener('focusin', (e) => { const point = e.target.closest('[data-point]'); if (point) showTooltip(point); });
  $('#chart').addEventListener('click', (e) => { const point = e.target.closest('[data-point]'); if (point) showTooltip(point); });
  $('#chart').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { const point = e.target.closest('[data-point]'); if (point) { e.preventDefault(); showTooltip(point); } } });
  $('#chart').addEventListener('pointerleave', () => { $('#chart-tooltip').hidden = true; });
  $('#chart').addEventListener('focusout', () => { $('#chart-tooltip').hidden = true; });
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderChart, 100);
  });
  window.FocusComparison.init({ getRecords: records });
  render();
})();
