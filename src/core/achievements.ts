import type { Achievement, AchievementDefinition, Completion } from './types';
import { dayNumber, localDateKey } from './stats';
import { completedHistory } from './history';

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  { id: 'first-workout', title: 'First Step', description: 'Your new routine starts here.', criterion: 'Complete your first workout.', metric: 'sessions', target: 1 },
  { id: 'streak-3', title: 'Finding Your Rhythm', description: 'Three days of making time for yourself.', criterion: 'Work out on 3 consecutive days.', metric: 'bestStreak', target: 3 },
  { id: 'streak-7', title: 'A Week of Care', description: 'A whole week of showing up.', criterion: 'Work out on 7 consecutive days.', metric: 'bestStreak', target: 7 },
  { id: 'sessions-10', title: 'Ten and Growing', description: 'Ten workouts unlock your weekday and time-of-day activity charts.', criterion: 'Complete 10 workouts.', metric: 'sessions', target: 10 },
  { id: 'sessions-25', title: 'Making It a Habit', description: 'Twenty-five moments of care.', criterion: 'Complete 25 workouts.', metric: 'sessions', target: 25 },
  { id: 'active-days-30', title: 'Thirty Days of Care', description: 'A routine you keep coming back to.', criterion: 'Work out on 30 different days. They do not need to be consecutive.', metric: 'activeDays', target: 30 },
];

/** Derived from history only. Badges add no XP and never require persisted flags. */
export function getAchievements(records: Completion[], now = new Date()): Achievement[] {
  const ordered = completedHistory(records, now);
  const values = { sessions: 0, bestStreak: 0, activeDays: 0 };
  const dates = new Set<string>();
  const unlocks = new Map<string, string>();
  let previousDay: number | null = null;
  let consecutive = 0;
  for (const record of ordered) {
    values.sessions++;
    const date = localDateKey(new Date(record.completedAt));
    if (!dates.has(date)) {
      const day = dayNumber(date);
      consecutive = previousDay !== null && day === previousDay + 1 ? consecutive + 1 : 1;
      previousDay = day;
      dates.add(date); values.activeDays = dates.size;
      values.bestStreak = Math.max(values.bestStreak, consecutive);
    }
    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      if (!unlocks.has(definition.id) && values[definition.metric] >= definition.target) unlocks.set(definition.id, record.completedAt);
    }
  }
  return ACHIEVEMENT_DEFINITIONS.map(definition => {
    const progress = Math.min(definition.target, values[definition.metric]);
    return { ...definition, progress, progressPercent: Math.round(progress / definition.target * 100), unlocked: unlocks.has(definition.id), unlockedAt: unlocks.get(definition.id) ?? null };
  });
}
