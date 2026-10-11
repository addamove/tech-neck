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
  { id: 'hands-first', title: 'A Helping Hand', description: 'Your first moment of care for your hands.', criterion: 'Complete your first hands workout.', metric: 'sessions', target: 1, routineId: 'hands-level-1' },
  { id: 'hands-five', title: 'High Five', description: 'Five gentle resets for your hands and wrists.', criterion: 'Complete 5 hands workouts.', metric: 'sessions', target: 5, routineId: 'hands-level-1' },
  { id: 'hands-ten', title: 'Helping Hands', description: 'Ten moments of care for your hands.', criterion: 'Complete 10 hands workouts.', metric: 'sessions', target: 10, routineId: 'hands-level-1' },
  { id: 'hands-days-7', title: 'A Hand Habit', description: 'Make room for your hands on seven different days.', criterion: 'Complete hands workouts on 7 different days. They do not need to be consecutive.', metric: 'activeDays', target: 7, routineId: 'hands-level-1' },
];

/** Derived from history only. Badges add no XP and never require persisted flags. */
export function getAchievements(records: Completion[], now = new Date()): Achievement[] {
  const ordered = completedHistory(records, now);
  const scopes = new Map<string, { values: { sessions: number; bestStreak: number; activeDays: number }; dates: Set<string>; previousDay: number | null; consecutive: number }>();
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    const scope = definition.routineId ?? '';
    if (!scopes.has(scope)) scopes.set(scope, { values: { sessions: 0, bestStreak: 0, activeDays: 0 }, dates: new Set(), previousDay: null, consecutive: 0 });
  }
  const unlocks = new Map<string, string>();
  for (const record of ordered) {
    const date = localDateKey(new Date(record.completedAt));
    for (const [scope, state] of scopes) {
      if (scope && scope !== record.routineId) continue;
      state.values.sessions++;
      if (!state.dates.has(date)) {
        const day = dayNumber(date);
        state.consecutive = state.previousDay !== null && day === state.previousDay + 1 ? state.consecutive + 1 : 1;
        state.previousDay = day;
        state.dates.add(date); state.values.activeDays = state.dates.size;
        state.values.bestStreak = Math.max(state.values.bestStreak, state.consecutive);
      }
    }
    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      const values = scopes.get(definition.routineId ?? '')!.values;
      if (!unlocks.has(definition.id) && values[definition.metric] >= definition.target) unlocks.set(definition.id, record.completedAt);
    }
  }
  return ACHIEVEMENT_DEFINITIONS.map(definition => {
    const values = scopes.get(definition.routineId ?? '')!.values;
    const progress = Math.min(definition.target, values[definition.metric]);
    return { ...definition, progress, progressPercent: Math.round(progress / definition.target * 100), unlocked: unlocks.has(definition.id), unlockedAt: unlocks.get(definition.id) ?? null };
  });
}
