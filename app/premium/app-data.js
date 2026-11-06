(function (root) {
  'use strict';

  const pad = (value) => String(value).padStart(2, '0');

  function dateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseDate(key) {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day, 12);
  }

  function formatMinutes(minutes, compact = false) {
    const rounded = Math.max(0, Math.round(Number(minutes) || 0));
    const hours = Math.floor(rounded / 60);
    const rest = rounded % 60;
    return compact ? `${hours}h ${pad(rest)}m` : `${hours}시간 ${rest}분`;
  }

  // Reference screenshots disagree with their header totals. The app derives
  // totals from the individual durations shown inside the reference bars.
  const referenceWeeks = [
    { focus: [6, 7, 7, 6, 7], lecture: [140, 180, 170, 160, 170], self: [340, 410, 380, 350, 410] },
    { focus: [5, 6, 6, 6, 7], lecture: [130, 170, 160, 170, 180], self: [360, 420, 400, 390, 440] },
    { focus: [6, 8, 7, 7, 8], lecture: [160, 190, 180, 170, 120], self: [410, 460, 430, 420, 470] },
    { focus: [5, 8, 6, 6, 7], lecture: [130, 190, 120, 120, 170], self: [390, 440, 410, 400, 430] }
  ];

  const seedRecords = referenceWeeks.flatMap((week, weekIndex) =>
    week.focus.flatMap((focus, weekday) => {
      const date = dateKey(new Date(2026, 9, 5 + weekIndex * 7 + weekday, 12));
      return ['lecture', 'self'].map((type) => ({
        id: `demo-${date}-${type}`,
        date,
        type,
        minutes: week[type][weekday],
        focus,
        note: type === 'lecture' ? '참고 화면의 현장강의 기록' : '참고 화면의 자습 기록',
        source: 'demo'
      }));
    })
  );

  function getPeriods(year, month) {
    const first = new Date(year, month, 1, 12);
    const last = new Date(year, month + 1, 0, 12);
    const firstMonday = new Date(year, month, 1 + ((8 - first.getDay()) % 7), 12);
    const periods = [];

    function addPeriod(start, end, label) {
      const startKey = dateKey(start);
      periods.push({ id: startKey, start: startKey, end: dateKey(end), label });
    }

    if (firstMonday.getDate() > 1) {
      addPeriod(first, new Date(year, month, firstMonday.getDate() - 1, 12), '월초');
    }

    let week = 1;
    for (let day = firstMonday.getDate(); day <= last.getDate(); day += 7) {
      addPeriod(
        new Date(year, month, day, 12),
        new Date(year, month, Math.min(day + 6, last.getDate()), 12),
        `${week++}주`
      );
    }
    return periods;
  }

  function aggregateDay(records, date) {
    const matches = records.filter((record) => record.date === date);
    let lecture = 0;
    let self = 0;
    let measuredMinutes = 0;
    let weightedFocus = 0;

    for (const record of matches) {
      if (record.type === 'lecture') lecture += record.minutes;
      if (record.type === 'self') self += record.minutes;
      if (record.focus !== null && record.focus !== undefined && record.minutes > 0) {
        measuredMinutes += record.minutes;
        weightedFocus += record.focus * record.minutes;
      }
    }

    return {
      date,
      lecture,
      self,
      total: lecture + self,
      focus: measuredMinutes > 0 ? weightedFocus / measuredMinutes : null
    };
  }

  function aggregatePeriod(records, period) {
    const days = [];
    const cursor = parseDate(period.start);
    const end = parseDate(period.end);
    const recordedDates = new Set(records.map((record) => record.date));

    // Weekdays remain visible even when empty. Weekend dates are included only
    // when they have a record, including the optional month-opening period.
    while (cursor <= end) {
      const key = dateKey(cursor);
      if ((cursor.getDay() !== 0 && cursor.getDay() !== 6) || recordedDates.has(key)) {
        days.push(aggregateDay(records, key));
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const lecture = days.reduce((sum, day) => sum + day.lecture, 0);
    const self = days.reduce((sum, day) => sum + day.self, 0);
    const measuredDays = days.filter((day) => day.focus !== null);
    const bestDay = measuredDays.reduce((best, day) => {
      if (!best || day.focus > best.focus || (day.focus === best.focus && day.total > best.total)) return day;
      return best;
    }, null);

    return {
      days,
      total: lecture + self,
      lecture,
      self,
      focus: measuredDays.length ? measuredDays.reduce((sum, day) => sum + day.focus, 0) / measuredDays.length : null,
      activeDays: days.filter((day) => day.total > 0).length,
      bestDay
    };
  }

  const api = { seedRecords, dateKey, formatMinutes, getPeriods, aggregateDay, aggregatePeriod };
  root.FocusData = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
