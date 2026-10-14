import type { Achievement, AchievementDefinition, Completion } from './types';
import { dayNumber, localDateKey } from './localDates';
import { completedHistory } from './history';
import { ROUTINES } from './config';

export const ACHIEVEMENT_XP = 100;
export const FIRST_WORKOUT_XP = 30;
export const achievementXp = (id: string) => id === 'first-workout' ? FIRST_WORKOUT_XP : ACHIEVEMENT_XP;

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  { id: 'first-workout', title: 'First Step', description: 'Your new routine starts here.', criterion: 'Complete your first workout.', metric: 'sessions', target: 1 },
  { id: 'streak-3', title: 'Finding Your Rhythm', description: 'Three days of making time for yourself.', criterion: 'Work out on 3 consecutive days.', metric: 'bestStreak', target: 3 },
  { id: 'streak-7', title: 'A Week of Care', description: 'A whole week of showing up.', criterion: 'Work out on 7 consecutive days.', metric: 'bestStreak', target: 7 },
  { id: 'sessions-10', title: 'Ten and Growing', description: 'Ten moments of care, and room for more.', criterion: 'Complete 10 workouts.', metric: 'sessions', target: 10 },
  { id: 'sessions-25', title: 'Making It a Habit', description: 'Twenty-five moments of care.', criterion: 'Complete 25 workouts.', metric: 'sessions', target: 25 },
  { id: 'active-days-30', title: 'Thirty Days of Care', description: 'A routine you keep coming back to.', criterion: 'Work out on 30 different days. They do not need to be consecutive.', metric: 'activeDays', target: 30 },
  { id: 'hands-first', title: 'A Helping Hand', description: 'Your first moment of care for your hands.', criterion: 'Complete your first hands workout.', metric: 'sessions', target: 1, routineId: 'hands-level-1' },
  { id: 'hands-five', title: 'High Five', description: 'Five gentle resets for your hands and wrists.', criterion: 'Complete 5 hands workouts.', metric: 'sessions', target: 5, routineId: 'hands-level-1' },
  { id: 'hands-ten', title: 'Helping Hands', description: 'Ten moments of care for your hands.', criterion: 'Complete 10 hands workouts.', metric: 'sessions', target: 10, routineId: 'hands-level-1' },
  { id: 'hands-days-7', title: 'A Hand Habit', description: 'Make room for your hands on seven different days.', criterion: 'Complete hands workouts on 7 different days. They do not need to be consecutive.', metric: 'activeDays', target: 7, routineId: 'hands-level-1' },
  { id: 'eyes-three-day', title: 'Eyes on Three', description: 'Three gentle screen breaks in one day.', criterion: 'Complete Eye Gym 3 times in one day.', metric: 'dailySessions', target: 3, family: 'eyes' },
  { id: 'eyes-five-days', title: 'Five Days of Focus', description: 'Five days of making room for your eyes.', criterion: 'Complete Eye Gym 3 times a day for 5 consecutive days.', metric: 'threeSessionStreak', target: 5, family: 'eyes' },
  { id: 'night-unwind', title: 'Time to Unwind', description: 'A gentle stretch for the second half of your day.', criterion: 'Complete either Night Stretch level between noon and midnight, in your local time.', metric: 'afternoonSessions', target: 1, family: 'night' },
  { id: 'all-three-one-day', title: 'Full Circle', description: 'Care for your neck, hands and eyes in one day.', criterion: 'Complete Neck, Hands and Eye Gym in one day.', metric: 'familiesToday', target: 3 },
];

type Values = Record<AchievementDefinition['metric'], number>;
type Scope = { values: Values; dates: Set<string>; dailyCounts: Map<string, number>; previousDay: number | null; consecutive: number; previousTripleDay: number | null; tripleConsecutive: number };
const newScope = (): Scope => ({ values: { sessions: 0, bestStreak: 0, activeDays: 0, dailySessions: 0, threeSessionStreak: 0, familiesToday: 0, afternoonSessions: 0 }, dates: new Set(), dailyCounts: new Map(), previousDay: null, consecutive: 0, previousTripleDay: null, tripleConsecutive: 0 });
const scopeKey = (definition: AchievementDefinition) => definition.routineId ? `routine:${definition.routineId}` : definition.family ? `family:${definition.family}` : 'all';

/** Badges and their award dates are derived from canonical completed history. */
export function getAchievements(records: Completion[], now = new Date()): Achievement[] {
  const ordered = completedHistory(records, now);
  const scopes = new Map<string, Scope>();
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    const scope = scopeKey(definition);
    if (!scopes.has(scope)) scopes.set(scope, newScope());
  }
  const unlocks = new Map<string, string>();
  const familiesByDay = new Map<string, Set<string>>();
  for (const record of ordered) {
    const date = localDateKey(new Date(record.completedAt));
    const family = ROUTINES.find(routine => routine.id === record.routineId)?.family;
    if (family && ['neck', 'hands', 'eyes'].includes(family)) {
      const families = familiesByDay.get(date) ?? new Set<string>();
      families.add(family); familiesByDay.set(date, families);
    }
    for (const [scope, state] of scopes) {
      if (scope.startsWith('routine:') && scope !== `routine:${record.routineId}`) continue;
      if (scope.startsWith('family:') && scope !== `family:${family}`) continue;
      state.values.sessions++;
      if (new Date(record.completedAt).getHours() >= 12) state.values.afternoonSessions++;
      const dailyCount = (state.dailyCounts.get(date) ?? 0) + 1;
      state.dailyCounts.set(date, dailyCount);
      state.values.dailySessions = Math.max(state.values.dailySessions, dailyCount);
      if (scope === 'all') state.values.familiesToday = Math.max(state.values.familiesToday, familiesByDay.get(date)?.size ?? 0);
      if (dailyCount === 3) {
        const day = dayNumber(date);
        state.tripleConsecutive = state.previousTripleDay !== null && day === state.previousTripleDay + 1 ? state.tripleConsecutive + 1 : 1;
        state.previousTripleDay = day;
        state.values.threeSessionStreak = Math.max(state.values.threeSessionStreak, state.tripleConsecutive);
      }
      if (!state.dates.has(date)) {
        const day = dayNumber(date);
        state.consecutive = state.previousDay !== null && day === state.previousDay + 1 ? state.consecutive + 1 : 1;
        state.previousDay = day;
        state.dates.add(date); state.values.activeDays = state.dates.size;
        state.values.bestStreak = Math.max(state.values.bestStreak, state.consecutive);
      }
    }
    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      const values = scopes.get(scopeKey(definition))!.values;
      if (!unlocks.has(definition.id) && values[definition.metric] >= definition.target) unlocks.set(definition.id, record.completedAt);
    }
  }
  return ACHIEVEMENT_DEFINITIONS.map(definition => {
    const values = scopes.get(scopeKey(definition))!.values;
    const progress = Math.min(definition.target, values[definition.metric]);
    return { ...definition, progress, progressPercent: Math.round(progress / definition.target * 100), unlocked: unlocks.has(definition.id), unlockedAt: unlocks.get(definition.id) ?? null };
  });
}
