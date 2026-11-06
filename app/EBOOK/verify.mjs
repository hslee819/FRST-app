/**
 * Dependency-free integration smoke checks for the eBook prototype.
 * Run: node EBOOK/verify.mjs
 *
 * This uses a small DOM stub in Node VM, not a real browser. It verifies
 * application state, generated markup, callbacks and storage. It does not
 * verify layout, focus behavior, native dialog behavior or visual fidelity.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const sources = ['ebook-data.js', 'flash.js', 'integrations.js', 'app.js'].map(name => ({
  name,
  code: fs.readFileSync(new URL(name, import.meta.url), 'utf8'),
}));
const storage = new Map();

function boot() {
  const elements = new Map();
  const documentListeners = {};
  let now=1000;
  const intervals=[];

  function element(key = '') {
    const classes = new Set();
    return {
      key,
      id: key.startsWith('#') ? key.slice(1) : '',
      innerHTML: '',
      textContent: '',
      value: '',
      hidden: false,
      open: false,
      disabled: false,
      checked: false,
      dataset: {},
      events: {},
      style: { setProperty(k, value) { this[k] = value; } },
      classList: {
        add: k => classes.add(k),
        remove: k => classes.delete(k),
        toggle(k, on) {
          const enabled = on === undefined ? !classes.has(k) : on;
          if (enabled) classes.add(k); else classes.delete(k);
          return enabled;
        },
      },
      clientWidth: 1100,
      scrollTop: 0,
      addEventListener(type, listener) { (this.events[type] ??= []).push(listener); },
      setAttribute(k, value) { this[k] = value; },
      removeAttribute(k) { delete this[k]; },
      focus() {},
      setPointerCapture() {},
      appendChild(child) {
        child.parent = this;
        if (child.id) elements.set('#' + child.id, child);
      },
      append() {},
      replaceChildren() {},
      querySelector: selector => get(selector),
      querySelectorAll: () => [],
      showModal() { this.open = true; },
      close() {
        this.open = false;
        (this.events.close || []).forEach(listener => listener());
      },
      closest(selector) {
        if (selector === 'button,a') return this;
        if (selector === '[data-flash-action]') return this.dataset.flashAction ? this : null;
        if (selector === '[data-flash-close]') return 'flashClose' in this.dataset ? this : null;
        if (selector === 'dialog') return get('#flash-review-dialog');
        return null;
      },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1100, height: 900 }),
    };
  }

  function get(selector) {
    if (selector === 'dialog[open]') return [...elements.values()].find(el => el.open) || null;
    if (!elements.has(selector)) elements.set(selector, element(selector));
    return elements.get(selector);
  }

  const document = {
    hidden: false,
    body: element('body'),
    querySelector: get,
    querySelectorAll: () => [],
    createElement: () => element(),
    createElementNS: () => element(),
    addEventListener(type, listener) { (documentListeners[type] ??= []).push(listener); },
  };
  get('#flash-section').hidden = true;
  get('meta[name="ta-app-path"]').content = '../ta/renewal.html';

  const context = {
    document,
    window: { addEventListener() {} },
    console, Date, Math, Set, URLSearchParams,
    performance: { now: () => now },
    localStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
    setInterval(fn) { intervals.push(fn); },
    setTimeout() {},
    clearTimeout() {},
  };
  vm.createContext(context);
  sources.forEach(source => vm.runInContext(source.code, context, { filename: source.name }));

  // Dispatch the component listener followed by the document listener to
  // exercise the prototype's delegated event handlers and their interaction.
  function click(dataset = {}, scope) {
    const target = element();
    target.dataset = dataset;
    const event = { target, preventDefault() {}, stopPropagation() {} };
    if (scope) (get(scope).events.click || []).forEach(listener => listener(event));
    (documentListeners.click || []).forEach(listener => listener(event));
  }
  function bound(id) {
    (get(id).events.click || []).forEach(listener => listener({ preventDefault() {} }));
  }
  return { context, get, click, bound, document, advance(seconds) { for(let i=0;i<seconds;i++){now+=1000;intervals.forEach(fn=>fn());} } };
}

const app = boot();
const question = app.context.EbookData.allQuestions()[0];
const flashStore = () => JSON.parse(storage.get('sdij-ebook-flash-v1'));

// Fresh start: the hidden notebook does not contain the welcome dialog.
assert.equal(app.get('#flash-section').hidden, true);
assert.equal(app.get('#flash-review-dialog').open, true);
assert.equal(app.get('#flash-dialogs').parent, app.document.body);
assert.match(app.get('#flash-review-body').innerHTML, /data-flash-action="sample"/);

// Trying a sample must not create a fake user learning record.
app.click({ flashAction: 'sample' }, '#flash-dialogs');
assert.equal((app.get('#flash-review-body').innerHTML.match(/data-flash-answer=/g)||[]).length,5);
app.click({ flashAction: 'select-answer', flashAnswer:'1' }, '#flash-dialogs');
assert.match(app.get('#flash-review-body').innerHTML,/class="flash-choice-button selected"[^>]*data-flash-answer="1"[^>]*aria-pressed="true"/);
assert.doesNotMatch(app.get('#flash-review-body').innerHTML,/flash-my-answer/,'Choosing an option must not flip the card');
app.click({ flashAction: 'flip' }, '#flash-dialogs');
assert.match(app.get('#flash-review-body').innerHTML, /data-flash-action="review-understood"/);
assert.match(app.get('#flash-review-body').innerHTML,/flash-choice-button selected wrong/);
assert.match(app.get('#flash-review-body').innerHTML,/나의 답 <strong>1번/);
app.click({ flashAction: 'select-answer', flashAnswer:'3' }, '#flash-dialogs');
assert.match(app.get('#flash-review-body').innerHTML,/나의 답 <strong>1번/,'The result face must preserve the selected answer');
app.click({ flashAction: 'review-understood' }, '#flash-dialogs');
assert.equal(app.context.EbookFlash.contains(question.id), false);
app.click({ flashAction: 'start' }, '#flash-dialogs');
assert.equal(app.get('#flash-review-dialog').open, false);

// Start studying, choose an answer and save that question to the notebook.
app.click({ openBook: question.bookId });
assert.equal(app.get('#view-title').textContent,'학습하기');
assert.equal(app.get('#mode-dialog').open, true);
app.click({ startMode: 'study' });
assert.equal(app.get('#reader').hidden, false);
app.click({ answer: '1' });
app.click({ collect: '' });
assert.equal(app.context.EbookFlash.contains(question.id), true);
assert.equal(app.context.EbookFlash.collect(question), false, 'Duplicate notes must be rejected');

// Navigate back, open the notebook and mark the card for another review.
app.bound('#reader-back');
app.bound('#save-later');
app.click({ view: 'flash' });
assert.equal(app.get('#flash-section').hidden, false);
app.click({ flashAction: 'review-one', id: question.id }, '#flash-section');
assert.equal(app.get('#flash-review-dialog').open, true);
app.click({ flashAction: 'flip' }, '#flash-dialogs');
app.click({ flashAction: 'review-again' }, '#flash-dialogs');
assert.equal(flashStore().items[question.id].status, 'reviewing');
app.click({ flashAction: 'close-review' }, '#flash-dialogs');

// Editing a note persists its content, tags, color and completion status.
app.click({ flashAction: 'edit', id: question.id }, '#flash-section');
app.get('#flash-note').value = 'My note';
app.get('#flash-tags').value = 'one, two';
app.get('#flash-color').value = 'blue';
app.click({ flashAction: 'complete-note' }, '#flash-dialogs');
assert.equal(flashStore().items[question.id].status, 'organized');
assert.equal(flashStore().items[question.id].note, 'My note');
assert.deepEqual(flashStore().items[question.id].tags, ['one', 'two']);
assert.equal(flashStore().items[question.id].color, 'blue');

// The notebook's original-question action enters the reader at that question.
app.click({ flashAction: 'open', id: question.id }, '#flash-section');
assert.equal(app.get('#reader').hidden, false);
assert.match(app.get('#reader-chapter').textContent, new RegExp(String(question.number)));

// A new app context restores the real saved card into the first-entry popup.
const restored = boot();
assert.equal(restored.get('#flash-review-dialog').open, true);
assert.match(restored.get('#flash-review-body').innerHTML, /data-flash-action="flip"/);
restored.click({ flashAction: 'flip' }, '#flash-dialogs');
restored.click({ flashAction: 'review-understood' }, '#flash-dialogs');
assert.equal(flashStore().items[question.id].status, 'done');

// An exam keeps explanations and answer ratios hidden until grading.
const exam=boot();
exam.click({flashAction:'start'},'#flash-dialogs');
exam.click({openBook:question.bookId});
exam.get('#reset-progress').checked=true;
exam.click({startMode:'exam'});
assert.equal(exam.get('#reader-timer').hidden,false);
assert.doesNotMatch(exam.get('#question-panel').innerHTML,/data-explanation|data-collect|data-ta-link|67\.5%/);
exam.advance(8);
assert.equal(exam.get('#elapsed-time').textContent,'00:08');
exam.click({answer:String(question.answer)});
exam.bound('#finish-button');
exam.bound('#grade-button');
const session=JSON.parse(storage.get('sdij-ebook-library-v1')).sessions[question.bookId];
assert.equal(session.graded,true);
assert.equal(session.score,question.points);
assert.equal(session.seconds,8);
assert.match(exam.get('#question-panel').innerHTML,/data-explanation/);
assert.match(exam.get('#question-panel').innerHTML,/67\.5%/);
assert.match(exam.get('#question-panel').innerHTML,/ta\/renewal\.html\?subject=/);
assert.match(exam.get('#question-panel').innerHTML,/view=question/);
exam.advance(4);
assert.equal(exam.get('#elapsed-time').textContent,'00:08','A graded exam must stop timing');
exam.click({answer:'1'});
assert.equal(JSON.parse(storage.get('sdij-ebook-library-v1')).sessions[question.bookId].answers[1],question.answer,'A graded answer must stay unchanged');
exam.bound('#reader-back');
exam.bound('#save-later');
exam.click({view:'content'});
exam.click({openBook:question.bookId});
assert.equal(exam.get('#reader-mode').textContent,'해설지');
assert.equal(exam.get('#reader-timer').hidden,true);
assert.match(exam.get('#paper-content').innerHTML,/inline-explanation/);

// Erasing the middle of a straight line and undoing that deletion must work.
const pointer=(type,x,y)=>exam.get('#ink-layer').events[type].forEach(fn=>fn({button:0,pointerId:1,clientX:x,clientY:y,preventDefault(){}}));
const strokes=()=>JSON.parse(storage.get('sdij-ebook-library-v1')).strokes[question.bookId][1];
exam.click({tool:'line'});
pointer('pointerdown',100,100);
pointer('pointermove',900,700);
pointer('pointerup',900,700);
assert.equal(strokes().length,1);
exam.click({tool:'eraser'});
pointer('pointerdown',500,400);
pointer('pointerup',500,400);
assert.equal(strokes().length,0,'The middle of a line must be erasable');
exam.bound('#undo-button');
assert.equal(strokes().length,1,'Undo must restore an erased line');
exam.bound('#redo-button');
assert.equal(strokes().length,0,'Redo must reapply the deletion');
exam.get('#zoom-select').events.change.forEach(fn=>fn({target:{value:'150'}}));
assert.equal(exam.get('#reading-stage').style.justifyContent,'flex-start','An oversized page must keep its left edge reachable');

for(const book of app.context.EbookData.books.filter(b=>b.kind==='workbook')){
  const questions=app.context.EbookData.getQuestions(book.id);
  assert.equal(questions.length,45);
  assert.equal(questions.reduce((sum,q)=>sum+q.points,0),100);
  for(const q of questions){assert.equal(q.choices.length,5);assert.ok(Math.abs(q.ratios.reduce((a,b)=>a+b,0)-100)<.001);}
}

// The standalone bundle must keep scripts after the DOM and preserve their code.
const outer=fs.readFileSync(new URL('../EBOOK.html',import.meta.url),'utf8');
const tablet=JSON.parse(outer.match(/<script type="application\/json" id="ebook-ipad-app">([\s\S]*?)<\/script>/)[1]);
assert.equal(tablet.width/tablet.height,4/3);
assert.equal(tablet.width,1280);
const bundle=tablet.html;
assert.doesNotMatch(bundle,/<script src=|<link rel="stylesheet"/);
assert.match(bundle,/name="ta-app-path" content="ta\/renewal.html"/);
const inline=[...bundle.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(inline.length,4);
assert.ok(bundle.indexOf('<script>')>bundle.indexOf('id="proposal-dialog"'));
inline.forEach((match,i)=>{new vm.Script(match[1]);assert.equal(match[1].trim(),sources[i].code.trim());});

console.log('PASS: eBook + Flash integration smoke checks (Node VM / DOM stub).');
console.log('Verified: welcome dialog, sample isolation, study, answer/collect, duplicate prevention, notebook review, notes, original-question handoff, storage reload, exam timing/answer isolation/grading, TA links, solutions, standalone bundle.');
console.log('This is not a real-browser or visual-layout test.');
