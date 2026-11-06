import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = async path => (await readFile(new URL(path, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const [basic, renewal, reviewModule] = await Promise.all([read('../basic.html'), read('../src/renewal-base.html'), read('../src/review-cards.js')]);

function section(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `Missing source boundary: ${start}`);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `Missing source boundary: ${end}`);
  return source.slice(from, to);
}

function inlineScript(source) {
  const match = source.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'Expected one self-contained application script');
  return match[1];
}

// These are intentional preservation boundaries: changing presentation may change
// rendering functions, but the renewal must keep the original data and behavior.
test('renewal retains the original sample data and browser storage', () => {
  assert.equal(section(renewal, '  const storageKey =', '  const subjects ='), section(basic, '  const storageKey =', '  const subjects ='));
  assert.equal(section(renewal, '  const subjects =', '  const initialSource ='), section(basic, '  const subjects =', '  const initialSource ='));
});

test('feature additions preserve original submission, upload and storage actions', () => {
  const clickStart = "  document.addEventListener('click'";
  const oldActions=section(basic,'  const actions =',clickStart).split('\n');
  for(const action of oldActions.filter(line=>/^    (?:bookmark:|rate:|'delete-question':|'select-ta':|request:|upload:|'remove-image':|'no-ta':|tickets:|'ta-schedule':|week:)/.test(line))) assert.ok(renewal.includes(action),action.slice(0,60));
  for(const prefix of ["  document.addEventListener('input'","  document.addEventListener('submit'","  $('#image-input').addEventListener('change'"]) {
    const line=basic.split('\n').find(line=>line.startsWith(prefix));assert.ok(line);assert.ok(renewal.includes(line),prefix);
  }
});

test('question form options and TA/SA unavailable states stay intact', () => {
  for (const [start, end] of [
    ['  function ta()', '  function weekDates()'],
    ['  function sa()', '  function render()'],
  ]) {
    assert.equal(section(renewal, start, end), section(basic, start, end), start);
  }
  for(const label of ['질문 내용 입력','답변 요청 TA 선택','없습니다','문제풀이 설명이 필요해요','개념 설명도 함께 부탁해요','직접입력']) assert.ok(section(renewal,'  function form()','  function attachmentHTML()').includes(label));
});

test('the original stylesheet, menu order and initial source remain unchanged', () => {
  assert.equal(renewal.match(/<style>([\s\S]*?)<\/style>/)[1],basic.match(/<style>([\s\S]*?)<\/style>/)[1]);
  assert.equal(section(renewal,'  const navItems =','  function renderNav()'),section(basic,'  const navItems =','  function renderNav()'));
  assert.equal(renewal.match(/const initialSource = .*?;/)[0],basic.match(/const initialSource = .*?;/)[0]);
  assert.match(renewal,/const state = \{page:'search',mode:'search'/);
  assert.match(renewal,/mineTab:'북마크'/);
  assert.match(renewal,/<body>/);
  assert.doesNotMatch(renewal,/class="renewal-ui"|question-context-grid|question-write-panel/);
  assert.match(renewal,/href="\.\/basic\.html"/);
});

// Minimal event/render harness. It exercises the actual inline script and does
// not emulate layout, HTML parsing, native form validation, or browser storage.
function appHarness(source, search = '', initialStorage = {}) {
  const nodes = new Map();
  const events = new Map();
  const windowEvents = new Map();
  const storage = new Map(Object.entries(initialStorage));
  const bodyClasses = new Set();
  const classes = values => ({
    add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    contains: name => values.has(name),
    toggle(name, force = !values.has(name)) { if (force) values.add(name); else values.delete(name); return force; },
  });
  const classList = classes(bodyClasses);
  function node(selector) {
    if (!nodes.has(selector)) {
      let html = '';
      const nodeEvents = new Map();
      nodes.set(selector, {
        get innerHTML() { return html; },
        set innerHTML(value) {
          html = value;
          if (selector === '#modal-body') {
            const host = value.match(/^<div id="review-cards-host">([\s\S]*)<\/div>$/);
            node('#review-cards-host').innerHTML = host?.[1] || '';
          }
        },
        textContent: '', value: '', hidden: true, offsetTop: 0,
        open: false, showCount: 0, attributes: new Map(), classList: classes(new Set()),
        setAttribute(name, value) { this.attributes.set(name, value); },
        addEventListener(name, callback) { nodeEvents.set(name, callback); },
        dispatchEvent(name, event = {}) { nodeEvents.get(name)?.(event); },
        showModal() { this.open = true; this.showCount += 1; },
        close() { const wasOpen = this.open; this.open = false; if (wasOpen) nodeEvents.get('close')?.(); },
        scrollIntoView() { this.scrolled = true; },
        focus() { this.focused = true; document.activeElement = this; },
      });
    }
    return nodes.get(selector);
  }
  const document = {
    querySelector: node,
    addEventListener: (name, callback) => events.set(name, callback),
    body: { classList },
  };
  const window = {
    innerWidth: 1200, location: { search }, scrollTo() {},
    addEventListener: (name, callback) => windowEvents.set(name, callback),
  };
  const context=vm.createContext({
    document, window, URLSearchParams,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    setTimeout: () => 1, clearTimeout() {},
  });
  if(source===renewal)vm.runInContext(reviewModule,context,{timeout:1000});
  vm.runInContext(inlineScript(source),context,{timeout:1000});
  return {
    node, storage, bodyClasses, requestedNodes: () => [...nodes.keys()],
    view: () => node('#main').innerHTML,
    click(action, data = {}) {
      events.get('click')({ target: { closest: () => ({ dataset: { action, ...data }, disabled: false }) } });
    },
    clickNode(selector) { node(selector).dispatchEvent('click'); },
    keydown(key) { events.get('keydown')?.({ key }); },
    submit() { events.get('submit')({ target: { id: 'ask-form' }, preventDefault() {} }); },
    change(id, value, dataset = {}) {
      const target = { id, value, dataset };
      events.get('change')({ target });
      return target;
    },
    resize(width) { window.innerWidth = width; windowEvents.get('resize')?.(); },
  };
}

function pickerValues(html, kind) {
  return [...html.matchAll(new RegExp(`data-action="${kind}" data-value="([^"]+)"`, 'g'))].map(match => match[1]);
}


test('normal entry retains the original search screen with only its review launch control added', () => {
  const app=appHarness(renewal),original=appHarness(basic);
  for (const kind of ['subject', 'book', 'round', 'number']) {
    assert.deepEqual(pickerValues(app.view(), kind), pickerValues(original.view(), kind), `${kind} choices remain available in full scrolling lists`);
  }
  for (const action of ['camera', 'source-help', 'pick-next', 'ranking']) {
    assert.ok(app.view().includes(`data-action="${action}"`), `${action} remains available`);
  }
  assert.doesNotMatch(app.view(),/home-workspace|id="review-cards-host"|review-flashcard/);
  assert.match(app.view(),/data-action="review-open"/);
  assert.doesNotMatch(app.view(),/picker-page|selection-pagination|data-picker-direct/);
  assert.doesNotMatch(renewal,/screen-pages\.js|screen-pagination|modal-pagination|TAScreenPages/);
  assert.match(app.view(),/<h1>문항 검색<\/h1>/);
  assert.match(app.view(),/번호를 고르세요/);
  const searchScreen = html => html.split('<footer')[0]
    .replace(/<button\b[^>]*\bdata-action="review-open"[^>]*>[\s\S]*?<\/button>/g, '')
    .replace(/\s+/g, ' ').trim();
  assert.equal(searchScreen(app.view()), searchScreen(original.view()), 'Existing headers, controls, and picker structure must remain unchanged.');
});

test('the original drawer opens, dismisses, and navigates all five menus', () => {
  const app = appHarness(renewal);
  app.click('close-modal');
  const expected=[['search','문항 검색'],['ask','문항 질문'],['ta','TA Meet'],['sa','SA Meet'],['mine','나의 질문들']];
  const menuItems=()=>[...app.node('#navigation').innerHTML.matchAll(/<button\b[^>]*\bdata-id="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)]
    .map(match=>[match[1],match[2].replace(/<[^>]+>/g,'').trim()]);
  assert.deepEqual(menuItems(),expected);
  const assertDrawer = open => {
    assert.equal(app.node('#drawer').hidden, !open);
    assert.equal(app.node('#drawer-shade').hidden, !open);
    assert.equal(app.node('#drawer-toggle').attributes.get('aria-expanded'), String(open));
    assert.equal(app.bodyClasses.has('body-scroll-lock'), open);
  };
  assert.equal(app.node('#drawer').hidden, true);
  assert.match(app.view(), /data-action="menu"/);
  app.click('menu');
  assertDrawer(true);
  app.clickNode('#drawer-shade');
  assertDrawer(false);
  app.clickNode('#drawer-toggle');
  assertDrawer(true);
  app.keydown('Escape');
  assertDrawer(false);
  app.clickNode('#drawer-toggle');
  assertDrawer(true);
  app.clickNode('#drawer-toggle');
  assertDrawer(false);
  for(const width of [390,900,1400]) {
    app.resize(width);
    for(const [id, label] of expected) {
      app.clickNode('#drawer-toggle');
      assertDrawer(true);
      app.click('nav',{id});
      assertDrawer(false);
      assert.deepEqual(menuItems(),expected);
      assert.match(app.node('#navigation').innerHTML, new RegExp(`class="nav-item active"[^>]*data-id="${id}"`));
      assert.ok(app.view().includes(`<h1>${label}</h1>`), `${label} remains reachable at width ${width}`);
    }
  }
});

test('first entry opens review in a popup without changing the underlying search screen',()=>{
  const app=appHarness(renewal);
  const initialView=app.view();
  assert.match(initialView,/<h1>문항 검색<\/h1>/);
  assert.match(initialView,/data-action="review-open"/);
  assert.match(initialView,/class="picker"/);
  assert.doesNotMatch(initialView,/id="review-cards-host"|review-flashcard|home-workspace/);
  assert.equal(app.node('#modal').open,true);
  assert.equal(app.node('#modal').showCount,1);
  assert.equal(app.node('#modal').classList.contains('review-dialog'),true);
  assert.match(app.node('#modal-body').innerHTML,/id="review-cards-host"/);
  assert.match(app.node('#review-cards-host').innerHTML,/review-flashcard/);
  assert.match(app.node('#review-cards-host').innerHTML,/review-card-tags/);
  assert.match(app.node('#review-cards-host').innerHTML,/data-id="korean17-1"/);
  app.click('review-flip',{id:'korean17-1'});
  assert.match(app.node('#review-cards-host').innerHTML,/review-card-answer/);
  app.click('review-done',{id:'korean17-1'});
  assert.match(app.node('#review-cards-host').innerHTML,/오늘의 북마크 복습을 마쳤어요/);
  assert.ok(app.storage.has('ta-review-cards-v1'));
  assert.equal(app.view(),initialView,'Review does not replace or rearrange the background search DOM.');
  app.click('close-modal');
  assert.equal(app.node('#modal').open,false);
  assert.equal(app.node('#modal').classList.contains('review-dialog'),false);
  app.click('number',{value:'1'});
  app.click('nav',{id:'mine'});
  app.click('nav',{id:'search'});
  assert.equal(app.node('#modal').open,false);
  assert.equal(app.node('#modal').showCount,1,'Rerenders and menu navigation must not reopen an automatically dismissed popup.');
  app.click('review-open');
  assert.equal(app.node('#modal').open,true);
  assert.match(app.node('#review-cards-host').innerHTML,/오늘의 북마크 복습을 마쳤어요/);
  app.click('review-restart');
  assert.match(app.node('#review-cards-host').innerHTML,/review-flashcard/);
  app.node('#modal').close(); // Native Escape closes the dialog through its close event.
  assert.equal(app.node('#modal').classList.contains('review-dialog'),false);
  app.click('number',{value:'2'});
  assert.equal(app.node('#modal').open,false);
  app.click('review-open');
  assert.equal(app.node('#modal').open,true);
  assert.equal(app.node('#modal').classList.contains('review-dialog'),true);
  assert.match(app.node('#review-cards-host').innerHTML,/review-flashcard/);
});

test('mine keeps its original listing and opens bookmark review on demand with progress and membership intact',()=>{
  const app=appHarness(renewal);app.click('close-modal');app.click('nav',{id:'mine'});
  const originalMine=app.view();
  assert.match(originalMine,/<h1>나의 질문들<\/h1>/);
  assert.match(originalMine,/class="section-tools"/);
  assert.match(originalMine,/data-action="review-open"/);
  assert.doesNotMatch(originalMine,/id="review-cards-host"|review-flashcard/);
  assert.doesNotMatch(originalMine,/국어 모의고사에서 비슷한 유형의 문제를 계속 틀려요/);
  assert.equal(app.node('#modal').open,false);
  app.click('review-open');
  app.click('review-flip',{id:'korean17-1'});
  app.click('review-done',{id:'korean17-1'});
  assert.equal(app.view(),originalMine);
  app.click('close-modal');
  app.click('bookmark',{id:'korean17-2'});
  app.click('review-open');
  assert.match(app.node('#review-cards-host').innerHTML,/data-id="korean17-2"/);
  assert.match(app.node('#review-cards-host').innerHTML,/오늘 1 \/ 2개 완료/);
  app.click('close-modal');
  app.click('bookmark',{id:'korean17-1'});
  app.click('bookmark',{id:'korean17-2'});
  app.click('review-open');
  assert.match(app.node('#review-cards-host').innerHTML,/북마크하면 이곳에 복습 카드가 자동으로 나타나요/);
});

test('empty collections and external problem links do not auto-open review, and popup navigation releases the modal',()=>{
  const empty=appHarness(renewal,'',{'ta-original-demo-v1':JSON.stringify({bookmarks:[],questions:[],ratings:{}})});
  assert.equal(empty.node('#modal').open,false);
  assert.equal(empty.node('#modal').showCount,0);
  assert.match(empty.view(),/class="picker"/);
  empty.click('review-open');
  assert.match(empty.node('#review-cards-host').innerHTML,/북마크하면 이곳에 복습 카드가 자동으로 나타나요/);
  assert.match(empty.node('#review-cards-host').innerHTML,/data-action="nav" data-id="search"/);
  empty.click('nav',{id:'search'});
  assert.equal(empty.node('#modal').open,false);
  assert.match(empty.view(),/<h1>문항 검색<\/h1>/);
  for(const view of ['question','answers']) {
    const query='?'+new URLSearchParams({subject:'수학',content:'월례고사',round:'10',number:'21',view});
    const linked=appHarness(renewal,query);
    assert.match(linked.view(),/id="ask-form"/);
    assert.doesNotMatch(linked.view(),/id="review-cards-host"/);
    assert.equal(linked.node('#modal').open,false);
    assert.equal(linked.node('#modal').showCount,0);
  }
  const app=appHarness(renewal);
  app.click('answer',{id:'korean17-1'});
  assert.equal(app.node('#modal').open,false);
  assert.equal(app.node('#modal').classList.contains('review-dialog'),false);
  assert.match(app.view(),/검색 결과 상세보기/);
  assert.match(app.view(),/안녕하세요, 김하경 TA입니다/);
});

test('deep links retain the original form and added summaries without substituting a solution photo', () => {
  const query=new URLSearchParams({subject:'국어',content:'서바이벌프로',round:'8',number:'2'});
  const app=appHarness(renewal,'?'+query);
  assert.match(app.view(), /<h1>문항 질문<\/h1>/);
  assert.match(app.view(), /id="ask-form"/);
  assert.match(app.view(), /서바이벌프로<\/span>/);
  assert.match(app.view(), /8회<\/span>/);
  assert.match(app.view(), /2번<\/span>/);
  assert.equal((app.view().match(/class="question-photo-panel"/g)||[]).length,1);
  assert.equal((app.view().match(/<img /g)||[]).length,0);
  assert.match(app.view(),/등록된 문제 원문 사진이 없습니다/);
  assert.match(app.view(),/data-action="upload-problem-photo"/);
  assert.doesNotMatch(inlineScript(renewal),/referencePhotoUrl|KakaoTalk_20261106_151959657_14\.jpg/);
  assert.match(app.view(), /다른 학생의 질문/);
  assert.match(app.view(), /문항 풀이·개념 질문이 아직 없습니다/);
  assert.match(app.view(), /학습 상담·기타에 2개의 질문이 따로 모여/);
  assert.ok(app.view().indexOf('id="other-questions"')>app.view().indexOf('</form>'));
  assert.match(app.view(),/class="question-form"/);
  assert.match(app.view(),/이미지 업로드 하기/);
  app.click('question-category',{category:'study'});
  assert.match(app.view(), /답변 요약/);
  assert.match(app.view(), /class="question-summary">다시 읽고 푸는 것만으로/);
  assert.match(app.view(), /#비문학오답/);
  assert.match(app.view(), /#복습방법/);
  assert.match(app.view(), /지문을 읽는 태도와 문제를 푸는 태도를 나누어/);
  assert.doesNotMatch(app.view(), /그냥 다시 읽고 풀어서 오답하고 있는데/);
  assert.doesNotMatch(app.view(), /question-disclosure/);
  app.click('answer',{id:'korean8-1'});
  assert.match(app.view(), /그냥 다시 읽고 풀어서 오답하고 있는데/);
  assert.match(app.view(), /첫 번째는 ‘지문을 읽는 태도’에 대한 피드백입니다/);
});

test('the problem photo panel uses one explicit source-matched original image and excludes generic attachments', () => {
  const source={subject:'국어',book:'서바이벌프로',round:8,number:2};
  const query='?'+new URLSearchParams({subject:source.subject,content:source.book,round:'8',number:'2'});
  const image='data:image/jpeg;base64,/9j/2Q==';
  const existing={bookmarks:['korean8-1'],questions:[{id:'existing-q',text:'일반 풀이 첨부입니다.',created:'2026-11-06T15:00',source,images:[{data:image,name:'풀이.jpg'}]}],ratings:{}};
  const genericOnly=appHarness(renewal,query,{'ta-original-demo-v1':JSON.stringify(existing)});
  assert.match(genericOnly.view(),/등록된 문제 원문 사진이 없습니다/);
  assert.equal((genericOnly.view().match(/<img /g)||[]).length,0);
  const photos={
    '국어|서바이벌프로|8|2':{data:image,name:'문제 원문.jpg'},
    '수학|월례고사|10|21':{data:'data:image/jpeg;base64,/9j/2A==',name:'수학 원문.jpg'},
  };
  const initialStorage={'ta-original-demo-v1':JSON.stringify(existing),'ta-original-problem-photos-v1':JSON.stringify(photos)};
  const exact=appHarness(renewal,query,initialStorage);
  assert.equal((exact.view().match(/class="question-photo-panel"/g)||[]).length,1);
  assert.equal((exact.view().match(/<img /g)||[]).length,1);
  assert.ok(exact.view().includes(image));
  assert.ok(!exact.view().includes(photos['수학|월례고사|10|21'].data));
  const other=appHarness(renewal,'?'+new URLSearchParams({subject:'국어',content:'서바이벌',round:'17',number:'1'}),initialStorage);
  assert.match(other.view(),/등록된 문제 원문 사진이 없습니다/);
  assert.equal((other.view().match(/<img /g)||[]).length,0);
  const corrupt=appHarness(renewal,query,{'ta-original-problem-photos-v1':JSON.stringify({'국어|서바이벌프로|8|2':{data:'javascript:alert(1)',name:'bad'}})});
  assert.match(corrupt.view(),/등록된 문제 원문 사진이 없습니다/);
  assert.doesNotMatch(corrupt.view(),/javascript:alert/);
});

test('a bookmark question opens its exact source and never shows another source photo', () => {
  const app=appHarness(renewal);
  app.click('mine-tab',{value:'북마크'});
  app.click('ask-answer',{id:'korean17-1'});
  assert.match(app.view(), /서바이벌<\/span>/);
  assert.match(app.view(), /17회<\/span>/);
  assert.match(app.view(), /1번<\/span>/);
  assert.doesNotMatch(app.view(), /KakaoTalk_20261106_151959657_14\.jpg/);
  assert.equal((app.view().match(/<img /g)||[]).length,0);
  app.click('answer', { id: 'korean17-1' });
  assert.match(app.view(), /안녕하세요, 김하경 TA입니다\./);
  app.click('ask-selected');
  assert.match(app.view(), /원하는 TA가 없어요\./);
  app.node('#question-text').value = '지문과 선지의 조건을 비교하는 방법이 궁금해요.';
  app.submit();
  const saved = JSON.parse(app.storage.get('ta-original-demo-v1'));
  assert.equal(saved.questions[0].text, '지문과 선지의 조건을 비교하는 방법이 궁금해요.');
  assert.deepEqual(saved.questions[0].source, { subject: '국어', book: '서바이벌', round: 17, number: 1 });
  assert.match(app.view(), /로컬 저장 · 답변 대기/);
});

test('changing the source keeps the question draft and returns directly to the filled form', () => {
  const app=appHarness(renewal);
  app.click('nav',{id:'ask'});
  app.node('#question-text').value='조건을 비교하는 방법을 자세히 알고 싶습니다.';
  app.click('reset-source');
  app.click('subject',{value:'수학'});
  app.click('book',{value:'월례고사'});
  app.click('round',{value:'10'});
  app.click('number',{value:'21'});
  app.click('pick-next');
  assert.match(app.view(),/id="ask-form"/);
  assert.match(app.view(),/조건을 비교하는 방법을 자세히 알고 싶습니다/);
  assert.match(app.view(),/수학<\/span>/);
  assert.match(app.view(),/월례고사<\/span>/);
  assert.match(app.view(),/21번<\/span>/);
  assert.match(app.node('#navigation').innerHTML,/nav-item active"[^>]*data-action="nav"[^>]*data-id="ask"/);
  assert.match(app.view(), /#함수조건/);
  assert.match(app.view(), /#그래프해석/);
  assert.match(app.view(), /그림에서 추측한 성질을 조건과 식으로 검증/);
  assert.doesNotMatch(app.view(), /함수의 조건을 식으로 옮기는 부분이 어렵습니다/);
});

test('learning questions and study advice are separated without losing full originals', () => {
  const app=appHarness(renewal);
  app.click('ask-answer',{id:'korean17-1'});
  assert.match(app.view(),/지문과 표현이 다른 두 선지를 어떻게 판단하나요/);
  assert.match(app.view(),/#선지판단/);
  assert.doesNotMatch(app.view(),/반복되는 국어 오답은 어떻게 복습/);
  app.click('question-category',{category:'study'});
  assert.match(app.view(),/반복되는 국어 오답은 어떻게 복습/);
  assert.match(app.view(),/#시간관리/);
  assert.doesNotMatch(app.view(),/지문과 표현이 다른 두 선지를 어떻게 판단하나요/);
  app.click('answer',{id:'korean17-1'});
  assert.match(app.view(),/국어 모의고사에서 비슷한 유형의 문제를 계속 틀려요/);
});

test('validated external deep links enter the original form with the exact source selected', () => {
  const query=new URLSearchParams({subject:'수학',content:'월례고사',round:'10',number:'21',view:'question'}).toString();
  const app=appHarness(renewal,'?'+query);
  assert.match(app.view(),/id="ask-form"/);
  assert.match(app.view(),/수학<\/span>/);
  assert.match(app.view(),/월례고사<\/span>/);
  assert.match(app.view(),/10회<\/span>/);
  assert.match(app.view(),/21번<\/span>/);
  assert.match(app.view(),/#함수조건/);
  app.click('focus-question');
  assert.equal(app.node('#question-text').focused,true);
  const answerQuery=new URLSearchParams({subject:'국어',content:'서바이벌프로',round:'8',number:'2',view:'answers'}).toString();
  const answerApp=appHarness(renewal,'?'+answerQuery);
  assert.equal(answerApp.node('#other-questions').scrolled,true);
  assert.equal((answerApp.view().match(/class="question-photo-panel"/g)||[]).length,1);
});

test('accelerator links preserve existing rounds and open the added ebook rounds in the question form', () => {
  for(const round of [...Array.from({length:18},(_,i)=>i+1),27,28,29]) {
    const query=new URLSearchParams({subject:'국어',content:'엑셀러레이터',round:String(round),number:'45',view:'question'});
    const app=appHarness(renewal,'?'+query);
    assert.match(app.view(),/id="ask-form"/,`round ${round} opens a form`);
    assert.match(app.view(),/엑셀러레이터<\/span>/);
    assert.ok(app.view().includes(`${round}회</span>`));
    assert.match(app.view(),/45번<\/span>/);
    if(round>=27) {
      app.click('reset-source');
      assert.match(app.view(),new RegExp(`data-action="round" data-value="${round}"[^>]*id="selected-round"`));
      assert.deepEqual(pickerValues(app.view(),'round'),[...Array.from({length:18},(_,i)=>String(i+1)),'27','28','29']);
    }
  }
  for(const [subject,number] of [['수학','30'],['영어','45']]) {
    const app=appHarness(renewal,'?'+new URLSearchParams({subject,content:'엑셀러레이터',round:'29',number}));
    assert.match(app.view(),/id="ask-form"/);
    assert.ok(app.view().includes(`${subject}</span>`));
    assert.ok(app.view().includes(`${number}번</span>`));
  }
});

test('full scrolling choice lists keep the final round and number reachable without losing drafts', () => {
  const app=appHarness(renewal);
  app.click('nav',{id:'ask'});
  app.node('#question-text').value='마지막 문항에서도 질문 내용을 유지해 주세요.';
  app.click('reset-source');
  app.click('book',{value:'엑셀러레이터'});
  assert.deepEqual(pickerValues(app.view(),'round'),[...Array.from({length:18},(_,i)=>String(i+1)),'27','28','29']);
  app.click('round',{value:'29'});
  assert.deepEqual(pickerValues(app.view(),'number'),Array.from({length:45},(_,i)=>String(i+1)));
  app.click('number',{value:'45'});
  assert.match(app.view(),/45번<\/span>/);
  assert.doesNotMatch(app.view(),/picker-page|selection-pagination|data-picker-direct/);
  app.click('pick-next');
  assert.match(app.view(),/id="ask-form"/);
  assert.match(app.view(),/29회<\/span>/);
  assert.match(app.view(),/45번<\/span>/);
  assert.match(app.view(),/마지막 문항에서도 질문 내용을 유지해 주세요/);
});

test('added accelerator rounds do not broaden other content, subjects, or question limits', () => {
  const base={subject:'국어',content:'엑셀러레이터',round:'29',number:'1',view:'question'};
  const invalid=[
    ...['0','19','26','30'].map(round=>({...base,round})),
    ...['서바이벌','월례고사','서바이벌프로','상상(FINAL)'].map(content=>({...base,content})),
    {...base,subject:'한국사'}, {...base,subject:'물리학Ⅱ'}, {...base,subject:'사회문화'},
    {...base,number:'46'}, {...base,subject:'수학',number:'31'}, {...base,subject:'영어',number:'46'},
    {...base,subject:'물리학Ⅱ',content:'서바이벌',round:'18',number:'21'},
    {...base,subject:'사회문화',content:'서바이벌',round:'18',number:'21'}
  ];
  for(const source of invalid) {
    const app=appHarness(renewal,'?'+new URLSearchParams(source));
    assert.match(app.view(),/<h1>문항 검색<\/h1>/,JSON.stringify(source));
    assert.doesNotMatch(app.view(),/id="ask-form"/);
  }
});

test('invalid or incomplete external links return to the original search screen', () => {
  const base={subject:'수학',content:'월례고사',round:'10',number:'21',view:'question'};
  const cases=[{...base,subject:'<script>'},{...base,content:'없는 콘텐츠'},{...base,round:'0'},{...base,round:'99'},{...base,number:'31'},{...base,number:'1.5'},{...base,view:'script'}];
  for(const invalid of cases) {
    const app=appHarness(renewal,'?'+new URLSearchParams(invalid));
    assert.match(app.view(),/<h1>문항 검색<\/h1>/);
    assert.doesNotMatch(app.view(),/id="ask-form"/);
  }
  for(const query of ['?subject=국어','?'+new URLSearchParams(base)+'&number=22']) assert.match(appHarness(renewal,query).view(),/<h1>문항 검색<\/h1>/);
});


test('original ask menu adds prefilled entry while the original search selection still opens results',()=>{
  const app=appHarness(renewal);app.click('nav',{id:'ask'});
  assert.match(app.view(),/<h1>문항 질문<\/h1>/);
  assert.match(app.view(),/17회<\/span>/);assert.match(app.view(),/1번<\/span>/);
  assert.match(app.view(),/id="ask-form"/);
  app.click('nav',{id:'search'});app.click('number',{value:'1'});app.click('pick-next');
  assert.match(app.view(),/국어 서바이벌 17회 1번 검색 결과/);
  assert.doesNotMatch(app.view(),/id="ask-form"/);
  assert.match(app.view(),/사진 함께 보기/);
});
test('renewal keeps the original TA empty state and all thirty disabled SA slots', () => {
  const app = appHarness(renewal);
  app.click('nav', { id: 'ta' });
  assert.match(app.view(), /현재 상담 가능한 TA가 없습니다\./);
  app.click('nav', { id: 'sa' });
  assert.match(app.view(), /이용권 잔여 횟수: <strong>0회<\/strong>/);
  assert.equal((app.view().match(/class="time-slot" disabled/g) ?? []).length, 30);
});
