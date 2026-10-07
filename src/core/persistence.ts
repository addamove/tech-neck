import { DEFAULT_DATA, ROUTINES } from './config';
import type { AppData, Completion, Exercise, Routine, Session } from './types';

export const STORAGE_KEY = 'tech-neck:v1';
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
// Version1 backups used90-second arm exercises. Keep their actual elapsed
// times valid when loading history after the routine is shortened.
const legacyArmIds = new Set(['snow-angel', 'bent-angel', 'arm-lift']);
function maximumWorkSeconds(routine: Routine, exercise: Exercise): number {
  return routine.id === 'level-1' && legacyArmIds.has(exercise.id)
    ? Math.max(90, exercise.durationSeconds) : exercise.durationSeconds;
}
function maximumElapsedMs(routine: Routine): number {
  return routine.exercises.reduce((sum, exercise) => sum + exercise.prepSeconds + maximumWorkSeconds(routine, exercise), 0) * 1000;
}
function fail(message: string): never { throw new Error(`Invalid backup: ${message}`); }
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 160): asserts value is string { if (typeof value !== 'string' || !value.length || value.length > max) fail(`${label} must be a valid string.`); }
function number(value: unknown, label: string, min: number, max: number): asserts value is number { if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(`${label} is outside its allowed range.`); }
function date(value: unknown, label: string): asserts value is string {
  text(value, label, 32);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail(`${label} must be an ISO date.`);
}
function boolean(value: unknown, label: string): asserts value is boolean { if (typeof value !== 'boolean') fail(`${label} must be true or false.`); }
function routineFor(value: unknown) { text(value, 'routineId'); const routine = ROUTINES.find(item => item.id === value); if (!routine) fail('Unknown routine.'); return routine; }
function exerciseIds(value: unknown, label: string, validIds: string[]): string[] {
  if (!Array.isArray(value) || value.length > validIds.length || value.some(id => typeof id !== 'string' || !validIds.includes(id)) || new Set(value).size !== value.length) fail(`${label} contains invalid exercise IDs.`);
  return value as string[];
}
function validateSession(value: unknown): Session {
  const item = object(value, 'session');
  const routine = routineFor(item.routineId);
  text(item.id, 'session.id'); date(item.startedAt, 'session.startedAt');
  if (!['prep', 'active', 'complete'].includes(item.phase as string)) fail('Unknown session phase.');
  number(item.exerciseIndex, 'exerciseIndex', 0, routine.exercises.length - 1);
  if (!Number.isInteger(item.exerciseIndex)) fail('exerciseIndex must be an integer.');
  const exercise = routine.exercises[item.exerciseIndex];
  const maximumPhaseMs = (item.phase === 'prep' ? exercise.prepSeconds : maximumWorkSeconds(routine, exercise)) * 1000;
  number(item.phaseElapsedMs, 'phaseElapsedMs', 0, maximumPhaseMs);
  number(item.elapsedMs, 'elapsedMs', 0, maximumElapsedMs(routine));
  if (item.phaseElapsedMs > item.elapsedMs) fail('Phase elapsed time cannot exceed total time.');
  if (item.phase !== 'complete' && item.phaseElapsedMs >= maximumPhaseMs) fail('Session phase has already ended.');
  boolean(item.paused, 'paused');
  const validIds = routine.exercises.map(ex => ex.id);
  const skipped = exerciseIds(item.skippedExerciseIds, 'skippedExerciseIds', validIds);
  const completed = exerciseIds(item.completedExerciseIds, 'completedExerciseIds', validIds);
  if (skipped.some(id => completed.includes(id))) fail('Exercise cannot be skipped and completed.');
  const progressedIds = [...skipped, ...completed];
  const expectedCount = item.phase === 'complete' ? routine.exercises.length : item.exerciseIndex;
  if (progressedIds.length !== expectedCount || validIds.slice(0, expectedCount).some(id => !progressedIds.includes(id))) fail('Session exercise progress is inconsistent.');
  if (item.phase === 'complete' && (item.exerciseIndex !== routine.exercises.length - 1 || item.phaseElapsedMs !== 0)) fail('Completed session is inconsistent.');
  const session: Session = { id: item.id, routineId: routine.id, startedAt: item.startedAt, phase: item.phase as Session['phase'], exerciseIndex: item.exerciseIndex, phaseElapsedMs: item.phaseElapsedMs, elapsedMs: item.elapsedMs, paused: item.paused, skippedExerciseIds: skipped, completedExerciseIds: completed };
  if (session.phase === 'active' && session.phaseElapsedMs >= exercise.durationSeconds * 1000 && routine.id === 'level-1' && legacyArmIds.has(exercise.id)) {
    // The old session already did the shortened exercise. Preserve the time
    // actually spent and wait at the next preparation without running it.
    return { ...session, phase: 'prep', exerciseIndex: session.exerciseIndex + 1, phaseElapsedMs: 0, paused: true, completedExerciseIds: [...completed, exercise.id] };
  }
  return session;
}
function validateCompletion(value: unknown): Completion {
  const item = object(value, 'completion'); const routine = routineFor(item.routineId);
  text(item.id, 'completion.id'); date(item.startedAt, 'startedAt'); date(item.completedAt, 'completedAt');
  if (Date.parse(item.completedAt) < Date.parse(item.startedAt)) fail('Completion precedes workout start.');
  number(item.elapsedMs, 'elapsedMs', 0, maximumElapsedMs(routine));
  if (item.xp !== routine.xp) fail('Invalid completion XP.');
  const ids = routine.exercises.map(ex => ex.id);
  const skipped = exerciseIds(item.skippedExerciseIds, 'skippedExerciseIds', ids);
  const completed = exerciseIds(item.completedExerciseIds, 'completedExerciseIds', ids);
  if (skipped.some(id => completed.includes(id)) || skipped.length + completed.length !== ids.length) fail('Completion exercise progress is inconsistent.');
  return { id: item.id, routineId: routine.id, startedAt: item.startedAt, completedAt: item.completedAt, elapsedMs: item.elapsedMs, xp: routine.xp, skippedExerciseIds: skipped, completedExerciseIds: completed };
}
export function validateData(value: unknown): AppData {
  const data = object(value, 'backup');
  if (data.format !== 'tech-neck' || data.version !== 1) fail('Unsupported format or version.');
  const settings = object(data.settings, 'settings');
  boolean(settings.voiceEnabled, 'voiceEnabled'); boolean(settings.wakeLockEnabled, 'wakeLockEnabled');
  number(settings.voiceRate, 'voiceRate', 0.5, 2);
  const voiceGender = settings.voiceGender === undefined ? 'female' : settings.voiceGender;
  if (voiceGender !== 'female' && voiceGender !== 'male') fail('voiceGender must be female or male.');
  const illustrationStyle = settings.illustrationStyle === undefined ? 'male' : settings.illustrationStyle;
  if (illustrationStyle !== 'male' && illustrationStyle !== 'female' && illustrationStyle !== 'marker') fail('illustrationStyle must be male, female or marker.');
  const selectedRoutine = routineFor(settings.selectedRoutineId);
  if (!Array.isArray(data.completions) || data.completions.length > 10000) fail('Too many completion records.');
  const completions = data.completions.map(validateCompletion);
  if (new Set(completions.map(item => item.id)).size !== completions.length) fail('Duplicate completion IDs.');
  const session = data.session === null ? null : validateSession(data.session);
  if (session && session.phase !== 'complete' && completions.some(item => item.id === session.id)) fail('Active session has already been completed.');
  if (session?.phase === 'complete') {
    const completion = completions.find(item => item.id === session.id);
    if (!completion || completion.routineId !== session.routineId || completion.startedAt !== session.startedAt || completion.elapsedMs !== session.elapsedMs || JSON.stringify(completion.completedExerciseIds) !== JSON.stringify(session.completedExerciseIds) || JSON.stringify(completion.skippedExerciseIds) !== JSON.stringify(session.skippedExerciseIds)) fail('Completed session has no matching completion record.');
  }
  return { format: 'tech-neck', version: 1, settings: { voiceEnabled: settings.voiceEnabled, voiceRate: settings.voiceRate, voiceGender, illustrationStyle, wakeLockEnabled: settings.wakeLockEnabled, selectedRoutineId: selectedRoutine.id }, completions, session };
}
export function parseImport(textValue: string): AppData {
  if (new TextEncoder().encode(textValue).length > MAX_IMPORT_BYTES) fail('File exceeds the 2 MB limit.');
  let value: unknown;
  try { value = JSON.parse(textValue); } catch { fail('File is not valid JSON.'); }
  return validateData(value);
}
export async function readImport(file: File): Promise<AppData> {
  if (file.size > MAX_IMPORT_BYTES) fail('File exceeds the 2 MB limit.');
  if (!file.name.toLowerCase().endsWith('.json') || (file.type && !['application/json', 'text/json', 'text/plain'].includes(file.type))) fail('Choose a JSON backup file.');
  return parseImport(await file.text());
}
export function freshData(): AppData { return structuredClone(DEFAULT_DATA); }
export function loadData(storage: Pick<Storage, 'getItem'>): { data: AppData; error: string | null } {
  try {
    const serialized = storage.getItem(STORAGE_KEY);
    const data = serialized ? parseImport(serialized) : freshData();
    // Never resume a countdown automatically after a reload or imported backup.
    if (data.session) data.session.paused = true;
    return { data, error: null };
  } catch (error) { return { data: freshData(), error: `Saved data could not be loaded. ${error instanceof Error ? error.message : 'Storage is unavailable.'}` }; }
}
export function saveData(storage: Pick<Storage, 'setItem'>, data: AppData): void {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch { throw new Error('Your progress could not be saved on this device. Export a backup before closing the app.'); }
}
