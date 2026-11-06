import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const script = await readFile(new URL('../src/review-cards.js', import.meta.url), 'utf8');
const key = 'ta-review-cards-v1';
const items = [
  { id: 'a', subject: '국어', book: '서바이벌', round: 17, number: 1, questionSummary: '반복 오답을 줄이는 복습 방법', answerSummary: '처음 판단한 근거와 올바른 근거의 차이를 정리하세요.', tags: ['반복오답', '복습방법'] },
  { id: 'b', subject: '수학', book: '월례고사', round: 10, number: 21, questionSummary: '함수의 조건을 그래프로 이해하기', answerSummary: '그림으로 관계를 파악한 뒤 조건과 식으로 확인하세요.', tags: ['함수조건', '그래프해석'] },
];

function harness({ storage = new Map(), denied = false, date = [2026, 10, 6] } = {}) {
  let currentDate = date;
  class LocalDate extends Date {
    constructor(...args) { super(...(args.length ? args : [...currentDate, 12, 0, 0])); }
  }
  const context = vm.createContext({
    Date: LocalDate,
    localStorage: {
      getItem(name) { if (denied) throw Error('blocked'); return storage.get(name) || null; },
      setItem(name, value) { if (denied) throw Error('blocked'); storage.set(name, value); },
    },
  });
  vm.runInContext(script, context);
  return { api: context.TAReviewCards, storage, setDate(value) { currentDate = value; } };
}

test('bookmarks automatically show one front card and reveal answer only when flipped', () => {
  const { api } = harness();
  const front = api.render(items);
  assert.match(front, /반복 오답을 줄이는 복습 방법/);
  assert.match(front, /#반복오답/);
  assert.doesNotMatch(front, /처음 판단한 근거와/);
  assert.equal((front.match(/<article /g) || []).length, 1);
  assert.match(front, /aria-expanded="false"/);
  assert.equal(api.handle('review-flip', 'a', items), true);
  const back = api.render(items);
  assert.match(back, /처음 판단한 근거와/);
  assert.match(back, /aria-expanded="true"/);
  assert.match(back, /data-action="answer" data-id="a"/);
  assert.equal(api.handle('not-a-review-action', 'a', items), false);
});

test('next and previous cycle bookmarked items and reset the visible side', () => {
  const { api } = harness();
  api.render(items);
  api.handle('review-flip', 'a', items);
  api.handle('review-next', 'a', items);
  assert.match(api.render(items), /함수의 조건을 그래프로 이해하기/);
  assert.doesNotMatch(api.render(items), /그림으로 관계를 파악한 뒤/);
  api.handle('review-next', 'b', items);
  assert.match(api.render(items), /반복 오답을 줄이는 복습 방법/);
  api.handle('review-prev', 'a', items);
  assert.match(api.render(items), /함수의 조건을 그래프로 이해하기/);
});

test('completion requires seeing the answer, advances the queue, survives reload and can restart', () => {
  const { api, storage } = harness();
  api.render(items);
  api.handle('review-done', 'a', items);
  assert.match(api.render(items), /오늘 0 \/ 2개 완료/);
  api.handle('review-flip', 'a', items);
  api.handle('review-done', 'a', items);
  const progressed = api.render(items);
  assert.match(progressed, /함수의 조건을 그래프로 이해하기/);
  assert.match(progressed, /오늘 1 \/ 2개 완료/);
  const reload = harness({ storage }).api;
  assert.match(reload.render(items), /오늘 1 \/ 2개 완료/);
  reload.handle('review-flip', 'b', items);
  reload.handle('review-done', 'b', items);
  assert.match(reload.render(items), /오늘의 북마크 복습을 마쳤어요/);
  reload.handle('review-restart', '', items);
  assert.match(reload.render(items), /오늘 0 \/ 2개 완료/);
  assert.match(reload.render(items), /반복 오답을 줄이는 복습 방법/);
});

test('bookmark removal, additions, and an empty collection keep the selected card valid', () => {
  const { api } = harness();
  api.render(items);
  assert.match(api.render([items[1]]), /함수의 조건을 그래프로 이해하기/);
  api.handle('review-flip', 'b', [items[1]]);
  api.handle('review-done', 'b', [items[1]]);
  assert.match(api.render([items[1]]), /오늘의 북마크 복습을 마쳤어요/);
  const added = api.render(items);
  assert.match(added, /오늘 1 \/ 2개 완료/);
  assert.match(added, /반복 오답을 줄이는 복습 방법/);
  assert.doesNotMatch(added, /오늘의 북마크 복습을 마쳤어요/);
  assert.match(api.render([]), /북마크하면 이곳에 복습 카드가 자동으로/);
  assert.equal(api.handle('review-next', '', []), true);
  assert.match(api.render([items[0]]), /반복 오답을 줄이는 복습 방법/);
});

test('today review completion resets on a new local calendar date', () => {
  const h = harness();
  h.api.render([items[0]]);
  h.api.handle('review-flip', 'a', [items[0]]);
  h.api.handle('review-done', 'a', [items[0]]);
  assert.match(h.api.render([items[0]]), /오늘의 북마크 복습을 마쳤어요/);
  h.setDate([2026, 10, 7]);
  assert.match(h.api.render([items[0]]), /오늘 0 \/ 1개 완료/);
  assert.doesNotMatch(h.api.render([items[0]]), /오늘의 북마크 복습을 마쳤어요/);
});

test('bad or denied storage does not break review and does not claim persistence', () => {
  const malformed = new Map([[key, '{broken-json']]);
  const recovery = harness({ storage: malformed });
  assert.match(recovery.api.render(items), /복습 기록을 불러오지 못했어요/);
  recovery.api.handle('review-flip', 'a', items);
  assert.doesNotMatch(recovery.api.render(items), /복습 기록을 불러오지 못했어요/);
  const blocked = harness({ denied: true });
  blocked.api.render(items);
  blocked.api.handle('review-flip', 'a', items);
  assert.match(blocked.api.render(items), /기록을 저장하지 못했어요/);
  assert.match(blocked.api.render(items), /처음 판단한 근거와/);
});

test('card text, tags, ids, and source fields are escaped and duplicate ids are ignored', () => {
  const { api } = harness();
  const hostile = { ...items[0], id: 'x" onmouseover="alert(1)', subject: '<script>x</script>', questionSummary: '<img src=x onerror=alert(1)>', answerSummary: '<svg onload=alert(1)>', tags: ['<b>tag</b>'] };
  const card = api.render([hostile, hostile]);
  assert.match(card, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(card, /#&lt;b&gt;tag&lt;\/b&gt;/);
  assert.match(card, /x&quot; onmouseover=&quot;alert\(1\)/);
  assert.doesNotMatch(card, /<script>x<\/script>|<img src=x|<b>tag<\/b>/);
  assert.match(card, /1 \/ 1/);
});
