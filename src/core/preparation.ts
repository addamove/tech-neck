import type { PreparationSeconds, Routine } from './types';

export const PREPARATION_OPTIONS = [5, 10, 20] as const;
export const DEFAULT_PREPARATION_SECONDS: PreparationSeconds = 20;
export function isPreparationSeconds(value: unknown): value is PreparationSeconds {
  return PREPARATION_OPTIONS.some(seconds => seconds === value);
}
export function withPreparation(routine: Routine, seconds?: PreparationSeconds): Routine {
  return seconds === undefined ? routine : {
    ...routine, preparationSeconds: seconds,
    exercises: routine.exercises.map(exercise => ({ ...exercise, prepSeconds: seconds })),
  };
}
