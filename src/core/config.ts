import type { AppData, Exercise, PoseStep, Routine, VoiceCue } from './types';

export const PREPARATION_DEMO_STEP_MS = 3000;

// Every duration, pose interval and voice deadline is declared here, in seconds.
export const ARM_TIMING = { up: 3, down: 3, duration: 65, breathingReminderAtSeconds: 15, chinReminderCycles: [2, 7, 12] };
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
  return [{ atSeconds, text: 'Gently return to the stretch.' }];
});
const exercises: Exercise[] = [
  {
    id: 'chin-tuck', title: 'Chin tuck in', durationSeconds: 60, prepSeconds: 20, prepPoseId: 'chin-tuck-initial',
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
    cues: [{ atSeconds: 0, text: gentleWeight }, { atSeconds: 10, text: 'Rest for two seconds.', repeatEverySeconds: 12 }, { atSeconds: 12, text: 'Gently return to the stretch.', repeatEverySeconds: 12 }],
  },
  {
    id: 'side-neck', title: 'Stretch sides of your neck', durationSeconds: SIDE_NECK_TIMING.duration, prepSeconds: 20, prepPoseId: 'side-neck-left',
    description: 'Bring your ear to your shoulder. Rest your hand on the side of your head and allow the weight of your arm to gently pull, stretching the side of your neck.',
    poses: sideNeckPoses,
    cues: sideNeckCues,
  },
  {
    id: 'chest', title: 'Stretch your chest muscles', durationSeconds: 50, prepSeconds: 20, prepPoseId: 'chest-left',
    description: 'Walk into an open doorway. Place your arm against the side of the door with your palm facing the door. Take a small step forward with your foot. Keep your forearm touching the door.',
    poses: [{ poseId: 'chest-left', seconds: 25, label: 'Left side' }, { poseId: 'chest-right', seconds: 25, label: 'Right side' }],
    cues: [{ atSeconds: 0, text: 'Start on your left side.' }, { atSeconds: 25, text: 'Switch to your right side.' }],
  },
];
export const ROUTINES: Routine[] = [{ id: 'level-1', title: 'Tech Neck · Level 1', subtitle: '7 exercises for your neck and shoulders', xp: 10, exercises }];
export const DEFAULT_ROUTINE = ROUTINES[0];
export const DEFAULT_DATA: AppData = {
  format: 'tech-neck', version: 1,
  settings: { voiceEnabled: true, voiceRate: 1, voiceGender: 'female', illustrationStyle: 'male', wakeLockEnabled: true, selectedRoutineId: DEFAULT_ROUTINE.id },
  completions: [], session: null,
};
export const getRoutine = (id: string) => ROUTINES.find(r => r.id === id) ?? DEFAULT_ROUTINE;
