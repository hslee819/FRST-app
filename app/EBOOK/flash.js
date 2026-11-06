(function () {
  'use strict';
  const KEY = 'sdij-ebook-flash-v1';
  const statuses = { organizing: '정리 중', organized: '정리 완료', reviewing: '복습 중', done: '복습 완료' };
  const colors = { gray: '#777777', yellow: '#c9a835', green: '#5b9272', blue: '#6485bb', red: '#c77575' };
  let cfg, host, subject = '국어', tab = 'list', filter = 'all', dateFilter = 'all', search = '', review, editorId;
  let groupSelection = new Set(), groupSearch = '', groupStatus = 'all', groupSubject = 'all';
  let data = { items: {}, groups: [] };
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = selector => document.querySelector(selector);
  const say = message => cfg && cfg.toast && cfg.toast(message);
  const icon = name => cfg && cfg.icon ? cfg.icon(name) : '';
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { say('저장 공간이 부족해 변경 내용을 저장하지 못했어요.'); } }
  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (stored && stored.items && typeof stored.items === 'object' && !Array.isArray(stored.items)) {
        Object.entries(stored.items).forEach(([id, item]) => {
          if (item && item.question && item.question.id === id && Array.isArray(item.question.choices) && item.question.choices.length === 5) {
            data.items[id] = { status: 'organizing', note: '', tags: [], color: 'gray', reviewed: 0, created: Date.now(), ...item };
            if (!statuses[data.items[id].status]) data.items[id].status = 'organizing';
            if (!Array.isArray(data.items[id].tags)) data.items[id].tags = [];
          }
        });
        data.groups = Array.isArray(stored.groups) ? stored.groups.filter(g => g && typeof g.name === 'string' && Array.isArray(g.ids)) : [];
      }
    } catch (_) { /* An unavailable or invalid local store starts with an empty notebook. */ }
  }
  function snapshot(q) {
    return { id: String(q.id), bookId: String(q.bookId), subject: String(q.subject), number: Number(q.number), prompt: String(q.prompt), passage: String(q.passage || ''), choices: q.choices.map(String), answer: Number(q.answer), explanation: String(q.explanation || ''), tags: Array.isArray(q.tags) ? q.tags.map(String) : [], points: Number(q.points || 2) };
  }
  function collect(q) {
    if (!q || !q.id || !Array.isArray(q.choices) || q.choices.length !== 5) return false;
    if (data.items[q.id]) return false;
    data.items[q.id] = { question: snapshot(q), status: 'organizing', note: '', tags: (q.tags || []).slice(0, 5), color: 'gray', reviewed: 0, created: Date.now() };
    save(); if (host) render(); return true;
  }
  function remove(id) {
    if (!data.items[id]) return false;
    delete data.items[id]; data.groups.forEach(group => { group.ids = group.ids.filter(key => key !== id); }); save(); if (host) render(); return true;
  }
  function source(q) {
    const b = cfg.getBook(q.bookId);
    return `${q.subject} · ${b ? b.title + ' ' + b.issue + '회' : '예시 교재'} · ${q.number}번`;
  }
  function matchingSubject(q) { return !subject || ['all', '전체', '즐겨찾기', 'favorites'].includes(subject) || q.subject === subject; }
  function itemsForSubject() { return Object.values(data.items).filter(item => matchingSubject(item.question)); }
  function listItems() {
    const days = dateFilter === 'week' ? 7 : dateFilter === 'month' ? 30 : Infinity;
    return itemsForSubject().filter(item => (filter === 'all' || item.status === filter) && Date.now() - item.created < days * 86400000 && (!search || `${source(item.question)} ${item.question.prompt} ${item.tags.join(' ')} ${item.note}`.toLowerCase().includes(search.toLowerCase()))).sort((a, b) => b.created - a.created);
  }
  function options(obj, selected) { return Object.entries(obj).map(([value, label]) => `<option value="${escape(value)}"${selected === value ? ' selected' : ''}>${escape(label)}</option>`).join(''); }
  function empty(title, description, action) {
    return `<div class="flash-empty"><div class="flash-empty-icon">${icon('lightning')}</div><h3>${title}</h3><p>${description}</p>${action || ''}</div>`;
  }
  function row(item, isBank) {
    const q = isBank ? item : item.question;
    return `<article class="flash-item"${isBank ? '' : ` style="--flash-color:${colors[item.color] || colors.gray}"`}><div class="flash-item-main"><div class="flash-item-meta"><span>${escape(source(q))}</span>${isBank ? '<span class="flash-demo-label">예시 문항</span>' : `<span class="flash-status">${statuses[item.status]}</span>`}</div><h3>${escape(q.prompt)}</h3>${isBank ? '' : `<div class="flash-item-tags">${item.tags.map(t => `<span>#${escape(t)}</span>`).join('')}</div>${item.note ? `<p class="flash-note-preview">${escape(item.note)}</p>` : ''}`}</div><div class="flash-item-actions">${isBank ? `<button class="button ${data.items[q.id] ? 'secondary' : 'primary'}" data-flash-action="collect" data-id="${escape(q.id)}"${data.items[q.id] ? ' disabled' : ''}>${data.items[q.id] ? '추가됨' : '오답노트 만들기'}</button>` : `<button class="button secondary" data-flash-action="edit" data-id="${escape(q.id)}">오답 정리</button><button class="button secondary" data-flash-action="review-one" data-id="${escape(q.id)}">복습하기</button><button class="flash-text-button" data-flash-action="open" data-id="${escape(q.id)}">원문 보기</button>`}</div></article>`;
  }
  function render(nextSubject) {
    if (!host) return;
    if (typeof nextSubject === 'string') subject = nextSubject;
    const items = itemsForSubject(), visible = listItems();
    const pending = items.filter(item => item.status !== 'done');
    const groups = data.groups.filter(group => group.ids.some(id => data.items[id] && matchingSubject(data.items[id].question)));
    host.innerHTML = `<div class="flash-tabs" role="tablist" aria-label="오답 관리"><button role="tab" aria-selected="${tab === 'list'}" class="${tab === 'list' ? 'active' : ''}" data-flash-action="tab" data-tab="list">오답 목록 <span>${items.length}</span></button><button role="tab" aria-selected="${tab === 'add'}" class="${tab === 'add' ? 'active' : ''}" data-flash-action="tab" data-tab="add">오답 추가하기</button></div><div class="flash-toolbar"><div class="flash-filters">${tab === 'list' ? `<label>등록일<select data-flash-filter="date">${options({ all: '전체 기간', week: '최근 7일', month: '최근 30일' }, dateFilter)}</select></label><label>상태<select data-flash-filter="status">${options({ all: '전체 상태', ...statuses }, filter)}</select></label>` : '<span class="flash-bank-notice">동작 확인을 위한 예시 문항입니다.</span>'}</div><label class="flash-search">${icon('search')}<input type="search" data-flash-filter="search" value="${escape(search)}" placeholder="교재, 문항, 태그 검색" aria-label="오답 검색"></label></div>${tab === 'list' ? `<div class="flash-summary"><p>모은 오답 <strong>${items.length}</strong><span>복습할 문항 <strong>${pending.length}</strong></span></p><button class="button primary" data-flash-action="review-all"${pending.length ? '' : ' disabled'}>${icon('lightning')}플래시카드 복습</button></div><div class="flash-list">${visible.length ? visible.map(item => row(item, false)).join('') : empty(items.length ? '조건에 맞는 오답이 없어요' : '아직 모은 오답이 없어요', items.length ? '기간과 상태를 바꿔서 다시 찾아보세요.' : '학습 모드에서 오답노트 만들기를 누르면<br>이곳에 모아 복습할 수 있어요.', items.length ? '' : '<button class="button primary" data-flash-action="start">학습 시작하기</button>')}</div><section class="flash-groups"><div class="flash-section-heading"><h2>복습 그룹</h2><button class="button secondary" data-flash-action="new-group">${icon('plus')}그룹 만들기</button></div>${groups.length ? `<div class="flash-group-grid">${groups.map(g => `<article class="flash-group"><div><h3>${escape(g.name)}</h3><p>${g.ids.filter(id => data.items[id]).length}문항 · 복습 완료 ${g.ids.filter(id => data.items[id] && data.items[id].status === 'done').length}</p></div><div><button class="button secondary" data-flash-action="review-group" data-id="${escape(g.id)}">복습 시작</button><button class="flash-text-button" data-flash-action="delete-group" data-id="${escape(g.id)}">삭제</button></div></article>`).join('')}</div>` : '<p class="flash-group-empty">함께 복습할 문항을 그룹으로 묶어보세요.</p>'}</section>` : `<div class="flash-list">${bankRows()}</div>`}`;
  }
  function bankRows() {
    const questions = cfg.getQuestions().filter(q => matchingSubject(q) && (!search || `${source(q)} ${q.prompt}`.toLowerCase().includes(search.toLowerCase())));
    return questions.length ? questions.slice(0, 80).map(q => row(q, true)).join('') + (questions.length > 80 ? '<p class="flash-bank-notice">최대 80문항씩 표시합니다. 교재명이나 문항으로 검색하세요.</p>' : '') : empty('검색 결과가 없어요', '다른 검색어로 찾아보세요.');
  }
  function show(dialog) { if (!dialog.open) dialog.showModal(); }
  function closeReview() { $('#flash-review-dialog').close(); review = null; }
  function openWelcome() {
    const items = Object.values(data.items).filter(item => item.status !== 'done').sort((a, b) => a.created - b.created);
    review = { ids: items.map(item => item.question.id), index: 0, back: false, welcome: true, sample: false, understood: 0, again: 0, answers: {} };
    renderReview(); show($('#flash-review-dialog'));
  }
  function startReview(ids, sample) {
    const valid = ids.filter(id => data.items[id]);
    if (!sample && !valid.length) { say('복습할 오답을 먼저 모아주세요.'); return; }
    review = { ids: sample ? [] : valid, index: 0, back: false, welcome: false, sample: !!sample, understood: 0, again: 0, answers: {} };
    renderReview(); show($('#flash-review-dialog'));
  }
  function reviewQuestion() { return review.sample ? cfg.getQuestions()[0] : data.items[review.ids[review.index]] && data.items[review.ids[review.index]].question; }
  function reviewChoices(q) {
    const selected = review.answers[q.id];
    return `<ol class="flash-choice-list" aria-label="문항 선지">${q.choices.map((choice, i) => {
      const number = i + 1, picked = selected === number;
      const correct = review.back && q.answer === number, wrong = review.back && picked && !correct;
      const labels = [picked ? '나의 답' : '', correct ? '정답' : '', wrong ? '오답' : ''].filter(Boolean);
      return `<li><button type="button" class="flash-choice-button${picked ? ' selected' : ''}${correct ? ' correct' : ''}${wrong ? ' wrong' : ''}" data-flash-action="select-answer" data-flash-answer="${number}" aria-pressed="${picked}" aria-label="${number}번 ${escape(choice)}${labels.length ? ', ' + labels.join(' · ') : ''}"${review.back ? ' disabled' : ''}><span class="flash-choice-number">${number}</span><span class="flash-choice-text">${escape(choice)}</span>${labels.length ? `<small class="flash-choice-state">${labels.join(' · ')}</small>` : ''}</button></li>`;
    }).join('')}</ol>`;
  }
  function renderReview() {
    const body = $('#flash-review-body');
    if (!review) return;
    const total = review.sample ? 1 : review.ids.length;
    if (!total) {
      const saved = Object.keys(data.items).length;
      body.innerHTML = empty(saved ? '오늘 복습을 모두 마쳤어요' : '아직 모은 오답이 없어요', saved ? '이해한 문항도 오답 플래시에서 다시 복습할 수 있어요.' : '학습 모드에서 틀린 문항을 모으면<br>첫 화면에서 플래시카드로 복습할 수 있어요.', `<div class="flash-empty-actions"><button class="button primary" data-flash-action="start">학습 시작하기</button>${saved ? '<button class="button secondary" data-flash-action="review-saved">모든 오답 다시 복습</button>' : '<button class="button secondary" data-flash-action="sample">예시 카드 체험</button>'}</div>`);
      $('#flash-review-subtitle').textContent = '학습을 시작하기 전, 오답부터 가볍게 복습해요.';
      return;
    }
    if (review.index >= total) {
      body.innerHTML = `<div class="flash-review-complete"><div class="flash-complete-mark">${icon('check')}</div><h3>${review.sample ? '플래시카드를 체험했어요' : '복습을 마쳤어요'}</h3><p>${review.sample ? '실제 오답을 모으면 복습 결과가 저장돼요.' : `이해했어요 ${review.understood}문항 · 다시 볼래요 ${review.again}문항`}</p><button class="button primary" data-flash-action="start">학습 이어가기</button><button class="flash-text-button" data-flash-action="close-review">닫기</button></div>`;
      $('#flash-review-subtitle').textContent = review.sample ? '체험 결과는 오답 기록에 저장되지 않습니다.' : '다시 볼 문항은 다음 복습에 남겨두었어요.';
      render(); return;
    }
    const q = reviewQuestion();
    if (!q) { review.index++; renderReview(); return; }
    $('#flash-review-subtitle').textContent = review.sample ? '예시 카드 · 실제 학습 기록이 아닙니다.' : `${review.index + 1} / ${total}문항 · ${review.welcome ? '오늘의 오답 복습' : '플래시카드 복습'}`;
    body.innerHTML = `<div class="flash-review-progress"><span style="width:${review.index / total * 100}%"></span></div><div class="flash-review-card ${review.back ? 'is-back' : ''}"><div class="flash-card-top"><span>${escape(source(q))}</span><span>${review.back ? '해설' : '문제'}</span></div><h3>${escape(q.prompt)}</h3>${review.back ? `<div class="flash-answer"><span>정답</span><strong>${q.answer}</strong><p>${escape(q.choices[q.answer - 1])}</p></div><p class="flash-my-answer ${review.answers[q.id] ? review.answers[q.id] === q.answer ? 'correct' : 'wrong' : ''}">나의 답 <strong>${review.answers[q.id] ? review.answers[q.id] + '번' : '선택하지 않음'}</strong>${review.answers[q.id] ? `<span>${review.answers[q.id] === q.answer ? '정답이에요' : '해설을 확인해보세요'}</span>` : ''}</p>${reviewChoices(q)}<h4>문항 해설</h4><p class="flash-explanation">${escape(q.explanation)}</p>${!review.sample && data.items[q.id].note ? `<div class="flash-personal-note"><h4>나의 오답 메모</h4><p>${escape(data.items[q.id].note)}</p></div>` : ''}` : `${q.passage ? `<p class="flash-passage">${escape(q.passage)}</p>` : ''}${reviewChoices(q)}`}</div><div class="flash-review-controls">${review.back ? `<button class="button secondary" data-flash-action="review-again">다시 볼래요</button><button class="button primary" data-flash-action="review-understood">이해했어요${icon('check')}</button>` : '<button class="button primary full-width" data-flash-action="flip">뒤집어서 정답·해설 보기</button>'}</div>${review.back ? '<button class="flash-text-button flash-center" data-flash-action="flip">문제로 돌아가기</button>' : '<p class="flash-card-hint">선지를 선택한 뒤 카드를 뒤집어 정답과 해설을 확인하세요.</p>'}`;
  }
  function recordReview(understood) {
    if (!review || !review.back) return;
    const q = reviewQuestion();
    if (!review.sample && q && data.items[q.id]) {
      Object.assign(data.items[q.id], { status: understood ? 'done' : 'reviewing', reviewed: (data.items[q.id].reviewed || 0) + 1, lastReviewed: Date.now() }); save();
    }
    review[understood ? 'understood' : 'again']++; review.index++; review.back = false; renderReview();
  }
  function edit(id) {
    const item = data.items[id]; if (!item) return;
    editorId = id; const q = item.question;
    $('#flash-edit-source').textContent = source(q);
    $('#flash-edit-prompt').textContent = q.prompt;
    $('#flash-note').value = item.note;
    $('#flash-tags').value = item.tags.join(', ');
    $('#flash-status').innerHTML = options(statuses, item.status);
    $('#flash-color').innerHTML = options({ gray: '회색', yellow: '노랑', green: '초록', blue: '파랑', red: '빨강' }, item.color);
    $('#flash-edit-explanation').textContent = `정답 ${q.answer} · ${q.explanation}`;
    $('#flash-delete-confirm').hidden = true;
    show($('#flash-edit-dialog'));
  }
  function saveEdit(complete) {
    const item = data.items[editorId]; if (!item) return;
    Object.assign(item, { note: $('#flash-note').value.trim(), tags: $('#flash-tags').value.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean).slice(0, 8), color: $('#flash-color').value, status: complete ? 'organized' : $('#flash-status').value });
    save(); render(); $('#flash-edit-dialog').close(); say(complete ? '오답 정리를 완료했어요.' : '오답노트를 저장했어요.');
  }
  function newGroup() {
    if (!Object.keys(data.items).length) { say('오답노트를 먼저 만들어주세요.'); return; }
    groupSelection = new Set(); groupSearch = ''; groupStatus = 'all'; groupSubject = ['all', '전체', '즐겨찾기', 'favorites'].includes(subject) ? 'all' : subject;
    $('#flash-group-name').value = ''; $('#flash-group-search').value = ''; $('#flash-group-status').value = 'all';
    $('#flash-group-subject').innerHTML = options({ all: '전체 과목', ...Object.fromEntries([...new Set(Object.values(data.items).map(item => item.question.subject))].map(s => [s, s])) }, groupSubject);
    renderGroupItems(); show($('#flash-group-dialog'));
  }
  function renderGroupItems() {
    const available = Object.values(data.items).filter(item => (groupSubject === 'all' || item.question.subject === groupSubject) && (groupStatus === 'all' || item.status === groupStatus) && (!groupSearch || `${source(item.question)} ${item.question.prompt} ${item.tags.join(' ')}`.includes(groupSearch)));
    $('#flash-group-available').innerHTML = available.length ? available.map(item => `<label class="flash-select-item"><input type="checkbox" data-group-question="${escape(item.question.id)}"${groupSelection.has(item.question.id) ? ' checked' : ''}><span><small>${escape(source(item.question))}</small><strong>${escape(item.question.prompt)}</strong><em>${statuses[item.status]}</em></span></label>`).join('') : '<p class="flash-group-empty">조건에 맞는 문항이 없어요.</p>';
    $('#flash-group-selected').innerHTML = groupSelection.size ? [...groupSelection].map(id => data.items[id]).filter(Boolean).map(item => `<div class="flash-selected-item"><span><small>${escape(source(item.question))}</small><strong>${escape(item.question.prompt)}</strong></span><button type="button" class="icon-button" data-flash-action="unselect" data-id="${escape(item.question.id)}" aria-label="선택 해제">${icon('close')}</button></div>`).join('') : '<p class="flash-group-empty">함께 복습할 문항을 선택하세요.</p>';
    $('#flash-group-selected-count').textContent = groupSelection.size;
  }
  function createDialogs() {
    const container = document.createElement('div'); container.id = 'flash-dialogs';
    container.innerHTML = `<dialog id="flash-review-dialog" class="dialog flash-review-dialog" aria-labelledby="flash-review-title"><div class="dialog-header"><div><h2 id="flash-review-title">오답 플래시</h2><p id="flash-review-subtitle" class="flash-dialog-subtitle"></p></div><button class="icon-button" data-flash-action="close-review" aria-label="복습 닫기">${icon('close')}</button></div><div id="flash-review-body"></div></dialog><dialog id="flash-edit-dialog" class="dialog flash-edit-dialog" aria-labelledby="flash-edit-title"><div class="dialog-header"><div><h2 id="flash-edit-title">오답 정리</h2><p id="flash-edit-source" class="flash-dialog-subtitle"></p></div><button class="icon-button" data-flash-close aria-label="닫기">${icon('close')}</button></div><p id="flash-edit-prompt" class="flash-edit-prompt"></p><details class="flash-edit-solution"><summary>문항 해설 보기</summary><p id="flash-edit-explanation"></p></details><label class="field">나의 오답 메모<textarea id="flash-note" maxlength="3000" rows="5" placeholder="틀린 이유와 다시 기억할 내용을 정리해보세요."></textarea></label><label class="field">태그<input id="flash-tags" maxlength="150" placeholder="예: 개념 확인, 실수, 다시 풀기 (쉼표로 구분)"></label><div class="flash-fields-row"><label class="field">정리 상태<select id="flash-status"></select></label><label class="field">표시 색상<select id="flash-color"></select></label></div><div class="dialog-actions"><button class="button secondary" data-flash-action="save-note">저장하기</button><button class="button primary" data-flash-action="complete-note">정리 완료</button></div><div class="flash-delete-row"><button class="flash-text-button" data-flash-action="ask-delete-note">오답노트 삭제</button><span id="flash-delete-confirm" hidden>삭제할까요? <button class="flash-text-button" data-flash-action="delete-note">삭제</button><button class="flash-text-button" data-flash-action="cancel-delete-note">취소</button></span></div></dialog><dialog id="flash-group-dialog" class="dialog flash-group-dialog" aria-labelledby="flash-group-title"><div class="dialog-header"><h2 id="flash-group-title">복습 그룹 만들기</h2><button class="icon-button" data-flash-close aria-label="닫기">${icon('close')}</button></div><label class="field">그룹 이름<input id="flash-group-name" maxlength="30" placeholder="예: 이번 주 꼭 다시 볼 문항"></label><div class="flash-group-filters"><select id="flash-group-subject" aria-label="과목"></select><select id="flash-group-status" aria-label="정리 상태">${options({ all: '전체 상태', ...statuses }, 'all')}</select><input type="search" id="flash-group-search" placeholder="교재, 문항, 태그 검색" aria-label="그룹에 추가할 오답 검색"></div><div class="flash-group-panes"><section><h3>모아둔 오답</h3><div id="flash-group-available"></div></section><section><h3>선택한 문항 <span id="flash-group-selected-count">0</span></h3><div id="flash-group-selected"></div></section></div><div class="dialog-actions"><button class="button secondary" data-flash-close>취소</button><button class="button primary" data-flash-action="save-group">그룹 만들기</button></div></dialog>`;
    document.body.appendChild(container);
    container.addEventListener('click', onClick);
    $('#flash-review-dialog').addEventListener('close', () => { review = null; });
    $('#flash-group-subject').addEventListener('change', e => { groupSubject = e.target.value; renderGroupItems(); });
    $('#flash-group-status').addEventListener('change', e => { groupStatus = e.target.value; renderGroupItems(); });
    $('#flash-group-search').addEventListener('input', e => { groupSearch = e.target.value.trim(); renderGroupItems(); });
    $('#flash-group-available').addEventListener('change', e => {
      if (!e.target.matches('[data-group-question]')) return;
      const id = e.target.dataset.groupQuestion;
      if (e.target.checked) groupSelection.add(id); else groupSelection.delete(id);
      renderGroupItems();
    });
  }
  function onClick(event) {
    const closing = event.target.closest('[data-flash-close]');
    if (closing) { closing.closest('dialog').close(); return; }
    const button = event.target.closest('[data-flash-action]'); if (!button) return;
    const action = button.dataset.flashAction, id = button.dataset.id;
    if (action === 'tab') { tab = button.dataset.tab; search = ''; render(); }
    else if (action === 'collect') { const q = cfg.getQuestions().find(q => q.id === id); if (collect(q)) say('오답노트를 만들었어요.'); }
    else if (action === 'edit') edit(id);
    else if (action === 'open' && data.items[id]) cfg.openQuestion(data.items[id].question);
    else if (action === 'start') { if ($('#flash-review-dialog').open) closeReview(); cfg.onStartLearning && cfg.onStartLearning(); }
    else if (action === 'review-all') startReview(listItems().filter(item => item.status !== 'done').map(item => item.question.id));
    else if (action === 'review-saved') startReview(Object.keys(data.items));
    else if (action === 'review-one') startReview([id]);
    else if (action === 'sample') startReview([], true);
    else if (action === 'select-answer') {
      event.stopPropagation();
      if (!review || review.back) return;
      const answer = Number(button.dataset.flashAnswer), q = reviewQuestion();
      if (!q || !Number.isInteger(answer) || answer < 1 || answer > q.choices.length) return;
      review.answers[q.id] = answer;
      renderReview();
      $('#flash-review-body').querySelector(`[data-flash-answer="${answer}"]`)?.focus({ preventScroll: true });
    }
    else if (action === 'flip' && review) { review.back = !review.back; renderReview(); }
    else if (action === 'review-again') recordReview(false);
    else if (action === 'review-understood') recordReview(true);
    else if (action === 'close-review') closeReview();
    else if (action === 'save-note') saveEdit(false);
    else if (action === 'complete-note') saveEdit(true);
    else if (action === 'ask-delete-note') $('#flash-delete-confirm').hidden = false;
    else if (action === 'cancel-delete-note') $('#flash-delete-confirm').hidden = true;
    else if (action === 'delete-note') { remove(editorId); $('#flash-edit-dialog').close(); say('오답노트를 삭제했어요.'); }
    else if (action === 'new-group') newGroup();
    else if (action === 'unselect') { groupSelection.delete(id); renderGroupItems(); }
    else if (action === 'save-group') {
      const name = $('#flash-group-name').value.trim();
      if (!name) { $('#flash-group-name').focus(); say('그룹 이름을 입력해주세요.'); return; }
      if (!groupSelection.size) { say('함께 복습할 문항을 선택해주세요.'); return; }
      data.groups.push({ id: 'group-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), name, ids: [...groupSelection] }); save(); render(); $('#flash-group-dialog').close(); say('복습 그룹을 만들었어요.');
    } else if (action === 'review-group') { const group = data.groups.find(g => g.id === id); if (group) startReview(group.ids); }
    else if (action === 'delete-group') { data.groups = data.groups.filter(g => g.id !== id); save(); render(); say('그룹을 삭제했어요. 오답노트는 그대로 남아 있어요.'); }
  }
  function init(options) {
    cfg = options; host = typeof options.host === 'string' ? $(options.host) : options.host;
    if (!host) return;
    load(); createDialogs();
    host.addEventListener('click', onClick);
    host.addEventListener('change', event => {
      const key = event.target.dataset.flashFilter;
      if (key === 'date') dateFilter = event.target.value;
      if (key === 'status') filter = event.target.value;
      if (key) render();
    });
    host.addEventListener('input', event => {
      if (event.target.dataset.flashFilter !== 'search') return;
      search = event.target.value;
      const caret = event.target.selectionStart;
      render(); const input = host.querySelector('[data-flash-filter="search"]'); input.focus();
      try { input.setSelectionRange(caret, caret); } catch (_) { /* search inputs vary by browser */ }
    });
    render();
  }
  globalThis.EbookFlash = { init, render, collect, contains: id => !!data.items[id], remove, openWelcome };
})();
