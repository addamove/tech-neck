import { completedHistory } from './history';
import { getXpTimeline, type XpDay } from './xpTimeline';
import { localDateKey } from './localDates';
import type { Completion } from './types';

export const ACTIVITY_CHART_THRESHOLD = 100;
export interface ActivityCharts {
  eligible: boolean;
  totalSessions: number;
  totalXp: number;
  asOfDate: string;
  remainingToUnlock: number;
  xpTimeline: XpDay[];
  weekdays: { weekday: number; label: string; count: number }[];
  hours: { hour: number; label: string; count: number }[];
}

/** All-time distributions use local completion times, matching Activity's
 * calendar. Saved workouts may have been started days before they are finished.
 * These aggregates are derived; nothing additional is persisted. */
export function getActivityCharts(records: Completion[], now = new Date()): ActivityCharts {
  const history = completedHistory(records, now);
  const xpTimeline = getXpTimeline(history, now);
  const totalXp = xpTimeline.at(-1)?.totalXp ?? 0;
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    .map((label, index) => ({ weekday: index + 1, label, count: 0 }));
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, label: `${String(hour).padStart(2, '0')}:00`, count: 0 }));
  for (const completion of history) {
    const date = new Date(completion.completedAt);
    weekdays[(date.getDay() + 6) % 7].count++;
    hours[date.getHours()].count++;
  }
  return {
    eligible: totalXp >= ACTIVITY_CHART_THRESHOLD,
    totalSessions: history.length,
    totalXp,
    asOfDate: localDateKey(now),
    remainingToUnlock: Math.max(0, ACTIVITY_CHART_THRESHOLD - totalXp),
    xpTimeline,
    weekdays,
    hours,
  };
}
