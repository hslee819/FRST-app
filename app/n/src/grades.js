(() => {
  'use strict';
  window.NScreens ||= {};
  window.NScreens.grades = {
    title: '성적',
    fullBleed: true,
    render() {
      const source = typeof window.NGradesHTML === 'string' ? '' : ' src="grades-content.html"';
      return `<section class="grades-host" aria-label="성적"><iframe id="grades-frame" class="grades-frame" title="성적 · 리포트 서랍장, 부엉이 분석실"${source}></iframe></section>`;
    },
    mount() {
      const frame = document.querySelector('#grades-frame');
      if (frame && typeof window.NGradesHTML === 'string') frame.srcdoc = window.NGradesHTML;
    },
  };
})();
