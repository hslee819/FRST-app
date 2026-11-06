(function (root) {
  'use strict';

  const D = root.FocusData || (typeof module !== 'undefined' && module.exports ? require('./app-data.js') : null);
  if (!D) throw new Error('FocusData must load before FocusComparisonData.');

  const average = (values) => {
    const measured = values.filter(Number.isFinite);
    return measured.length ? measured.reduce((sum, value) => sum + value, 0) / measured.length : null;
  };

  // The original comparison screenshot is the calendar week Sep 28–Oct 2,
  // not the Oct 5–9 period called "1주" in the earlier personal dashboard.
  // Only these observed class cells support a fallback personal measurement.
  const referenceDates = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];
  const referenceRows = [
    { label: '3교시', values: [8, 8, 8, 'class', 8] },
    { label: '4교시', values: ['class', 'class', 8, 'class', 8] },
    { label: '5교시', values: [7.5, 7.5, 'class', 7.5, 7.5] },
    { label: '6교시', values: [7.5, 7.5, 7.5, 8, 'class'] },
  ];
  const referencePersonal = new Map(referenceDates.map((date, index) => [
    date, average(referenceRows.map((row) => row.values[index])),
  ]));

  // Cohort values are explicitly illustrative reference samples, not a live
  // cohort or a calculation of the user's percentile. Per-day values were not
  // numerically given in the screenshot. The first five samples reproduce its
  // exact weekly cohort means 8.07 and 8.23; later samples approximate its trend.
  // No peer samples are supplied outside Sep 28–Oct 30, 2026 weekdays.
  const cohort = new Map();
  const firstTop50 = [8.10, 8.05, 8.08, 8.06, 8.06];
  const firstTop20 = [8.28, 8.20, 8.24, 8.25, 8.18];
  referenceDates.forEach((date, index) => {
    cohort.set(date, { top50: firstTop50[index], top20: firstTop20[index] });
  });
  const normalTop50 = [8.12, 8.10, 8.08, 8.11, 8.09];
  const normalTop20 = [8.28, 8.24, 8.26, 8.30, 8.27];
  for (let day = 5; day <= 30; day++) {
    const date = new Date(2026, 9, day, 12);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue;
    const low = day === 5 || day === 9;
    cohort.set(D.dateKey(date), {
      top50: low ? 4.5 : normalTop50[weekday - 1],
      top20: low ? 4.5 : normalTop20[weekday - 1],
    });
  }

  function getPeriods(year, month) {
    const first = new Date(year, month, 1, 12);
    const last = new Date(year, month + 1, 0, 12);
    const monday = new Date(first);
    monday.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const periods = [];
    let week = 1;
    while (monday <= last) {
      const end = new Date(monday);
      end.setDate(end.getDate() + 6);
      const dates = Array.from({ length: 5 }, (_, offset) => {
        const date = new Date(monday);
        date.setDate(date.getDate() + offset);
        return D.dateKey(date);
      });
      const startKey = D.dateKey(monday);
      periods.push({ id: startKey, start: startKey, end: D.dateKey(end), label: `${week++}주`, dates });
      monday.setDate(monday.getDate() + 7);
    }
    return periods;
  }

  function recordedPersonal(records, date) {
    const value = D.aggregateDay(records, date).focus;
    return Number.isFinite(value) ? value : null;
  }

  function getDay(records, date) {
    const measured = recordedPersonal(records, date);
    const fallback = referencePersonal.get(date);
    const personal = measured !== null ? measured : (Number.isFinite(fallback) ? fallback : null);
    const peers = cohort.get(date);
    return {
      date,
      personal,
      top50: peers ? peers.top50 : null,
      top20: peers ? peers.top20 : null,
      personalSource: measured !== null ? 'record' : (personal !== null ? 'reference' : null),
    };
  }

  function getSummary(records, dates) {
    const days = [...new Set(dates)].map((date) => getDay(records, date));
    return {
      days,
      personal: average(days.map((day) => day.personal)),
      top50: average(days.map((day) => day.top50)),
      top20: average(days.map((day) => day.top20)),
      personalCount: days.filter((day) => day.personal !== null).length,
      cohortCount: days.filter((day) => day.top50 !== null && day.top20 !== null).length,
    };
  }

  function getDetail(records, period) {
    const dates = period.dates;
    const hasMeasurement = dates.map((date) => recordedPersonal(records, date) !== null);
    const referenceIndices = dates.map((date) => referenceDates.indexOf(date));
    const rows = referenceRows.map((referenceRow) => {
      const values = dates.map((date, index) => {
        const referenceIndex = referenceIndices[index];
        // Daily records have no class metadata. Do not silently assign their
        // personal score to a class or mix them with fallback class scores.
        return hasMeasurement[index] || referenceIndex < 0 ? null : referenceRow.values[referenceIndex];
      });
      return { label: referenceRow.label, values, personal: average(values), top50: null, top20: null };
    });
    return {
      rows,
      hasReference: referenceIndices.some((index, column) => index >= 0 && !hasMeasurement[column]),
      hasUnassignedRecords: hasMeasurement.some(Boolean),
    };
  }

  const api = { getPeriods, getDay, getSummary, getDetail };
  root.FocusComparisonData = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
