import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROUTINE } from './config';
import { getAchievements } from './achievements';
import { getStats, localDateKey } from './stats';
import { advanceSession, completionFor, createSession, recordCompletion } from './engine';
import { freshData, loadData, parseImport, saveData } from './persistence';
import type { Completion } from './types';
const auditNow = new Date(2027, 0, 1);

function completed(date: Date, id: string): Completion {
  return { id, routineId: DEFAULT_ROUTINE.id, startedAt: new Date(date.getTime() - 600000).toISOString(), completedAt: date.toISOString(), elapsedMs: 600000, xp: 10, skippedExerciseIds: [], completedExerciseIds: DEFAULT_ROUTINE.exercises.map(exercise => exercise.id) };
}
function days(start: Date, count: number, step = 1): Completion[] {
  return Array.from({ length: count }, (_, index) => completed(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index * step, 12), `day-${index}`));
}
test('empty history has six locked badges with zero progress and zero statistics', () => {
  const badges = getAchievements([]);
  assert.equal(badges.length, 6);
  assert.ok(badges.every(badge => !badge.unlocked && badge.unlockedAt === null && badge.progress === 0 && badge.progressPercent === 0));
  const stats = getStats([]);
  assert.equal(stats.totalXp, 0); assert.equal(stats.currentStreak, 0); assert.equal(stats.bestStreak, 0); assert.equal(stats.activeDays, 0);
});
test('thresholds unlock precisely, progress is capped, and several same-day sessions do not extend a streak', () => {
  const sameDay = Array.from({ length: 26 }, (_, i) => completed(new Date(2026, 9, 7, 8, i), `same-${i}`));
  const below = getAchievements(sameDay.slice(0, 9), auditNow).find(badge => badge.id === 'sessions-10')!;
  assert.equal(below.progress, 9); assert.equal(below.unlocked, false);
  const ten = getAchievements(sameDay.slice(0, 10), auditNow).find(badge => badge.id === 'sessions-10')!;
  assert.equal(ten.unlockedAt, sameDay[9].completedAt);
  const badges = getAchievements(sameDay, auditNow);
  assert.equal(badges.find(badge => badge.id === 'sessions-25')?.progress, 25);
  assert.equal(badges.find(badge => badge.id === 'sessions-25')?.unlockedAt, sameDay[24].completedAt);
  assert.equal(badges.find(badge => badge.id === 'streak-3')?.progress, 1);
  assert.equal(badges.find(badge => badge.id === 'active-days-30')?.progress, 1);
  assert.equal(getStats(sameDay, new Date(2026, 9, 7, 12)).totalXp, 260); // Achievements never add bonus XP.
});
test('earned streak badge remains earned after a break; first unlock dates are stable under history order', () => {
  const old = days(new Date(2026, 8, 18), 7);
  const recent = days(new Date(2026, 9, 5), 3).map(record => ({ ...record, id: `recent-${record.id}` }));
  const records = [...recent, ...old].reverse();
  const originalOrder = records.map(record => record.id);
  const badges = getAchievements(records, auditNow);
  assert.deepEqual(records.map(record => record.id), originalOrder);
  assert.equal(badges.find(badge => badge.id === 'streak-3')?.unlockedAt, old[2].completedAt);
  assert.equal(badges.find(badge => badge.id === 'streak-7')?.unlockedAt, old[6].completedAt);
  assert.equal(badges.find(badge => badge.id === 'sessions-10')?.unlockedAt, recent[2].completedAt);
  const stats = getStats(records, new Date(2026, 9, 7, 18));
  assert.equal(stats.currentStreak, 3); assert.equal(stats.bestStreak, 7); assert.equal(stats.activeDays, 10);
});
test('thirty active days need not be consecutive, and duplicates do not advance badge progress', () => {
  const records = days(new Date(2026, 0, 1), 30, 2);
  assert.equal(getAchievements(records.slice(0, 29), auditNow).find(badge => badge.id === 'active-days-30')?.unlocked, false);
  const badge = getAchievements([...records, records[0]], auditNow).find(item => item.id === 'active-days-30')!;
  assert.equal(badge.unlockedAt, records[29].completedAt); assert.equal(badge.progress, 30);
  assert.equal(getAchievements(records, auditNow).find(item => item.id === 'streak-3')?.progress, 1);
});
test('calendar grouping uses local midnight even when its UTC date differs', () => {
  const midnight = new Date(2026, 9, 7, 0, 1);
  const justBefore = new Date(2026, 9, 6, 23, 59);
  const records = [completed(midnight, 'after'), completed(justBefore, 'before')];
  const stats = getStats(records, new Date(2026, 9, 7, 12));
  assert.equal(stats.calendar.find(day => day.date === '2026-10-06')?.count, 1);
  assert.equal(stats.calendar.find(day => day.date === '2026-10-07')?.count, 1);
  assert.equal(stats.calendar.find(day => day.isToday)?.date, localDateKey(midnight));
  assert.equal(stats.currentStreak, 2);
});
test('Monday week boundary, rolling seven days and calendar month count differ correctly across New Year', () => {
  const now = new Date(2026, 0, 5, 12); // Monday.
  const records = [completed(new Date(2025, 11, 31, 23, 59), 'december'), completed(new Date(2026, 0, 4, 23, 59), 'sunday'), completed(new Date(2026, 0, 5, 0, 1), 'monday')];
  const stats = getStats(records, now);
  assert.equal(stats.thisWeek, 1); assert.equal(stats.lastSevenDays, 3); assert.equal(stats.thisMonth, 2);
  const previousMonth = getStats(records, now, new Date(2025, 11, 1));
  assert.equal(previousMonth.calendar.length, 31); assert.equal(previousMonth.calendar.at(-1)?.count, 1);
  assert.equal(previousMonth.calendar.some(day => day.isToday), false);
});
test('leap-day calendars and DST transitions preserve consecutive local-day streaks', () => {
  const leap = days(new Date(2024, 1, 28), 3);
  const stats = getStats(leap, new Date(2024, 2, 1, 18), new Date(2024, 1, 1));
  assert.equal(stats.calendar.length, 29); assert.equal(stats.calendar.at(-1)?.count, 1); assert.equal(stats.bestStreak, 3);
  const spring = days(new Date(2026, 2, 6), 7);
  const autumn = days(new Date(2026, 9, 30), 7);
  for (const records of [spring, autumn]) {
    assert.equal(getStats(records, new Date(records.at(-1)!.completedAt)).currentStreak, 7);
    assert.equal(getAchievements(records, new Date(records.at(-1)!.completedAt)).find(badge => badge.id === 'streak-7')?.unlocked, true);
  }
});
test('moving the calendar clock past a missed day clears only current streak and retains earned badges', () => {
  const records = days(new Date(2026, 9, 5), 3);
  assert.equal(getStats(records, new Date(2026, 9, 8, 23, 59)).currentStreak, 3);
  assert.equal(getStats(records, new Date(2026, 9, 9, 0, 0)).currentStreak, 0);
  assert.equal(getStats(records, new Date(2026, 9, 9)).bestStreak, 3);
  assert.equal(getAchievements(records, auditNow).find(badge => badge.id === 'streak-3')?.unlocked, true);
});
test('completed session storage/export/import round trip preserves XP and achievements without a duplicate award', () => {
  const started = new Date(2026, 9, 7, 12);
  const session = advanceSession(createSession(DEFAULT_ROUTINE, 'round-trip', started), 600000, DEFAULT_ROUTINE);
  const completion = completionFor(session, DEFAULT_ROUTINE, new Date(started.getTime() + 600000));
  const data = { ...freshData(), session, completions: [completion] };
  let stored = '';
  saveData({ setItem: (_key, value) => { stored = value; } }, data);
  const loaded = loadData({ getItem: () => stored });
  assert.equal(loaded.error, null); assert.deepEqual(parseImport(stored), data);
  assert.equal(loaded.data.session?.paused, true);
  const records = recordCompletion(loaded.data.completions, completion);
  assert.equal(records.length, 1); assert.equal(getStats(records, new Date(completion.completedAt)).totalXp, 10);
  assert.deepEqual(getAchievements(records, auditNow), getAchievements(data.completions, auditNow));
});
test('unfinished or unrelated workouts cannot create an XP completion record', () => {
  const prep = createSession(DEFAULT_ROUTINE, 'no-premature-award');
  assert.throws(() => completionFor(prep, DEFAULT_ROUTINE), /Only a completed/);
  const active = advanceSession(prep, 21000, DEFAULT_ROUTINE);
  assert.throws(() => completionFor(active, DEFAULT_ROUTINE), /Only a completed/);
  const complete = advanceSession(prep, 600000, DEFAULT_ROUTINE);
  assert.throws(() => completionFor(complete, { ...DEFAULT_ROUTINE, id: 'wrong-routine' }), /does not match/);
  assert.equal(completionFor(complete, DEFAULT_ROUTINE).xp, 10);
});
test('future imported dates stay stored but do not count as completed until their timestamp; public derivations deduplicate IDs', () => {
  const now = new Date(2026, 9, 7, 12);
  const past = completed(new Date(2026, 9, 7, 11), 'past');
  const future = completed(new Date(2026, 9, 7, 13), 'future');
  const tomorrow = completed(new Date(2026, 9, 8, 12), 'tomorrow');
  const imported = parseImport(JSON.stringify({ ...freshData(), completions: [past, future, tomorrow] }));
  assert.equal(imported.completions.length, 3);
  assert.equal(getStats([...imported.completions, past], now).totalSessions, 1);
  assert.equal(getStats(imported.completions, now).totalXp, 10);
  assert.equal(getAchievements(imported.completions, now).find(badge => badge.id === 'sessions-10')?.progress, 1);
  assert.equal(getStats(imported.completions, new Date(2026, 9, 7, 13)).totalSessions, 2);
  assert.equal(getStats(imported.completions, new Date(2026, 9, 8, 12)).activeDays, 2);
});
test('invalid completion dates, calendar overflows, mismatched sessions and pre-start completions reject imports', () => {
  const record = completed(new Date(2026, 9, 7, 12), 'invalid-date');
  const base = freshData();
  for (const invalid of ['2026-02-29T12:00:00.000Z', '2024-02-30T12:00:00.000Z', '2026-13-07T12:00:00.000Z', '2026-10-07T25:00:00.000Z', '2026-10-07T12:00:00+03:00']) {
    assert.throws(() => parseImport(JSON.stringify({ ...base, completions: [{ ...record, completedAt: invalid }] })), /ISO date/);
  }
  assert.throws(() => parseImport(JSON.stringify({ ...base, completions: [{ ...record, completedAt: '2026-10-06T12:00:00.000Z' }] })), /precedes/);
  const active = createSession(DEFAULT_ROUTINE, record.id, new Date(record.startedAt));
  assert.throws(() => parseImport(JSON.stringify({ ...base, session: active, completions: [record] })), /already been completed/);
});
