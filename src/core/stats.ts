import type { Completion, WorkoutStats } from './types';
import { completedHistory } from './history';
export function localDateKey(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dayNumber(dateKey: string): number { return Date.parse(`${dateKey}T00:00:00.000Z`) / 86400000; }
function localDay(year: number, month: number, day: number) {
  const date = new Date(0); date.setFullYear(year, month, day); date.setHours(0, 0, 0, 0); return date;
}
function dayOffset(date: Date, offset: number) { return localDay(date.getFullYear(), date.getMonth(), date.getDate() + offset); }
export function getStats(records: Completion[], now = new Date(), month = now): WorkoutStats {
  records = completedHistory(records, now);
  const byDay = new Map<string, Completion[]>();
  for (const item of records) {
    const key = localDateKey(new Date(item.completedAt));
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }
  const today = localDateKey(now);
  const weekStart = dayOffset(now, -((now.getDay() + 6) % 7));
  const sevenStart = dayOffset(now, -6);
  const end = dayOffset(now, 1);
  const monthStart = localDay(now.getFullYear(), now.getMonth(), 1);
  const sortedDays = [...byDay.keys()].map(dayNumber).sort((a, b) => a - b);
  let bestStreak = 0, consecutive = 0, previousDay: number | null = null;
  for (const day of sortedDays) {
    consecutive = previousDay !== null && day === previousDay + 1 ? consecutive + 1 : 1;
    bestStreak = Math.max(bestStreak, consecutive); previousDay = day;
  }
  let streakDate = byDay.has(today) ? dayOffset(now, 0) : dayOffset(now, -1);
  let currentStreak = 0;
  while (byDay.has(localDateKey(streakDate))) { currentStreak++; streakDate = dayOffset(streakDate, -1); }
  const calendar = Array.from({ length: localDay(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => {
    const date = localDateKey(localDay(month.getFullYear(), month.getMonth(), index + 1));
    const entries = byDay.get(date) ?? [];
    return { date, count: entries.length, xp: entries.reduce((sum, entry) => sum + entry.xp, 0), isToday: date === today };
  });
  return { totalSessions: records.length, totalXp: records.reduce((sum, item) => sum + item.xp, 0), thisWeek: records.filter(item => new Date(item.completedAt) >= weekStart && new Date(item.completedAt) < end).length, lastSevenDays: records.filter(item => new Date(item.completedAt) >= sevenStart && new Date(item.completedAt) < end).length, thisMonth: records.filter(item => new Date(item.completedAt) >= monthStart && new Date(item.completedAt) < end).length, currentStreak, bestStreak, activeDays: byDay.size, calendar };
}
