import { BACK_ROUTINE, BACK_LEVEL_2_ROUTINE } from './backRoutine';
import { NIGHT_ROUTINE, NIGHT_LEVEL_2_ROUTINE } from './nightRoutine';
import type { AppData, Exercise, PoseStep, Routine, VoiceCue } from './types';
import { withPreparation, DEFAULT_PREPARATION_SECONDS } from './preparation';
import { EYE_ROUTINE, EYE_LEVEL_2_ROUTINE } from './eyeRoutine';
import { HANDS_ROUTINE } from './handsRoutine';
export { HANDS_ROUTINE, HANDS_TIMING } from './handsRoutine';

export const PREPARATION_DEMO_STEP_MS = 3000;

// Every duration, pose interval and voice deadline is declared here, in seconds.
export const ARM_TIMING = { up: 3, down: 3, duration: 30, breathingReminderAtSeconds: 15, chinReminderCycles: [2, 7, 12] };
export const BREATHING_GUIDANCE = 'Inhale while lifting up. Exhale while moving down.';
// Voice guidance is independent of the repeating visual movement cycle.
const armsCues: VoiceCue[] = [
  ...ARM_TIMING.chinReminderCycles.map(cycle => ({
    atSeconds: cycle * (ARM_TIMING.up + ARM_TIMING.down),
    text: "Don't forget to tuck in your chin.",
  })),
  { atSeconds: ARM_TIMING.breathingReminderAtSeconds, text: BREATHING_GUIDANCE },
].filter(cue => cue.atSeconds < ARM_TIMING.duration).sort((a, b) => a.atSeconds - b.atSeconds);
const gentleWeight = 'Allow the weight of your arms to provide a gentle stretch. Do not press down.';
export const SIDE_NECK_TIMING = { stretch: 7, rest: 2, duration: 50, switchSideAtSeconds: 25 };
const sideNeckPoses: PoseStep[] = [];
const sideCycleSeconds = SIDE_NECK_TIMING.stretch + SIDE_NECK_TIMING.rest;
for (let at = 0; at < SIDE_NECK_TIMING.duration;) {
  const side = at < SIDE_NECK_TIMING.switchSideAtSeconds ? 'left' : 'right';
  const sideStartedAt = side === 'left' ? 0 : SIDE_NECK_TIMING.switchSideAtSeconds;
  const position = (at - sideStartedAt) % sideCycleSeconds;
  const isRest = position >= SIDE_NECK_TIMING.stretch;
  const end = Math.min(
    at + (isRest ? sideCycleSeconds : SIDE_NECK_TIMING.stretch) - position,
    side === 'left' ? SIDE_NECK_TIMING.switchSideAtSeconds : SIDE_NECK_TIMING.duration,
    SIDE_NECK_TIMING.duration,
  );
  sideNeckPoses.push({ poseId: `side-neck-${side}`, seconds: end - at, isRest, label: isRest ? 'Rest for two seconds' : side === 'left' ? 'Left side' : 'Right side' });
  at = end;
}
let sideCueAtSeconds = 0;
let rightSideAnnounced = false;
const sideNeckCues: VoiceCue[] = sideNeckPoses.flatMap((pose, index) => {
  const atSeconds = sideCueAtSeconds;
  sideCueAtSeconds += pose.seconds;
  if (index === 0) return [{ atSeconds, text: 'Start on your left side. Allow the weight of your arm to provide a gentle stretch. Do not press down.' }];
  if (pose.isRest) return sideNeckPoses[index - 1].isRest ? [] : [{ atSeconds, text: 'Rest for two seconds.' }];
  if (pose.poseId === 'side-neck-right' && !rightSideAnnounced) {
    rightSideAnnounced = true;
    return [{ atSeconds, text: 'Switch to your right side.' }];
  }
  return [];
});
const exercises: Exercise[] = [
  {
    id: 'chin-tuck', title: 'Chin tuck in', durationSeconds: 58, prepSeconds: 20, prepPoseId: 'chin-tuck-initial',
    description: 'Get into correct head posture by touching the back of your head to the wall. Make sure you are not simply moving your head backward and increasing the curve of the neck. This is also an improper posture. Focus on creating length in the back of the neck.',
    poses: [{ poseId: 'chin-tuck-active', seconds: 10, label: 'Tuck your chin in' }, { poseId: 'chin-tuck-initial', seconds: 2, label: 'Rest for two seconds', isRest: true }],
    cues: [{ atSeconds: 10, text: 'Rest for two seconds.', repeatEverySeconds: 12 }, { atSeconds: 12, text: 'Tuck your chin in.', repeatEverySeconds: 12 }],
  },
  {
    id: 'snow-angel', title: 'Snow angel on the wall', durationSeconds: ARM_TIMING.duration, prepSeconds: 20, prepPoseId: 'snow-angel-down',
    description: 'Tuck in your chin, back of your head to the wall, straight elbows on the side of your body and slide your arms on the wall to the height of your shoulders.',
    poses: [{ poseId: 'snow-angel-down', seconds: ARM_TIMING.up, label: 'Inhale · lift your arms' }, { poseId: 'snow-angel-up', seconds: ARM_TIMING.down, label: 'Exhale · lower your arms' }], cues: armsCues,
  },
  {
    id: 'bent-angel', title: 'Snow angel on the wall with bent elbows', durationSeconds: ARM_TIMING.duration, prepSeconds: 20, prepPoseId: 'bent-angel-down',
    description: 'Tuck in your chin, back of your head to the wall, elbows bent touching the wall, wrist above your elbows also touching the wall, now extend your arms up without moving your head.',
    poses: [{ poseId: 'bent-angel-down', seconds: ARM_TIMING.up, label: 'Inhale · lift your arms' }, { poseId: 'bent-angel-up', seconds: ARM_TIMING.down, label: 'Exhale · lower your arms' }], cues: armsCues,
  },
  {
    id: 'arm-lift', title: 'Lifting arms with correct head posture', durationSeconds: ARM_TIMING.duration, prepSeconds: 20, prepPoseId: 'arm-lift-down',
    description: 'Tuck in your chin, back of your head to the wall, arms in natural position next to your body, now lift them up without moving your head, inhale while you are going up and exhale while you are going down. Touch wall with your wrists when you lift your arms.',
    poses: [{ poseId: 'arm-lift-down', seconds: ARM_TIMING.up, label: 'Inhale · lift your arms' }, { poseId: 'arm-lift-up', seconds: ARM_TIMING.down, label: 'Exhale · lower your arms' }], cues: armsCues,
  },
  {
    id: 'back-neck', title: 'Stretch the back of your neck', durationSeconds: 30, prepSeconds: 20, prepPoseId: 'back-neck-stretch',
    description: 'Tilt your chin to your chest. Interlace your fingers and place them behind your head. Allow the weight of your arms to apply gentle downward pressure on your head and stretch the back of your neck.',
    poses: [{ poseId: 'back-neck-stretch', seconds: 10, label: 'Let the weight of your arms stretch your neck' }, { poseId: 'back-neck-stretch', seconds: 2, label: 'Rest for two seconds', isRest: true }],
    cues: [{ atSeconds: 0, text: gentleWeight }, { atSeconds: 10, text: 'Rest for two seconds.', repeatEverySeconds: 12 }],
  },
  {
    id: 'side-neck', title: 'Stretch sides of your neck', durationSeconds: SIDE_NECK_TIMING.duration, prepSeconds: 20, prepPoseId: 'side-neck-left',
    description: 'Bring your ear to your shoulder. Rest your hand on the side of your head and allow the weight of your arm to gently pull, stretching the side of your neck.',
    poses: sideNeckPoses,
    cues: sideNeckCues,
  },
  {
    id: 'chest', title: 'Stretch your chest muscles', durationSeconds: 72, prepSeconds: 20, prepPoseId: 'chest-left',
    description: 'Walk into an open doorway. Place your arm against the side of the door with your palm facing the door. Take a small step forward with your foot. Keep your forearm touching the door.',
    poses: [{ poseId: 'chest-left', seconds: 36, label: 'Left side' }, { poseId: 'chest-right', seconds: 36, label: 'Right side' }],
    cues: [{ atSeconds: 0, text: 'Start on your left side.' }, { atSeconds: 36, text: 'Switch to your right side.' }],
  },
];
function longerSideNeck(): Pick<Exercise, 'poses' | 'cues'> {
  const poses: PoseStep[] = [];
  for (const side of ['left', 'right']) for (let at = 0; at < 34;) {
    const rest = at % 9 >= 7;
    const seconds = Math.min(rest ? 9 - at % 9 : 7 - at % 9, 34 - at);
    poses.push({ poseId: `side-neck-${side}`, seconds, isRest: rest, label: rest ? 'Rest for two seconds' : `${side === 'left' ? 'Left' : 'Right'} side` }); at += seconds;
  }
  let at = 0;
  const cues = poses.flatMap((pose, index) => {
    const cue = { atSeconds: at, text: index === 0 ? 'Start on your left side. Allow the weight of your arm to provide a gentle stretch. Do not press down.' : at === 34 ? 'Switch to your right side.' : pose.isRest ? 'Rest for two seconds.' : '' };
    at += pose.seconds; return cue.text ? [cue] : [];
  });
  return { poses, cues };
}
const level2Durations: Record<string, number> = { 'chin-tuck': 82, 'back-neck': 58, 'side-neck': 68, chest: 62 };
export const LEVEL_2_ROUTINE: Routine = {
  family: 'neck', id: 'level-2', title: 'Tech Neck · Level 2', subtitle: '9 exercises for your neck and shoulders', xp: 10,
  exercises: [...exercises.map(exercise => ({ ...exercise, durationSeconds: level2Durations[exercise.id] ?? exercise.durationSeconds,
    ...(exercise.id === 'side-neck' ? longerSideNeck() : {}),
    ...(exercise.id === 'chest' ? { poses: [{ poseId: 'chest-left', seconds: 31, label: 'Left side' }, { poseId: 'chest-right', seconds: 31, label: 'Right side' }], cues: [{ atSeconds: 0, text: 'Start on your left side.' }, { atSeconds: 31, text: 'Switch to your right side.' }] } : {}),
  })), {
    id: 'arm-circles', title: 'Circular arm swings', durationSeconds: 30, prepSeconds: 20, prepPoseId: 'arm-circles-front',
    description: 'Stand tall with your chin gently tucked and shoulders relaxed. With straight arms, slowly sweep forward and up overhead, then lower in a large, comfortable circular motion. Reverse direction after fifteen seconds.',
    poses: ['front', 'back'].flatMap(direction => Array.from({ length: 9 }, (_, index) => ({ poseId: `arm-circles-${direction}-${direction === 'front' ? index % 3 + 1 : [1, 3, 2][index % 3]}`, seconds: 5 / 3, label: `Large ${direction === 'front' ? 'forward' : 'backward'} circles` }))),
    cues: [{ atSeconds: 0, text: 'Slowly swing your straight arms forward and up in large, comfortable circles.' }, { atSeconds: 15, text: 'Reverse direction. Keep the circular swings slow and comfortable.' }],
  }, {
    id: 'head-turns', title: 'Gentle head turns', durationSeconds: 30, prepSeconds: 20, prepPoseId: 'head-turn-center',
    description: 'Sit or stand tall with your shoulders relaxed. Slowly turn your head to the left, return to center, then turn to the right. Stay within a comfortable range and move without force.',
    poses: [{ poseId: 'head-turn-left', seconds: 4, label: 'Slowly turn left' }, { poseId: 'head-turn-center', seconds: 1, label: 'Return to center' }, { poseId: 'head-turn-right', seconds: 4, label: 'Slowly turn right' }, { poseId: 'head-turn-center', seconds: 1, label: 'Return to center' }],
    cues: [{ atSeconds: 0, text: 'Turn slowly within a comfortable range, without force.' }, { atSeconds: 15, text: 'Keep your shoulders relaxed and move without force.' }],
  }],
};
export const LEGACY_LEVEL_2_EXERCISE_IDS = ['chin-tuck', 'snow-angel', 'bent-angel', 'arm-lift', 'back-neck', 'side-neck', 'chest', 'arm-circles', 'head-turns'];
const level2Order = ['chin-tuck', 'snow-angel', 'bent-angel', 'arm-lift', 'arm-circles', 'back-neck', 'side-neck', 'head-turns', 'chest'];
LEVEL_2_ROUTINE.exercises = level2Order.map(id => LEVEL_2_ROUTINE.exercises.find(exercise => exercise.id === id)!);
export const ROUTINES: Routine[] = [{ family: 'neck', id: 'level-1', title: 'Tech Neck · Level 1', subtitle: '7 exercises for your neck and shoulders', xp: 10, exercises }, LEVEL_2_ROUTINE, HANDS_ROUTINE, EYE_ROUTINE, EYE_LEVEL_2_ROUTINE, NIGHT_ROUTINE, NIGHT_LEVEL_2_ROUTINE, BACK_ROUTINE, BACK_LEVEL_2_ROUTINE];
export const DEFAULT_ROUTINE = ROUTINES[0];
export const DEFAULT_DATA: AppData = {
  format: 'tech-neck', version: 1,
  settings: { preparationSeconds: DEFAULT_PREPARATION_SECONDS, voiceEnabled: true, voiceRate: 1, voiceGender: 'female', illustrationStyle: 'male', wakeLockEnabled: true, selectedRoutineId: DEFAULT_ROUTINE.id, disabledExerciseIds: {} },
  completions: [], session: null,
};
export const getRoutine = (id: string) => ROUTINES.find(r => r.id === id) ?? DEFAULT_ROUTINE;

export function selectRoutineExercises(routine: Routine, disabledIds: string[] = []): Routine {
  const selected = routine.exercises.filter(exercise => !disabledIds.includes(exercise.id));
  return { ...routine, exercises: selected.length ? selected : [routine.exercises[0]] };
}
export function getSelectedRoutine(routineId: string, settings: Pick<import('./types').Settings, 'disabledExerciseIds' | 'preparationSeconds'>): Routine {
  const routine = getRoutine(routineId);
  return withPreparation(selectRoutineExercises(routine, settings.disabledExerciseIds?.[routine.id]), settings.preparationSeconds ?? DEFAULT_PREPARATION_SECONDS);
}
export function getSessionRoutine(session: import('./types').Session): Routine {
  const routine = withPreparation(getRoutine(session.routineId), session.preparationSeconds);
  return session.exerciseIds ? { ...routine, exercises: session.exerciseIds.map(id => routine.exercises.find(exercise => exercise.id === id)!).filter(Boolean) } : routine;
}
