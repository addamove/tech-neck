import type { Routine } from './types';

// See docs/eye-gym.md for sources and the limits of the evidence.
export const EYE_ROUTINE: Routine = {
  family: 'eyes', id: 'eye-gym', title: 'Eye Gym · Level 1',
  subtitle: '2 min eye break + 1 min palming', xp: 5,
  exercises: [
    {
      id: 'eye-blinks', title: 'Soft blinking', durationSeconds: 30, prepSeconds: 20,
      description: 'Keep your eyes open for two seconds, closed for two seconds, then gently squeeze for two seconds without wrinkling the outer corners. Repeat softly, keeping your face relaxed.',
      prepPoseId: 'eyes-open',
      poses: [
        { poseId: 'eyes-open', seconds: 2, label: 'Eyes open · 2 seconds' },
        { poseId: 'eyes-closed', seconds: 2, label: 'Eyes closed · 2 seconds' },
        { poseId: 'eyes-squeeze', seconds: 2, label: 'Gently squeeze · no wrinkles at the outer corners' },
      ],
      cues: Array.from({ length: 3 }, (_, cycle) => [
        { atSeconds: cycle * 6, text: 'Open.' },
        { atSeconds: cycle * 6 + 2, text: 'Close.' },
        { atSeconds: cycle * 6 + 4, text: 'Gently squeeze.' },
      ]).flat(),
    },
    {
      id: 'eye-distance', title: 'Look away & rest', durationSeconds: 60, prepSeconds: 20,
      description: 'Look at an object about twenty feet, or six metres, away for twenty seconds. Then gently close your eyes for ten seconds. Repeat twice. Follow the voice without watching the screen.',
      prepPoseId: 'eyes-distance',
      poses: [{ poseId: 'eyes-distance', seconds: 20, label: 'Look into the distance · blink naturally' }, { poseId: 'eyes-closed', seconds: 10, label: 'Close your eyes gently' }],
      cues: [{ atSeconds: 0, text: 'Look away at an object about six metres away. Blink naturally.' }, { atSeconds: 30, text: 'Open your eyes and look into the distance.' }, { atSeconds: 20, text: 'Gently close your eyes for ten seconds.', repeatEverySeconds: 30 }],
    },
    {
      id: 'eye-circles', title: 'Gentle eye circles', durationSeconds: 30, prepSeconds: 20,
      description: 'Keep your head still. Slowly trace a small, comfortable circle with your eyes. Change direction after fifteen seconds. Do not force your gaze to the edges. Stop if you feel discomfort or dizziness.',
      prepPoseId: 'eyes-circle-clockwise',
      poses: [{ poseId: 'eyes-circle-clockwise', seconds: 15, label: 'Slow circles · clockwise' }, { poseId: 'eyes-circle-counterclockwise', seconds: 15, label: 'Slow circles · counterclockwise' }],
      cues: [{ atSeconds: 0, text: 'Circle your gaze slowly clockwise. Keep your head still and do not strain.' }, { atSeconds: 15, text: 'Change direction. Keep the circles small, slow and comfortable.' }],
    },
    {
      id: 'eye-palming', title: 'Palming', durationSeconds: 60, prepSeconds: 20,
      description: 'Support your elbows and close your eyes. Cup clean hands loosely over them to block the light, without touching or pressing on your eyeballs. Breathe normally. You can also rest with your eyes closed and hands down.',
      prepPoseId: 'eyes-palming',
      poses: [{ poseId: 'eyes-palming', seconds: 60, label: 'Rest in the dark · no pressure on your eyes' }],
      cues: [{ atSeconds: 0, text: 'Close your eyes. Cup your hands loosely, with no pressure on your eyes.' }, { atSeconds: 30, text: 'Relax your shoulders. Breathe normally.' }, { atSeconds: 55, text: 'Finish gently. Lower your hands and open your eyes.' }],
    },
  ],
};
