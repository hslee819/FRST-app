(() => {
  'use strict';
  window.NScreens ||= {};
  window.NScreens.focus = {
    title: '몰입도 현황',
    fullBleed: true,
    render() {
      const source = typeof window.NFocusHTML === 'string' ? '' : ' src="focus-content.html"';
      return `<section class="focus-host" aria-label="학습 몰입도 대시보드"><iframe id="focus-frame" class="focus-frame" title="몰입도 현황 · 나의 학습과 비교"${source}></iframe></section>`;
    },
    mount() {
      const frame = document.querySelector('#focus-frame');
      if (frame && typeof window.NFocusHTML === 'string') frame.srcdoc = window.NFocusHTML;
    },
  };
})();
