import type { Exercise, Routine } from './types';

export const HANDS_TIMING = { durationSeconds: 36, prepSeconds: 15, poseSeconds: 3, reminderAtSeconds: 12 };

function movement(id: string, title: string, description: string, labels: [string, string], reminder: string): Exercise {
  return {
    id, title, description, durationSeconds: HANDS_TIMING.durationSeconds, prepSeconds: HANDS_TIMING.prepSeconds,
    prepPoseId: `${id}-a`,
    poses: labels.map((label, index) => ({ poseId: `${id}-${index === 0 ? 'a' : 'b'}`, seconds: HANDS_TIMING.poseSeconds, label })),
    cues: [{ atSeconds: HANDS_TIMING.reminderAtSeconds, text: reminder }],
  };
}

export const HANDS_ROUTINE: Routine = {
  id: 'hands-level-1', title: 'Hands · Level 1', subtitle: '5 gentle movements for your hands and wrists', xp: 5,
  exercises: [
    movement('hands-spread', 'Finger spread', 'Keep both wrists straight. Slowly spread your fingers, then bring them together. Use a comfortable range.', ['Spread your fingers', 'Bring your fingers together'], 'Keep your shoulders relaxed.'),
    movement('hands-bends', 'Finger bends', 'Keep both wrists straight. Slowly curl your fingers toward your palms, then open your hands. Do not squeeze or hold.', ['Gently bend your fingers', 'Open your hands'], 'Keep your grip soft and relaxed.'),
    movement('hands-wrist-bends', 'Supported wrist bends', 'Rest both forearms on the table, with your hands beyond the edge. Slowly bend your wrists down and up. Keep your fingers relaxed.', ['Bend your wrists down', 'Bend your wrists up'], 'Keep your forearms supported. Move gently.'),
    movement('hands-palm-turns', 'Palm turns', 'Rest your forearms on the table. Slowly turn both palms up, then down. Keep your wrists straight and your upper arms still.', ['Turn your palms up', 'Turn your palms down'], 'Turn your forearms without twisting your body.'),
    movement('hands-wrist-sides', 'Wrist side-to-side', 'Rest your forearms on the table, palms down. Gently move your hands toward your thumbs, then toward your little fingers.', ['Move toward your thumbs', 'Move toward your little fingers'], 'Keep your forearms still. Use a comfortable range.'),
  ],
};
