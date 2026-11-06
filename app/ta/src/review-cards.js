(() => {
  'use strict';

  const STORAGE_KEY = 'ta-review-cards-v1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
  const localDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const freshState = () => ({ date: localDate(), currentId: '', flipped: false, reviewed: [] });
  let state = freshState();
  let notice = '';
  let lastMembership = '';

  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const value = JSON.parse(raw);
      if (!value || typeof value.date !== 'string' || !Array.isArray(value.reviewed)) {
        throw new Error('Invalid saved review state');
      }
      if (value.date === localDate()) {
        state = {
          date: value.date,
          currentId: typeof value.currentId === 'string' ? value.currentId : '',
          flipped: value.flipped === true,
          reviewed: [...new Set(value.reviewed.filter(id => typeof id === 'string'))],
        };
      }
    }
  } catch {
    notice = '복습 기록을 불러오지 못했어요. 현재 화면에서 카드를 이어서 볼 수 있어요.';
  }

  function persist() {
    try {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      notice = '';
      return true;
    } catch {
      notice = '현재 화면에는 반영했지만 복습 기록을 저장하지 못했어요. 새로고침하면 사라질 수 있어요.';
      return false;
    }
  }

  function prepare(items) {
    const ids = new Set();
    const cards = (Array.isArray(items) ? items : []).filter(item => {
      if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)) return false;
      ids.add(item.id);
      return true;
    });
    if (state.date !== localDate()) state = freshState();
    state.reviewed = state.reviewed.filter(id => ids.has(id));
    const membership = JSON.stringify(cards.map(item => item.id));
    const pending = cards.find(item => !state.reviewed.includes(item.id));
    if (!ids.has(state.currentId) || (membership !== lastMembership && pending && state.reviewed.includes(state.currentId))) {
      state.currentId = (cards.find(item => !state.reviewed.includes(item.id)) || cards[0])?.id || '';
      state.flipped = false;
    }
    lastMembership = membership;
    return cards;
  }

  function source(item) {
    return [item.subject, item.book, item.round != null ? `${item.round}회` : '', item.number != null ? `${item.number}번` : '']
      .filter(Boolean).map(esc).join(' · ');
  }

  function tags(item) {
    const values = Array.isArray(item.tags) ? item.tags.filter(tag => typeof tag === 'string').slice(0, 5) : [];
    return values.length ? `<div class="review-card-tags">${values.map(tag => `<span>#${esc(tag.replace(/^#+/, ''))}</span>`).join('')}</div>` : '';
  }

  const bookmarkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z"/></svg>';
  const checkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L20 5"/></svg>';
  const leftIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>';
  const rightIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg>';
  const flipIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 0 1 13-5l3 4m0-5v5h-5M20 14a8 8 0 0 1-13 5l-3-4m0 5v-5h5"/></svg>';

  function render(items) {
    const cards = prepare(items);
    const completed = state.reviewed.length;
    const remaining = cards.length - completed;
    const heading = `<div class="review-cards-heading"><div><h2>${bookmarkIcon}북마크 복습</h2><p>저장해 둔 질문을 한 장씩 꺼내 보세요.</p></div><span class="review-cards-count">${cards.length ? `오늘 ${completed} / ${cards.length}개 완료` : '북마크한 질문이 자동으로 모여요'}</span></div>`;
    const storageNotice = notice ? `<p class="review-cards-notice" role="status">${esc(notice)}</p>` : '';

    if (!cards.length) {
      return `<section class="review-cards" aria-label="북마크 복습 카드">${heading}<div class="review-cards-empty"><span class="review-cards-empty-icon">${bookmarkIcon}</span><div><strong>다시 보고 싶은 답변을 북마크해 보세요.</strong><p>북마크하면 이곳에 복습 카드가 자동으로 나타나요.</p></div><button class="outline" data-action="nav" data-id="search">문항 검색</button></div>${storageNotice}</section>`;
    }

    if (!remaining) {
      return `<section class="review-cards" aria-label="북마크 복습 카드">${heading}<div class="review-cards-complete" aria-live="polite"><span class="review-cards-complete-icon">${checkIcon}</span><div><h3>오늘의 북마크 복습을 마쳤어요.</h3><p>${cards.length}개의 질문을 다시 살펴봤어요. 언제든 한 번 더 복습할 수 있어요.</p></div><button class="outline" data-action="review-restart">다시 복습</button></div>${storageNotice}</section>`;
    }

    const index = cards.findIndex(item => item.id === state.currentId);
    const item = cards[index];
    const isDone = state.reviewed.includes(item.id);
    const headingText = typeof item.questionSummary === 'string' ? item.questionSummary : '';
    const answerText = typeof item.answerSummary === 'string' ? item.answerSummary : '';
    return `<section class="review-cards" aria-label="북마크 복습 카드">${heading}<article class="review-flashcard ${state.flipped ? 'is-flipped' : ''}"><div class="review-card-top"><span>${source(item)}</span><span class="review-card-position">${index + 1} / ${cards.length}</span></div><div class="review-card-body" id="review-card-body" aria-live="polite" aria-atomic="true"><span class="review-card-side">${state.flipped ? '답변 요약' : '이 질문, 다시 생각해 볼까요?'}</span><h3>${esc(headingText)}</h3>${tags(item)}${state.flipped ? `<p class="review-card-answer">${esc(answerText)}</p>` : '<p class="review-card-hint">답변을 보기 전에, 기억나는 내용을 먼저 떠올려 보세요.</p>'}</div><div class="review-card-actions"><button class="review-card-flip" data-action="review-flip" data-id="${esc(item.id)}" aria-controls="review-card-body" aria-expanded="${state.flipped}">${flipIcon}${state.flipped ? '질문 다시 보기' : '답변 보기'}</button>${state.flipped ? `<button class="review-card-done" data-action="review-done" data-id="${esc(item.id)}" ${isDone ? 'disabled' : ''}>${checkIcon}${isDone ? '오늘 복습 완료' : '오늘 복습 완료'}</button>` : ''}</div><div class="review-card-footer"><button class="review-card-original" data-action="answer" data-id="${esc(item.id)}">질문·답변 원문 보기 <span aria-hidden="true">↗</span></button><div class="review-card-paging"><span>${remaining}개 남음</span><button class="review-card-arrow" data-action="review-prev" data-id="${esc(item.id)}" aria-label="이전 복습 카드" ${cards.length < 2 ? 'disabled' : ''}>${leftIcon}</button><button class="review-card-arrow" data-action="review-next" data-id="${esc(item.id)}" aria-label="다음 복습 카드" ${cards.length < 2 ? 'disabled' : ''}>${rightIcon}</button></div></div></article>${storageNotice}</section>`;
  }

  function handle(action, id, items) {
    if (!['review-flip', 'review-next', 'review-prev', 'review-done', 'review-restart'].includes(action)) return false;
    const cards = prepare(items);
    if (!cards.length) return true;
    const currentIndex = cards.findIndex(item => item.id === state.currentId);
    if (id && id !== state.currentId) return true;

    if (action === 'review-restart') {
      state.reviewed = [];
      state.currentId = cards[0].id;
      state.flipped = false;
    } else if (action === 'review-flip') {
      state.flipped = !state.flipped;
    } else if (action === 'review-next' || action === 'review-prev') {
      const offset = action === 'review-next' ? 1 : -1;
      state.currentId = cards[(currentIndex + offset + cards.length) % cards.length].id;
      state.flipped = false;
    } else if (action === 'review-done') {
      // The answer must be visible before a card can be marked reviewed.
      if (!state.flipped) return true;
      if (!state.reviewed.includes(state.currentId)) state.reviewed.push(state.currentId);
      for (let offset = 1; offset <= cards.length; offset++) {
        const candidate = cards[(currentIndex + offset) % cards.length];
        if (!state.reviewed.includes(candidate.id)) {
          state.currentId = candidate.id;
          break;
        }
      }
      state.flipped = false;
    }
    persist();
    return true;
  }

  globalThis.TAReviewCards = Object.freeze({ render, handle });
})();
