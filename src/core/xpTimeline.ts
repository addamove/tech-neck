import { ACHIEVEMENT_XP, getAchievements } from './achievements';
import { completedHistory } from './history';
import { dayNumber, localDateKey } from './localDates';
import type { Completion } from './types';

export interface XpDay { date: string; earnedXp: number; totalXp: number }

/** One source for both Activity totals and the all-time cumulative XP chart. */
export function getXpTimeline(records: Completion[], now = new Date()): XpDay[] {
  const history = completedHistory(records, now);
  const earnedByDay = new Map<string, number>();
  for (const record of history) {
    const date = localDateKey(new Date(record.completedAt));
    earnedByDay.set(date, (earnedByDay.get(date) ?? 0) + record.xp);
  }
  for (const achievement of getAchievements(history, now)) {
    if (!achievement.unlockedAt) continue;
    const date = localDateKey(new Date(achievement.unlockedAt));
    earnedByDay.set(date, (earnedByDay.get(date) ?? 0) + ACHIEVEMENT_XP);
  }
  let totalXp = 0;
  return [...earnedByDay.entries()]
    .sort(([a], [b]) => dayNumber(a) - dayNumber(b))
    .map(([date, earnedXp]) => ({ date, earnedXp, totalXp: totalXp += earnedXp }));
}
