(() => {
  'use strict';
  const D = window.FocusComparisonData;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const dateObject = (key) => new Date(`${key}T12:00:00`);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = (key) => dayNames[dateObject(key).getDay()];
  const shortDate = (key) => key.slice(5).replace('-', '.');
  const displayScore = (value, digits = 2) => value === null ? '—' : value.toFixed(digits);
  const series = [
    { key: 'personal', label: '나의 평균', color: '#4f6df5', description: '내가 쌓아온 몰입' },
    { key: 'top50', label: '상위 50% 평균', color: '#6b6c75', description: '몰입도 상위 50% 그룹' },
    { key: 'top20', label: '상위 20% 평균', color: '#c8cbd2', description: '몰입도 상위 20% 그룹' },
  ];
  const state = { year: 2026, month: 9, periodId: '2026-09-28', mode: 'weekly', page: 'summary', visible: { personal: true, top50: true, top20: true } };
  let getRecords = null;
  let periods = [];
  let period;
  let summary;

  function summaryDates(records) {
    if (state.mode === 'weekly') {
      const extras = records.filter((r) => r.date >= period.start && r.date <= period.end).map((r) => r.date);
      return [...new Set([...period.dates, ...extras])].sort();
    }
    const dates = [];
    const lastDay = new Date(state.year, state.month + 1, 0, 12).getDate();
    const recorded = new Set(records.map((r) => r.date));
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(state.year, state.month, day, 12);
      const key = window.FocusData.dateKey(date);
      if ((date.getDay() !== 0 && date.getDay() !== 6) || recorded.has(key)) dates.push(key);
    }
    return dates;
  }

  function refresh() {
    if (!getRecords) return;
    const active = document.activeElement;
    const focusPeriod = active?.dataset.comparePeriod;
    const focusSeries = active?.dataset.compareSeries;
    const records = getRecords();
    periods = D.getPeriods(state.year, state.month);
    period = periods.find((p) => p.id === state.periodId) || periods[0];
    state.periodId = period.id;
    summary = D.getSummary(records, summaryDates(records));
    const monthly = state.mode === 'monthly';
    const detail = !monthly && state.page === 'detail';
    const hasData = summary.personalCount > 0 || summary.cohortCount > 0;
    $('#compare-year').textContent = `${state.year}년`;
    $('#compare-month').innerHTML = `${state.month + 1}<span>월</span>`;
    $('#compare-weeks').hidden = monthly;
    $('#compare-month-caption').hidden = !monthly;
    $('#compare-weeks').innerHTML = periods.map((p) => `<button class="week-tab${p.id === period.id ? ' active' : ''}" data-compare-period="${p.id}" aria-pressed="${p.id === period.id}"><strong>${p.label}</strong><small>${shortDate(p.dates[0])} – ${shortDate(p.dates.at(-1))}</small></button>`).join('');
    $('#comparison-heading').textContent = monthly ? '한 달의 몰입, 함께 살펴봐요' : '나와 함께, 몰입을 비교해요';
    $('#comparison-range').textContent = monthly ? `${state.year}년 ${state.month + 1}월 · 일별 평균 몰입도` : `${period.label} · ${shortDate(period.dates[0])} — ${shortDate(period.dates.at(-1))}${summary.days.length > 5 ? ' · 기록이 있는 주말 포함' : ''}`;
    $$('[data-compare-mode]').forEach((button) => {
      const selected = button.dataset.compareMode === state.mode;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', selected);
    });
    $('#comparison-card-title').textContent = monthly ? '당월 몰입도 추이' : detail ? '교시별 몰입도 상세' : '주간 몰입도 비교';
    $('#compare-mode-link').innerHTML = `${monthly ? '주간 몰입도 보기' : '당월 추이 보기'} <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg>`;
    $('#comparison-gauges').hidden = detail || !hasData;
    $('#comparison-legend').hidden = detail || !hasData;
    $('#comparison-chart-wrap').hidden = detail || !hasData;
    $('#comparison-detail').hidden = !detail || !hasData;
    $('#comparison-empty').hidden = hasData;
    $('#comparison-pages').hidden = monthly || !hasData;
    $('#comparison-tooltip').hidden = true;
    $('#comparison-chart-caption').textContent = monthly ? '일별 평균 · 좌우로 스크롤해 전체 날짜를 확인하세요' : '요일별 평균';
    $$('[data-compare-page]').forEach((button) => {
      const selected = button.dataset.comparePage === state.page;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', selected);
    });
    $('#compare-page-prev').disabled = state.page === 'summary';
    $('#compare-page-next').disabled = state.page === 'detail';
    if (hasData) {
      if (detail) renderDetail(records);
      else { renderGauges(); renderLegend(); renderChart(); }
    } else $('#comparison-chart').innerHTML = '';
    renderInsight();
    if (focusPeriod) $('#compare-weeks').querySelector(`[data-compare-period="${focusPeriod}"]`)?.focus({ preventScroll: true });
    if (focusSeries) $('#comparison-legend').querySelector(`[data-compare-series="${focusSeries}"]`)?.focus({ preventScroll: true });
  }

  function renderGauges() {
    const radius = 66;
    const circumference = 2 * Math.PI * radius;
    $('#comparison-gauges').innerHTML = series.map((s) => {
      const value = summary[s.key];
      const dash = value === null ? 0 : Math.max(0, Math.min(10, value)) / 10 * circumference;
      return `<div class="comparison-gauge" style="--series-color:${s.color}"><div class="gauge-ring"><svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="${radius}" fill="none" stroke="#eff0f4" stroke-width="5"/><circle cx="80" cy="80" r="${radius}" fill="none" stroke="${s.color}" stroke-width="5" stroke-linecap="${dash ? 'round' : 'butt'}" stroke-dasharray="${dash} ${circumference}" transform="rotate(-90 80 80)"/></svg><div class="gauge-center"><strong>${displayScore(value)}</strong><small>/ 10</small></div></div><strong class="gauge-label">${s.label}</strong><span class="gauge-description">${value === null ? '데이터 없음' : s.description}</span></div>`;
    }).join('');
  }

  function renderLegend() {
    $('#comparison-legend').innerHTML = series.map((s) => `<button class="comparison-legend-button${state.visible[s.key] ? '' : ' is-hidden'}" data-compare-series="${s.key}" aria-pressed="${state.visible[s.key]}" aria-label="${s.label} ${state.visible[s.key] ? '숨기기' : '표시하기'}"><i class="comparison-dot" style="background:${s.color}"></i>${s.label}${s.key !== 'personal' ? '<small>예시</small>' : ''}</button>`).join('');
  }

  function renderChart() {
    const monthly = state.mode === 'monthly';
    const width = Math.max(monthly ? 1120 : 620, Math.round($('#comparison-chart').clientWidth || 1000));
    const height = monthly ? 350 : 295, left = 40, right = width - 25, top = 25, bottom = height - 55;
    const step = (right - left) / summary.days.length;
    const x = (index) => left + step * (index + 0.5);
    const y = (value) => bottom - value / 10 * (bottom - top);
    const shown = series.filter((s) => state.visible[s.key]);
    let svg = `<svg class="comparison-svg${monthly ? ' comparison-monthly-svg' : ''}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="comparison-plot-title comparison-plot-description"><title id="comparison-plot-title">${monthly ? '당월 일별' : '주간 요일별'} 몰입도 비교</title><desc id="comparison-plot-description">파란색은 나의 평균, 진회색은 상위 50%, 연회색은 상위 20% 평균입니다. 비교 그룹은 예시 데이터입니다. ${summary.days.map((day) => `${shortDate(day.date)}: 나의 평균 ${displayScore(day.personal)}, 상위50% ${displayScore(day.top50)}, 상위20% ${displayScore(day.top20)}`).join('. ')}</desc>`;
    for (let tick = 0; tick <= 10; tick += 2) {
      svg += `<line x1="${left}" y1="${y(tick)}" x2="${right}" y2="${y(tick)}" stroke="#e9ecf1" stroke-width="1"/><text x="${left - 15}" y="${y(tick) + 4}" text-anchor="end" fill="#9ba3b1" font-size="11">${tick}</text>`;
    }
    if (monthly) {
      // Gaps stay gaps: missing measurements never become zero.
      [...shown].reverse().forEach((s) => {
        const line = summary.days.map((day, i) => day[s.key] === null ? '' : `${i === 0 || summary.days[i - 1][s.key] === null ? 'M' : 'L'}${x(i)},${y(day[s.key])}`).join(' ');
        svg += `<path d="${line}" fill="none" stroke="${s.color}" stroke-width="${s.key === 'personal' ? 2.6 : 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
        summary.days.forEach((day, i) => {
          if (day[s.key] === null) return;
          svg += `<circle cx="${x(i)}" cy="${y(day[s.key])}" r="${s.key === 'personal' ? 4 : 3}" fill="${s.key === 'personal' ? '#fff' : s.color}" stroke="${s.color}" stroke-width="2"/>`;
        });
      });
    } else {
      const barWidth = Math.min(26, (step - 24) / shown.length - 5);
      const groupWidth = shown.length * (barWidth + 5) - 5;
      summary.days.forEach((day, i) => {
        shown.forEach((s, j) => {
          const value = day[s.key];
          const xx = x(i) - groupWidth / 2 + j * (barWidth + 5);
          if (value === null) {
            svg += `<text x="${xx + barWidth / 2}" y="${bottom - 8}" text-anchor="middle" fill="#bcc2cd" font-size="12">—</text>`;
            return;
          }
          svg += `<rect x="${xx}" y="${y(value)}" width="${barWidth}" height="${bottom - y(value)}" rx="3" fill="${s.color}"/><text x="${xx + barWidth / 2}" y="${y(value) - 9}" text-anchor="middle" fill="${s.key === 'top20' ? '#9298a4' : s.color}" font-size="10" font-weight="600">${value.toFixed(1)}</text>`;
        });
      });
    }
    summary.days.forEach((day, i) => {
      svg += `<text x="${x(i)}" y="${bottom + 24}" text-anchor="middle" fill="#677181" font-size="${monthly ? 10 : 12}" font-weight="${monthly ? 400 : 600}">${monthly ? shortDate(day.date) : weekday(day.date)}</text>`;
      if (!monthly) svg += `<text x="${x(i)}" y="${bottom + 43}" text-anchor="middle" fill="#a6aebb" font-size="10">${shortDate(day.date)}</text>`;
      svg += `<g class="comparison-hit" data-compare-point="${i}" role="button" tabindex="0" aria-label="${shortDate(day.date)}, 나의 평균 ${displayScore(day.personal)}, 상위 50% 평균 ${displayScore(day.top50)}, 상위 20% 평균 ${displayScore(day.top20)}"><rect class="comparison-highlight" x="${x(i) - step / 2 + 2}" y="${top - 8}" width="${step - 4}" height="${bottom - top + 13}" rx="5" fill="#4f6df5" fill-opacity="0"/></g>`;
    });
    $('#comparison-chart').innerHTML = svg + '</svg>';
  }

  function renderDetail(records) {
    const detail = D.getDetail(records, period);
    const note = detail.hasReference
      ? '원본의 09.28–10.02 교시별 예시입니다. 개인 평균은 수업을 제외하고 계산하며, 제공되지 않은 그룹별 교시 평균은 비워 두었어요.'
      : '이 주에는 교시별 측정 데이터가 없어요. 일반 학습 기록의 일평균은 주간 요약에서 확인할 수 있어요.';
    $('#comparison-detail-note').textContent = note + (detail.hasUnassignedRecords && detail.hasReference ? ' 직접 기록한 날짜는 교시 정보가 없어 해당 교시 값을 비워 두었어요.' : '');
    $('#comparison-table-head').innerHTML = `<tr><th scope="col">교시</th>${period.dates.map((date) => `<th scope="col">${weekday(date)}<small>${shortDate(date)}</small></th>`).join('')}<th scope="col" class="personal-column">개인 평균</th><th scope="col" class="cohort-column">몰입도 상위<br>50% 평균</th><th scope="col" class="cohort-column">몰입도 상위<br>20% 평균</th></tr>`;
    $('#comparison-table-body').innerHTML = detail.rows.map((row) => `<tr><th scope="row">${row.label}</th>${row.values.map((value) => `<td>${value === 'class' ? '<span class="comparison-class">수업</span>' : value === null ? '<span class="comparison-no-value">—</span>' : `<span class="comparison-cell-score">${value.toFixed(1)}</span>`}</td>`).join('')}<td class="personal-column">${displayScore(row.personal)}</td><td class="cohort-column"><span class="comparison-no-value">—</span></td><td class="cohort-column"><span class="comparison-no-value">—</span></td></tr>`).join('');
  }

  function renderInsight() {
    const base = state.mode === 'monthly' ? '이번 달' : '이번 주';
    let text;
    if (summary.personal === null) text = '<strong>나의 몰입을 먼저 기록해 보세요.</strong> 기록이 쌓이면 같은 기간의 예시 그룹과 흐름을 비교할 수 있어요.';
    else if (summary.top50 === null) text = `<strong>${base} 나의 평균은 ${displayScore(summary.personal)}점이에요.</strong> 이 기간의 비교 그룹 데이터는 아직 없어요.`;
    else {
      // Compare identical observed dates only, instead of different samples.
      const matched = summary.days.filter((day) => day.personal !== null && day.top50 !== null);
      const difference = matched.length ? matched.reduce((sum, day) => sum + day.personal - day.top50, 0) / matched.length : null;
      text = `<strong>${base} 나의 평균은 ${displayScore(summary.personal)}점이에요.</strong> `;
      if (difference !== null) text += Math.abs(difference) < 0.005 ? '같은 날짜의 상위 50% 예시 평균과 같아요.' : `같은 날짜의 상위 50% 예시 평균보다 ${Math.abs(difference).toFixed(2)}점 ${difference > 0 ? '높아요' : '낮아요'}.`;
      text += ' 수치보다 꾸준히 이어가는 나의 흐름에 집중해 보세요.';
    }
    const personalSources = new Set(summary.days.filter((day) => day.personal !== null).map((day) => day.personalSource));
    const source = personalSources.has('reference') ? '나의 평균에 원본 교시별 예시 포함' : summary.personalCount ? '나의 평균: 저장된 학습 기록' : '나의 평균: 기록 없음';
    $('#comparison-insight').innerHTML = `<p>${text}</p><small>${source} · 평균은 각 항목의 값이 있는 날짜 기준</small>`;
  }

  function showTooltip(target) {
    const day = summary.days[Number(target.dataset.comparePoint)];
    if (!day) return;
    $('#comparison-tooltip').innerHTML = `<strong>${shortDate(day.date)} ${weekday(day.date)}요일</strong>${series.filter((s) => state.visible[s.key]).map((s) => `<div><span><i style="background:${s.color}"></i>${s.label}${s.key !== 'personal' ? ' (예시)' : ''}</span><b>${displayScore(day[s.key])}</b></div>`).join('')}<small>${day.personalSource === 'reference' ? '나의 값: 원본 교시별 예시' : day.personalSource === 'record' ? '나의 값: 저장된 학습 기록' : '나의 기록 없음'}</small>`;
    $('#comparison-tooltip').hidden = false;
  }

  function setMode(mode) { state.mode = mode; state.page = 'summary'; refresh(); }
  function setPage(page) {
    state.page = page;
    refresh();
    $$('[data-compare-page]').find((button) => button.dataset.comparePage === page)?.focus();
  }
  function changeMonth(delta) {
    const date = new Date(state.year, state.month + delta, 1, 12);
    if (date.getFullYear() < 1900 || date.getFullYear() > 2100) return;
    state.year = date.getFullYear(); state.month = date.getMonth(); state.periodId = ''; state.page = 'summary'; refresh();
  }

  function init(options) {
    if (getRecords) return;
    getRecords = options.getRecords;
    $('#compare-prev-month').addEventListener('click', () => changeMonth(-1));
    $('#compare-next-month').addEventListener('click', () => changeMonth(1));
    $('#compare-weeks').addEventListener('click', (event) => { const button = event.target.closest('[data-compare-period]'); if (button) { state.periodId = button.dataset.comparePeriod; refresh(); } });
    $$('[data-compare-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.compareMode)));
    $('#compare-mode-link').addEventListener('click', () => setMode(state.mode === 'weekly' ? 'monthly' : 'weekly'));
    $$('[data-compare-page]').forEach((button) => button.addEventListener('click', () => setPage(button.dataset.comparePage)));
    $('#compare-page-prev').addEventListener('click', () => setPage('summary'));
    $('#compare-page-next').addEventListener('click', () => setPage('detail'));
    $('#compare-return-demo').addEventListener('click', () => { state.year = 2026; state.month = 9; state.periodId = '2026-09-28'; state.page = 'summary'; refresh(); });
    $('#comparison-legend').addEventListener('click', (event) => {
      const button = event.target.closest('[data-compare-series]');
      if (!button) return;
      const key = button.dataset.compareSeries;
      state.visible[key] = !state.visible[key];
      // Keep a useful chart when hiding the last visible line.
      if (!Object.values(state.visible).some(Boolean)) state.visible[key] = true;
      refresh();
    });
    ['pointerover', 'focusin', 'click'].forEach((name) => $('#comparison-chart').addEventListener(name, (event) => { const target = event.target.closest('[data-compare-point]'); if (target) showTooltip(target); }));
    $('#comparison-chart').addEventListener('keydown', (event) => {
      const target = event.target.closest('[data-compare-point]');
      if (target && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); showTooltip(target); }
      if (event.key === 'Escape') $('#comparison-tooltip').hidden = true;
    });
    ['pointerleave', 'focusout'].forEach((name) => $('#comparison-chart').addEventListener(name, () => { $('#comparison-tooltip').hidden = true; }));
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (!$('#comparison-panel').hidden) refresh(); }, 100); });
  }

  function selectedDate() {
    if (state.mode === 'monthly') return `${state.year}-${String(state.month + 1).padStart(2, '0')}-01`;
    return period?.dates[0] || '2026-09-28';
  }

  function syncToDate(date) {
    if (state.mode === 'weekly' && period && date >= period.start && date <= period.end) {
      refresh();
      return;
    }
    const target = dateObject(date);
    state.year = target.getFullYear(); state.month = target.getMonth();
    state.periodId = D.getPeriods(state.year, state.month).find((p) => date >= p.start && date <= p.end).id;
    refresh();
  }

  function exportCsv() {
    if (!summary || (!summary.personalCount && !summary.cohortCount)) return false;
    const rows = [['날짜', '요일', '나의 평균 몰입도', '상위50% 평균(예시)', '상위20% 평균(예시)', '나의 데이터 출처'], ...summary.days.map((day) => [day.date, weekday(day.date), day.personal === null ? '' : day.personal.toFixed(2), day.top50 === null ? '' : day.top50.toFixed(2), day.top20 === null ? '' : day.top20.toFixed(2), day.personalSource === 'reference' ? '원본 교시별 예시' : day.personalSource === 'record' ? '학습 기록' : '기록 없음'])];
    const csv = '\uFEFF' + rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url;
    link.download = `몰입도_비교_${state.mode === 'monthly' ? `${state.year}-${String(state.month + 1).padStart(2, '0')}` : period.start}.csv`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }
  window.FocusComparison = { init, refresh, selectedDate, syncToDate, exportCsv };
})();
