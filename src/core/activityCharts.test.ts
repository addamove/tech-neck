import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITY_CHART_THRESHOLD, getActivityCharts } from './activityCharts';
import { DEFAULT_ROUTINE } from './config';
import { getStats } from './stats';
import type { Completion } from './types';

function record(id: string, completedAt: Date): Completion {
  return { id, routineId: DEFAULT_ROUTINE.id, startedAt: new Date(completedAt.getTime() - 525000).toISOString(), completedAt: completedAt.toISOString(), elapsedMs: 525000, xp: 10, skippedExerciseIds: [], completedExerciseIds: DEFAULT_ROUTINE.exercises.map(exercise => exercise.id) };
}
const sum = (bins: { count: number }[]) => bins.reduce((total, bin) => total + bin.count, 0);

test('charts unlock at 100 total XP and retain every explicit zero bin', () => {
  const now = new Date(2026, 9, 8, 12);
  const records = Array.from({ length: 10 }, (_, index) => record(`workout-${index}`, new Date(2026, 9, 7, 8, index)));
  for (const count of [0, 1, 9, 10]) {
    const charts = getActivityCharts(records.slice(0, count), now);
    assert.equal(charts.eligible, count > 0);
    assert.equal(charts.totalSessions, count);
    assert.equal(charts.totalXp, getStats(records.slice(0, count), now).totalXp);
    assert.equal(charts.remainingToUnlock, count === 0 ? 100 : 0);
    assert.deepEqual(charts.weekdays.map(bin => bin.label), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    assert.deepEqual(charts.weekdays.map(bin => bin.weekday), [1, 2, 3, 4, 5, 6, 7]);
    assert.equal(charts.hours.length, 24);
    assert.equal(charts.hours[0].label, '00:00'); assert.equal(charts.hours[23].label, '23:00');
    assert.equal(sum(charts.weekdays), count); assert.equal(sum(charts.hours), count);
    assert.equal(charts.weekdays[2].count, count); assert.equal(charts.hours[8].count, count);
    assert.ok(charts.hours.filter(bin => bin.hour !== 8).every(bin => bin.count === 0));
  }
  assert.equal(ACTIVITY_CHART_THRESHOLD, 100);
  assert.deepEqual(getActivityCharts(records.slice(0, 1), now).xpTimeline, [{ date: '2026-10-07', earnedXp: 110, totalXp: 110 }]);
});
test('chart eligibility and XP history ignore duplicate IDs and future completions', () => {
  const now = new Date(2026, 9, 8, 12);
  const past = Array.from({ length: 9 }, (_, index) => record(`past-${index}`, new Date(2026, 9, 7, 8, index)));
  const future = record('future', new Date(now.getTime() + 1000));
  const records = [...past, past[0], future];
  assert.equal(getActivityCharts([future], now).eligible, false);
  const before = getActivityCharts(records, now);
  assert.equal(before.eligible, true); assert.equal(before.totalSessions, 9);
  assert.equal(before.totalSessions, getStats(records, now).totalSessions);
  assert.equal(before.totalXp, getStats(records, now).totalXp);
  const after = getActivityCharts(records, new Date(now.getTime() + 1000));
  assert.equal(after.eligible, true); assert.equal(after.totalSessions, 10);
  assert.ok(after.totalXp > before.totalXp);
  assert.equal(sum(after.weekdays), 10); assert.equal(sum(after.hours), 10);
  assert.deepEqual(getActivityCharts(records.slice().reverse(), now), before);
});
test('cumulative XP groups awards by local day and stays flat across days without workouts', () => {
  const records = [
    record('first', new Date(2026, 9, 5, 12)),
    record('second', new Date(2026, 9, 5, 14)),
    record('third', new Date(2026, 9, 8, 12)),
  ];
  const charts = getActivityCharts(records, new Date(2026, 9, 13, 12));
  assert.equal(charts.asOfDate, '2026-10-13');
  assert.deepEqual(charts.xpTimeline, [
    { date: '2026-10-05', earnedXp: 120, totalXp: 120 },
    { date: '2026-10-08', earnedXp: 10, totalXp: 130 },
  ]);
  assert.equal(charts.totalXp, 130);
  assert.equal(charts.totalXp, getStats(records, new Date(2026, 9, 13, 12)).totalXp);
});
test('weekday and hour both use local completedAt and can be recalculated when the timezone changes', () => {
  const oldTimezone = process.env.TZ;
  const completion = record('timezone', new Date('2026-10-05T23:30:00.000Z'));
  completion.startedAt = '2026-10-04T12:00:00.000Z'; // A saved workout started on a different day.
  try {
    process.env.TZ = 'UTC';
    const utc = getActivityCharts([completion], new Date('2026-10-07T12:00:00.000Z'));
    assert.equal(utc.weekdays[0].count, 1); assert.equal(utc.hours[23].count, 1);
    process.env.TZ = 'Pacific/Kiritimati';
    const local = getActivityCharts([completion], new Date('2026-10-07T12:00:00.000Z'));
    assert.equal(local.weekdays[1].count, 1); assert.equal(local.hours[13].count, 1);
    assert.equal(local.weekdays[0].count, 0); assert.equal(local.hours[23].count, 0);
    assert.equal(sum(local.weekdays), 1); assert.equal(sum(local.hours), 1);
  } finally {
    if (oldTimezone === undefined) delete process.env.TZ; else process.env.TZ = oldTimezone;
  }
});
test('midnight belongs to hour zero and repeated DST hours count separate workouts without invented interpolation', () => {
  const oldTimezone = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    const records = [
      record('midnight', new Date('2026-11-01T04:00:00.000Z')),
      record('first-hour', new Date('2026-11-01T05:30:00.000Z')),
      record('repeated-hour', new Date('2026-11-01T06:30:00.000Z')),
    ];
    const charts = getActivityCharts(records, new Date('2026-11-02T12:00:00.000Z'));
    assert.equal(charts.weekdays[6].count, 3); assert.equal(charts.hours[0].count, 1); assert.equal(charts.hours[1].count, 2);
    assert.ok(charts.hours.slice(2).every(bin => bin.count === 0));
    assert.equal(sum(charts.hours), records.length); assert.equal(sum(charts.weekdays), records.length);
  } finally {
    if (oldTimezone === undefined) delete process.env.TZ; else process.env.TZ = oldTimezone;
  }
});
