import type { Routine } from './types';

export const routineFamily = (routine: Routine): string => routine.family ?? 'neck';

/** Discard stale/mismatched memories; the current selection always wins. */
export function rememberedRoutines(routines: Routine[], selectedId: string, value?: unknown): Record<string, string> {
  const memory: Record<string, string> = {};
  const supplied = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  for (const routine of routines) {
    const family = routineFamily(routine);
    if (memory[family]) continue;
    const candidate = routines.find(item => item.id === supplied[family] && routineFamily(item) === family);
    memory[family] = candidate?.id ?? routine.id;
  }
  const selected = routines.find(item => item.id === selectedId);
  if (selected) memory[routineFamily(selected)] = selected.id;
  return memory;
}

export function familyRoutineIds(routines: Routine[], selectedId: string, memory?: unknown): string[] {
  return Object.values(rememberedRoutines(routines, selectedId, memory));
}

/** Seed a legacy selection before recording a move to another family. */
export function rememberRoutineSelection(routines: Routine[], previousId: string, selectedId: string, memory?: unknown): Record<string, string> {
  return rememberedRoutines(routines, selectedId, rememberedRoutines(routines, previousId, memory));
}
