import type { Exercise, PoseStep, Routine, VoiceCue } from './types';

export const DURATION_STEP = 5;
export const MIN_EXERCISE_SECONDS = 5;
export const MAX_EXERCISE_SECONDS = 600;
export const isExerciseDuration = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= MIN_EXERCISE_SECONDS && value <= MAX_EXERCISE_SECONDS;

export function customDurationDescription(exercise: Exercise): string {
  return exercise.description
    .replace(/after fifteen seconds/g, 'halfway through')
    .replace(/After twenty seconds,/g, 'Halfway through,')
    .replace(/for (three|two) minutes/g, 'until the timer ends')
    .replace('Repeat twice.', 'Repeat until the timer ends.');
}

function repeatFor(steps: PoseStep[], duration: number): PoseStep[] {
  const result: PoseStep[] = [];
  for (let remaining = duration, index = 0; remaining > 0.000001; index++) {
    const step = steps[index % steps.length];
    const seconds = Math.min(step.seconds, remaining);
    result.push({ ...step, seconds });
    remaining -= seconds;
  }
  return result;
}

/** Keep movement cadence, but move side changes to the new halfway point. */
export function withExerciseDuration(exercise: Exercise, duration: number): Exercise {
  if (!isExerciseDuration(duration) || duration === exercise.durationSeconds) return exercise;
  let poses = exercise.poses;
  let cues = exercise.cues;
  const oldDuration = exercise.durationSeconds;
  const cycle = poses.reduce((sum, pose) => sum + pose.seconds, 0);
  const fullSequence = Math.abs(cycle - oldDuration) < 0.001;
  if (exercise.id === 'side-neck') {
    poses = ['left', 'right'].flatMap(side => repeatFor([
      { poseId: `side-neck-${side}`, seconds: 7, label: `${side === 'left' ? 'Left' : 'Right'} side` },
      { poseId: `side-neck-${side}`, seconds: 2, label: 'Rest for two seconds', isRest: true },
    ], duration / 2));
    let at = 0;
    cues = poses.flatMap((pose, index): VoiceCue[] => {
      const atSeconds = at; at += pose.seconds;
      const text = index === 0 ? exercise.cues[0].text : Math.abs(atSeconds - duration / 2) < .001 ? 'Switch to your right side.' : pose.isRest ? 'Rest for two seconds.' : '';
      return text ? [{ atSeconds, text }] : [];
    });
  } else {
    if (fullSequence && poses.length > 2) {
      // Arm circles and back-care repetitions have a block per direction/side.
      const middle = poses.length / 2;
      poses = [poses.slice(0, middle), poses.slice(middle)].flatMap(block => repeatFor(block, duration / 2));
    } else if (fullSequence) {
      poses = poses.map(pose => ({ ...pose, seconds: pose.seconds * duration / oldDuration }));
    }
    cues = cues.map(cue => {
      if (cue.repeatEverySeconds || cue.atSeconds === 0) return cue;
      const tail = oldDuration - cue.atSeconds;
      if (fullSequence && tail <= 8) return { ...cue, atSeconds: Math.max(1, duration - tail) };
      if (fullSequence && cue.atSeconds === oldDuration / 2) return { ...cue, atSeconds: duration / 2 };
      return cue;
    });
    if (exercise.id === 'eye-blinks') {
      cues = [{ atSeconds: 6, text: 'Open.', repeatEverySeconds: 6 }, { atSeconds: 2, text: 'Close.', repeatEverySeconds: 6 }, { atSeconds: 4, text: 'Gently squeeze.', repeatEverySeconds: 6 }];
    } else if (exercise.id === 'eye-distance') {
      cues = cues.map(cue => cue.atSeconds === 30 ? { ...cue, repeatEverySeconds: 30 } : cue);
    }
  }
  return { ...exercise, description: customDurationDescription(exercise), durationSeconds: duration, poses, cues: cues.filter(cue => cue.atSeconds < duration) };
}

export function withExerciseDurations(routine: Routine, durations?: Record<string, number>): Routine {
  if (!durations) return routine;
  return { ...routine, exerciseDurations: durations, exercises: routine.exercises.map(exercise => withExerciseDuration(exercise, durations[exercise.id])) };
}
