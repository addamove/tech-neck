import type { Completion, Exercise, Routine, Session, VoiceCue, WorkoutFrame } from './types';

export function createSession(routine: Routine, id: string, now = new Date()): Session {
  return { id, routineId: routine.id, startedAt: now.toISOString(), phase: 'prep', exerciseIndex: 0, phaseElapsedMs: 0, elapsedMs: 0, paused: false, skippedExerciseIds: [], completedExerciseIds: [] };
}
function nextExercise(session: Session, routine: Routine): Session {
  return session.exerciseIndex + 1 >= routine.exercises.length
    ? { ...session, phase: 'complete', phaseElapsedMs: 0, paused: true }
    : { ...session, exerciseIndex: session.exerciseIndex + 1, phase: 'prep', phaseElapsedMs: 0 };
}
export function advanceSession(session: Session, deltaMs: number, routine: Routine): Session {
  if (session.paused || session.phase === 'complete' || !Number.isFinite(deltaMs) || deltaMs <= 0) return session;
  let result = { ...session };
  let remaining = deltaMs;
  while (remaining > 0 && result.phase !== 'complete') {
    const exercise = routine.exercises[result.exerciseIndex];
    const duration = (result.phase === 'prep' ? exercise.prepSeconds : exercise.durationSeconds) * 1000;
    const consumed = Math.min(remaining, duration - result.phaseElapsedMs);
    result = { ...result, phaseElapsedMs: result.phaseElapsedMs + consumed, elapsedMs: result.elapsedMs + consumed };
    remaining -= consumed;
    if (result.phaseElapsedMs >= duration) {
      result = result.phase === 'prep'
        ? { ...result, phase: 'active', phaseElapsedMs: 0 }
        : nextExercise({ ...result, completedExerciseIds: [...result.completedExerciseIds, exercise.id] }, routine);
    }
  }
  return result;
}
export function skipExercise(session: Session, routine: Routine): Session {
  if (session.phase === 'complete') return session;
  const exercise = routine.exercises[session.exerciseIndex];
  return nextExercise({ ...session, skippedExerciseIds: [...session.skippedExerciseIds, exercise.id] }, routine);
}
export function skipPreparation(session: Session): Session {
  return session.phase === 'prep' ? { ...session, phase: 'active', phaseElapsedMs: 0 } : session;
}
export function getPose(exercise: Exercise, seconds: number) {
  const cycle = exercise.poses.reduce((total, step) => total + step.seconds, 0);
  let position = Math.max(0, seconds) % cycle;
  for (const step of exercise.poses) {
    if (position < step.seconds) return step;
    position -= step.seconds;
  }
  return exercise.poses[0];
}
export function getFrame(session: Session | null, routine: Routine): WorkoutFrame {
  const exercise = routine.exercises[session?.exerciseIndex ?? 0];
  const phase = session?.phase ?? 'prep';
  const elapsed = (session?.phaseElapsedMs ?? 0) / 1000;
  const phaseDuration = phase === 'prep' ? exercise.prepSeconds : exercise.durationSeconds;
  const remainingSeconds = phase === 'complete' ? 0 : Math.max(0, Math.ceil(phaseDuration - elapsed));
  const future = routine.exercises.slice((session?.exerciseIndex ?? 0) + 1);
  const workRemainingSeconds = phase === 'complete' ? 0 : (phase === 'prep' ? exercise.durationSeconds : remainingSeconds) + future.reduce((n, item) => n + item.durationSeconds, 0);
  const totalRemainingSeconds = phase === 'complete' ? 0 : workRemainingSeconds + future.reduce((n, item) => n + item.prepSeconds, 0) + (phase === 'prep' ? remainingSeconds : 0);
  const pose = getPose(exercise, elapsed);
  return { phase, remainingSeconds, exerciseRemainingSeconds: phase === 'prep' ? exercise.durationSeconds : remainingSeconds, workRemainingSeconds, totalRemainingSeconds, elapsedSeconds: Math.floor((session?.elapsedMs ?? 0) / 1000), poseId: phase === 'prep' ? exercise.prepPoseId : pose.poseId, poseLabel: phase === 'prep' ? 'Get ready' : phase === 'complete' ? 'Workout complete' : pose.label, progress: phase === 'complete' ? 1 : Math.min(1, elapsed / phaseDuration) };
}
export function cueTimeline(exercise: Exercise): (VoiceCue & { atSeconds: number })[] {
  return exercise.cues.flatMap(cue => {
    const entries: VoiceCue[] = [];
    for (let at = cue.atSeconds; at < exercise.durationSeconds; at += cue.repeatEverySeconds ?? Infinity) entries.push({ ...cue, atSeconds: at });
    return entries;
  }).sort((a, b) => a.atSeconds - b.atSeconds);
}
export function completionFor(session: Session, routine: Routine, now = new Date()): Completion {
  if (session.phase !== 'complete') throw new Error('Only a completed workout can earn XP.');
  if (session.routineId !== routine.id) throw new Error('Workout routine does not match the completed session.');
  return { id: session.id, routineId: session.routineId, startedAt: session.startedAt, completedAt: now.toISOString(), elapsedMs: session.elapsedMs, xp: routine.xp, skippedExerciseIds: session.skippedExerciseIds, completedExerciseIds: session.completedExerciseIds };
}
export function recordCompletion(records: Completion[], completion: Completion): Completion[] {
  return records.some(record => record.id === completion.id) ? records : [...records, completion];
}
