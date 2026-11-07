(() => {
  'use strict';
  const weeks = [
    {focus:[6,7,7,6,7],lecture:[140,180,170,160,170],self:[340,410,380,350,410],shownTotal:'40h 20m'},
    {focus:[5,6,6,6,7],lecture:[130,170,160,170,180],self:[360,420,400,390,440],shownTotal:'42h 10m'},
    {focus:[6,8,7,7,8],lecture:[160,190,180,170,120],self:[410,460,430,420,470],shownTotal:'44h 30m'},
    {focus:[5,8,6,6,7],lecture:[130,190,120,120,170],self:[390,440,410,400,430],shownTotal:'43h 40m'},
  ];
  const rows = [
    {label:'3교시',values:[8,8,8,'수업',8]},
    {label:'4교시',values:['수업','수업',8,'수업',8]},
    {label:'5교시',values:[7.5,7.5,'수업',7.5,7.5]},
    {label:'6교시',values:[7.5,7.5,7.5,8,'수업']},
  ];
  const hourlyFocus = [4,8,0,0,4,5,5,5,5,7,5,5,5,7,3];
  const hourlyMinutes = [27,50,1,0,27,33,32,32,20,26,32,32,32,46,24];
  const days = ['월','화','수','목','금'];
  const personal = [7.75,7.75,7.83,7.75,7.83];
  const top50 = [8.1,8.05,8.08,8.06,8.06];
  const top20 = [8.28,8.2,8.24,8.25,8.18];
  const pad = value => String(value).padStart(2,'0');
  const duration = minutes => `${pad(Math.floor(minutes / 60))}h ${pad(minutes % 60)}m`;
  const get = ctx => ctx.state.focus ||= {mode:'comparison',view:'summary',week:0,month:10,year:2026,studyView:'weekly'};
  const sample = state => state.month === 10 && state.year === 2026;
  const note = '<p class="focus-footnote">* 자습 몰입도는 수치보다 주간 추이를 보며 학습에 활용해주세요.</p>';
  function monthPicker(ctx) {
    const s = get(ctx);
    return `<div class="focus-month"><button data-action="focus-month" data-delta="-1" aria-label="이전 달">${ctx.icon('chevron-left')}</button><strong>${s.month}</strong><button data-action="focus-month" data-delta="1" aria-label="다음 달" ${s.year === 2026 && s.month === 10 ? 'disabled' : ''}>${ctx.icon('chevron-right')}</button></div>`;
  }
  function weekTabs(ctx) {
    const s = get(ctx);
    return `<div class="focus-weeks" role="group" aria-label="주차 선택">${weeks.map((_,i) => `<button data-action="focus-week" data-week="${i}" aria-pressed="${s.week === i}" class="${s.week === i ? 'selected' : ''}">${i + 1}주</button>`).join('')}</div>`;
  }
  function dots(ctx) {
    const s = get(ctx);
    return `<div class="focus-dots" role="group" aria-label="비교 화면 선택"><button aria-label="주간 비교 그래프" aria-pressed="${s.view === 'summary'}" class="${s.view === 'summary' ? 'active' : ''}" data-action="focus-view" data-view="summary"></button><button aria-label="교시별 몰입도 표" aria-pressed="${s.view === 'detail'}" class="${s.view === 'detail' ? 'active' : ''}" data-action="focus-view" data-view="detail"></button></div>`;
  }
  const empty = '<div class="focus-empty">이 기간의 몰입도 기록이 없습니다.<small>제공된 화면의 2026년 10월 기록을 확인할 수 있습니다.</small></div>';
  function detail(ctx) {
    const s = get(ctx);
    return `<div class="focus-detail"><div class="focus-table-wrap"><table class="focus-table"><caption class="focus-sr">2026년 10월 1주 교시별 몰입도</caption><thead><tr><th scope="col">교시</th>${days.map(day => `<th scope="col">${day}</th>`).join('')}<th scope="col">개인 평균</th><th scope="col">몰입도 상위<br>50% 평균</th><th scope="col">몰입도 상위<br>20% 평균</th></tr></thead><tbody>${rows.map(row => `<tr><th scope="row">${row.label}</th>${row.values.map(value => `<td>${typeof value === 'number' ? value.toFixed(1) : value}</td>`).join('')}<td>-</td><td>-</td><td>-</td></tr>`).join('')}</tbody></table></div><button class="focus-side-arrow left" data-action="focus-view" data-view="summary" aria-label="주간 비교 그래프">${ctx.icon('chevron-left')}</button></div>${dots(ctx)}`;
  }
  function gauge(value,label,color) {
    const circumference = 2 * Math.PI * 72;
    return `<div class="focus-gauge"><svg viewBox="0 0 156 156" aria-label="${label.replaceAll('<br>',' ')} ${value}"><circle cx="78" cy="78" r="72" fill="none" stroke="#ededf1" stroke-width="4"/><circle cx="78" cy="78" r="72" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${circumference * value / 10} ${circumference}" transform="rotate(-90 78 78)"/><text x="78" y="90" text-anchor="middle" fill="${color}" font-size="36" font-weight="700">${value.toFixed(2)}</text></svg><strong>${label}</strong></div>`;
  }
  function comparisonBars() {
    const height = 175, top = 12, bottom = 152, left = 60, group = 187;
    const y = value => bottom - (value - 4) / 6 * (bottom - top);
    let svg = `<svg class="focus-compare-chart" viewBox="0 0 1100 210" role="img" aria-label="9월 28일부터 10월 2일까지 개인 및 상위 그룹 몰입도 비교">`;
    for (let value = 5; value <= 10; value++) svg += `<path d="M80 ${y(value)}H1050" stroke="#eeeeF1"/><text x="20" y="${y(value)+5}" font-size="17" font-weight="600">${value}</text>`;
    for (let i = 0; i < 5; i++) {
      const x = left + i * group + 76;
      [personal,top50,top20].forEach((values,j) => { const colors = ['#4c6cf3','#68696d','#d5d5dc']; svg += `<rect x="${x+j*30}" y="${y(values[i])}" width="22" height="${bottom-y(values[i])}" fill="${colors[j]}"><title>${days[i]} ${values[i]}</title></rect>`; });
      svg += `<text x="${x+40}" y="178" text-anchor="middle" font-size="16" font-weight="600">${days[i]}</text><text x="${x+40}" y="199" text-anchor="middle" font-size="17" fill="#a8a8ad" font-weight="600">${['09/28','09/29','09/30','10/01','10/02'][i]}</text>`;
    }
    return svg + `<path d="M80 ${bottom}H1050" stroke="#111" stroke-width="2"/></svg>`;
  }
  function summary(ctx) {
    return `<div class="focus-summary"><div class="focus-gauges">${gauge(7.75,'전체유 평균','#4c6cf3')}${gauge(8.07,'몰입도<br>상위 50% 평균','#68696d')}${gauge(8.23,'몰입도<br>상위 20% 평균','#d5d5dc')}</div>${comparisonBars()}<button class="focus-side-arrow right" data-action="focus-view" data-view="detail" aria-label="교시별 몰입도 표">${ctx.icon('chevron-right')}</button></div>${dots(ctx)}`;
  }
  function monthlyChart() {
    // The screenshot contains a plotted trend, not an underlying numeric export.
    // Keep these explicitly reference samples separate from the observed table.
    const dates = [1,2,5,6,7,8,9,12,13,14,15,16,19,20,21,22,23,26,27,28,29,30];
    const p = [7.75,7.83,4.5,7.83,8,7.5,4.5,7.83,7.67,7.83,7.75,7.5,7.83,7.75,8,7.83,7.75,7.8,8,7.75,7.8,7.9];
    const f = dates.map((d,i) => d===5||d===9 ? 4.5 : 8.08+(i%4)*.015);
    const t = dates.map((d,i) => d===5||d===9 ? 4.5 : 8.23+(i%3)*.02);
    const colors = ['#4c6cf3','#68696d','#d5d5dc'];
    const width = 1550, bottom=300, y=v=>bottom-(v-4)/6*280, x=i=>60+i*66;
    let svg = `<svg viewBox="0 0 ${width} 345" role="img" aria-label="참고 화면의 10월 몰입도 추이">`;
    for(let v=5;v<=10;v++) svg+=`<path d="M45 ${y(v)}H1530" stroke="#ececf0"/><text x="3" y="${y(v)+5}" font-size="16" font-weight="600">${v}</text>`;
    [p,f,t].forEach((values,j)=> {svg+=`<polyline points="${values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="${colors[j]}" stroke-width="2"/>`; values.forEach((v,i)=>{svg+=`<circle cx="${x(i)}" cy="${y(v)}" r="3.4" fill="${j===0?'white':colors[j]}" stroke="${colors[j]}" stroke-width="2"><title>10/${dates[i]} ${v.toFixed(2)} · 캡처 추이 예시</title></circle>`;});});
    svg+=`<path d="M45 ${bottom}H1530" stroke="#111" stroke-width="2"/>`;
    dates.forEach((d,i)=>{svg+=`<text x="${x(i)}" y="331" text-anchor="middle" font-size="16" font-weight="650">10/${d}</text>`;});
    return svg+'</svg>';
  }
  function monthly(ctx) {
    return `<h2 class="focus-month-title">당월 몰입도 추이</h2><div class="focus-view-link"><button data-action="focus-view" data-view="summary">주간 몰입도 보기 ${ctx.icon('chevron-right')}</button></div><div class="focus-month-legend"><strong>몰입도</strong><div><span>전체유 평균 <i style="background:#4c6cf3"></i></span><span>몰입도 상위 50% 평균 <i style="background:#68696d"></i></span><span>몰입도 상위 20% 평균 <i style="background:#d5d5dc"></i></span></div></div><div class="focus-month-scroll" tabindex="0" aria-label="가로로 스크롤하여 월말 추이 보기">${monthlyChart()}</div>`;
  }
  function studyChart(week) {
    const top=34,bottom=238,x=i=>130+i*200, yScore=v=>bottom-v/10*(bottom-top), yMinutes=v=>bottom-v/720*(bottom-top);
    let svg='<svg viewBox="0 0 1100 282" role="img" aria-label="요일별 현장강의와 자습 공부 시간 및 몰입도">';
    for(let i=0;i<=5;i++) {const y=yScore(i*2);svg+=`<path d="M48 ${y}H1052" stroke="#ececf0"/><text x="30" y="${y+4}" text-anchor="end" font-size="12" fill="#f2352b">${i*2}</text>`;}
    for(let i=0;i<=6;i++) {const y=yMinutes(i*120);svg+=`<text x="1070" y="${y+4}" text-anchor="start" font-size="12" fill="#8b8d94">${i*120}</text>`;}
    week.focus.forEach((v,i)=> {
      const sx=x(i), total=week.self[i]+week.lecture[i], selfY=yMinutes(week.self[i]), totalY=yMinutes(total);
      svg+=`<defs><clipPath id="focus-bar-${i}"><rect x="${sx-30}" y="${totalY}" width="60" height="${bottom-totalY}" rx="10"/></clipPath></defs><g clip-path="url(#focus-bar-${i})"><rect x="${sx-30}" y="${selfY}" width="60" height="${bottom-selfY}" fill="#d3ddfc"/><rect x="${sx-30}" y="${totalY}" width="60" height="${selfY-totalY}" fill="#4c6cf3"/></g><text x="${sx}" y="${selfY+(bottom-selfY)/2+2}" text-anchor="middle" font-size="11" fill="#5b6b9a">자습<tspan x="${sx}" dy="14" font-weight="700" fill="#2c3f7a">${duration(week.self[i])}</tspan></text><text x="${sx+40}" y="${totalY+8}" font-size="11.5" font-weight="700" fill="#2b303b" stroke="#fff" stroke-width="3" paint-order="stroke">${duration(total)}<tspan x="${sx+40}" dy="15" font-size="10.5" font-weight="400" fill="#8b8d94">현장강의 ${duration(week.lecture[i])}</tspan></text><text x="${sx}" y="266" text-anchor="middle" font-size="14" font-weight="600" fill="#333">${days[i]}</text>`;
    });
    svg+=`<polyline points="${week.focus.map((v,i)=>`${x(i)},${yScore(v)}`).join(' ')}" fill="none" stroke="#f2352b" stroke-width="1.6"/>`;
    week.focus.forEach((v,i)=>{svg+=`<circle cx="${x(i)}" cy="${yScore(v)}" r="4.5" fill="#f2352b" stroke="#fff" stroke-width="1.5"/><text x="${x(i)}" y="${yScore(v)-11}" text-anchor="middle" font-size="12" font-weight="700" fill="#f2352b" stroke="#fff" stroke-width="3" paint-order="stroke">${v}</text>`;});
    return svg+'</svg>';
  }
  function hourlyChart() {
    const x=i=>70+i*68,y=v=>238-v/10*204;
    let svg='<svg viewBox="0 0 1100 282" role="img" aria-label="8시부터 22시까지 공부 시간과 몰입도">';
    for(let v=0;v<=10;v+=2)svg+=`<path d="M40 ${y(v)}H1052" stroke="#ececf0"/><text x="28" y="${y(v)+4}" text-anchor="end" font-size="12" fill="#f2352b">${v}</text><text x="1070" y="${y(v)+4}" font-size="12" fill="#8b8d94">${v*6}</text>`;
    hourlyMinutes.forEach((v,i)=>{const h=v/60*204;svg+=`<rect x="${x(i)-18}" y="${238-h}" width="36" height="${h}" rx="8" fill="#d3ddfc"/><text x="${x(i)}" y="266" text-anchor="middle" font-size="13" fill="#333">${i+8}</text>`;});
    svg+=`<polyline points="${hourlyFocus.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="#f2352b" stroke-width="1.6"/>`;
    hourlyFocus.forEach((v,i)=>{svg+=`<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="#f2352b" stroke="#fff" stroke-width="1.5"/><text x="${x(i)}" y="${y(v)-10}" text-anchor="middle" font-size="12" font-weight="700" fill="#f2352b" stroke="#fff" stroke-width="3" paint-order="stroke">${v}</text>`;});
    return svg+'</svg>';
  }
  function study(ctx) {
    const s=get(ctx), week=weeks[s.week];
    return `<div class="focus-study-switch"><button data-action="focus-study-view" data-view="daily" class="${s.studyView==='daily'?'selected':''}" aria-pressed="${s.studyView==='daily'}">일별</button><button data-action="focus-study-view" data-view="weekly" class="${s.studyView==='weekly'?'selected':''}" aria-pressed="${s.studyView==='weekly'}">주간(요일별)</button></div><div class="focus-study-legend">${s.studyView==='weekly'?'<span><i class="lecture"></i>현장강의 공부 시간 (분)</span><span><i class="self"></i>자습 공부 시간 (분)</span>':'<span><i class="self"></i>현장강의 공부 시간 (분)</span>'}<span><i class="focus-line"></i>몰입도 ${s.studyView==='weekly'?'(1주평균)':'(1–10)'}</span></div>${sample(s)?`<div class="focus-study-total"><span title="참고 이미지에 표기된 총 공부 시간입니다.">${s.studyView==='weekly'?`총 공부 시간 ${week.shownTotal}`:'시간대별 기록'}</span></div><div class="focus-axis-captions"><span>몰입도</span><span>공부 시간 (분)</span></div>${s.studyView==='weekly'?studyChart(week):s.week===3?hourlyChart():empty}<p class="focus-study-note">아직 몰입도 측정이 시행 되지 않았어요.<br>몰입도는 수치보다는 추이를 보면서 학습에 활용해주세요.</p>`:empty}`;
  }
  function modeTabs(ctx) {
    const s=get(ctx);
    const tabs=[['comparison','몰입도 분석','<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],['study','몰입도 추이','<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>']];
    return `<div class="focus-tabs" role="tablist" aria-label="몰입도 화면 선택">${tabs.map(([mode,label,path])=>`<button role="tab" class="${s.mode===mode?'on':''}" aria-selected="${s.mode===mode}" data-action="focus-mode" data-mode="${mode}"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>${label}</button>`).join('')}</div>`;
  }
  function render(ctx) {
    const s=get(ctx);
    let body;
    if(s.mode==='study') body=weekTabs(ctx)+study(ctx);
    else if(s.view==='monthly') body=sample(s)?monthly(ctx):empty;
    else body=weekTabs(ctx)+`<div class="focus-view-link"><button data-action="focus-view" data-view="monthly">당월 추이 보기 ${ctx.icon('chevron-right')}</button></div>`+(sample(s)&&s.week===0?(s.view==='detail'?detail(ctx):summary(ctx)):empty);
    return `<section class="focus-screen ${s.mode==='study'?'focus-study':''}">${modeTabs(ctx)}${monthPicker(ctx)}${body}${note}</section>`;
  }
  function onAction(action,el,ctx) {
    const s=get(ctx);
    if(action==='focus-mode'){const next=el.dataset.mode||(s.mode==='study'?'comparison':'study');if(next===s.mode)return true;s.mode=next;s.week=s.mode==='study'?3:0;s.view='summary';ctx.render();return true;}
    if(action==='focus-view'){s.view=el.dataset.view;ctx.render();return true;}
    if(action==='focus-week'){s.week=Number(el.dataset.week);ctx.render();return true;}
    if(action==='focus-study-view'){s.studyView=el.dataset.view;ctx.render();return true;}
    if(action==='focus-month') {const d=new Date(s.year,s.month-1+Number(el.dataset.delta),1);if(d>new Date(2026,9,1))return true;s.year=d.getFullYear();s.month=d.getMonth()+1;ctx.render();return true;}
    return false;
  }
  window.NFocusData={weeks,rows,hourlyFocus,hourlyMinutes,duration};
  window.NScreens ||= {};
  window.NScreens.focus={title:'몰입도 현황',render,onAction};
})();
