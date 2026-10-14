import type { Exercise, PoseStep, Routine, VoiceCue } from './types';

const pose = (poseId: string, seconds: number, label: string): PoseStep => ({ poseId: `back-${poseId}`, seconds, label });
const cue = (atSeconds: number, text: string): VoiceCue => ({ atSeconds, text });
const exercise = (id: string, title: string, durationSeconds: number, description: string, poses: PoseStep[], cues: VoiceCue[]): Exercise => ({ id: `back-${id}`, title, durationSeconds, prepSeconds: 20, description, prepPoseId: poses[0].poseId, poses, cues });
const alternatingSides = (base: string, label: string, duration: number): PoseStep[] => [pose(`${base}-left`, duration / 2, `Left side · ${label}`), pose(`${base}-right`, duration / 2, `Right side · ${label}`)];
const sideRepetitions = (base: string, secondsPerSide = 20): PoseStep[] => ['left', 'right'].flatMap(side => Array.from({ length: secondsPerSide / 10 }, () => [pose(`${base}-${side}-down`, 5, `${side === 'left' ? 'Left' : 'Right'} side · lift slowly`), pose(`${base}-${side}-up`, 5, 'Lower slowly · keep breathing')]).flat());

// Brochure movement numbers are kept in docs/back-care.md, not embedded in IDs.
export const BACK_EXERCISES: Exercise[] = [
  exercise('warmup', 'Reach and draw knees in', 40,
    'Lie on your back with your head resting. Reach your arms overhead and lengthen comfortably. Bend your knees and hold behind your thighs, drawing them towards your chest. Release slowly and repeat without forcing your back.',
    [pose('reach', 5, 'Lengthen comfortably'), pose('knees', 5, 'Draw your knees in gently')],
    [cue(0, 'Reach comfortably, then draw your knees towards your chest. Repeat slowly.'), cue(20, 'Keep your head supported and your breathing easy.')]),
  exercise('roller-curl', 'Supported back curl', 40,
    'Lie back with a small soft roll supporting your lower back. Hold behind your knees and draw your thighs towards your chest. Gently lift your head and shoulders towards your knees, then ease back. Keep the movement small and never pull on your neck.',
    [pose('roller-curl-down', 5, 'Head supported · breathe in'), pose('roller-curl-up', 5, 'Curl gently · breathe out')],
    [cue(0, 'Gently curl towards your knees, then ease back. Do not strain your neck.'), cue(20, 'Use a small, comfortable movement. Keep breathing.')]),
  exercise('figure-four', 'Figure-four stretch', 50,
    'Lie on your back. Rest your left ankle across your right thigh, keeping the left knee open. Hold behind your right thigh and bring it towards you gently. Keep your head resting. Release and change sides halfway through.',
    alternatingSides('figure', 'Keep your head resting', 50),
    [cue(0, 'Cross your left ankle over your right thigh. Draw the right thigh towards you gently.'), cue(25, 'Release and change sides. Cross your right ankle over your left thigh.')]),
  exercise('twist', 'Lying spinal twist', 50,
    'Lie on your back with your arms relaxed out to the sides. Bend your left knee, resting the foot near your right knee, and let the bent leg move gently to the right. Keep your shoulders grounded. Turn your head the other way only if comfortable. Change sides halfway through.',
    alternatingSides('twist', 'Shoulders resting · no forcing', 50),
    [cue(0, 'Let your bent left knee move gently to the right. Keep your shoulders resting.'), cue(25, 'Return through the centre and change legs. Let the right knee move to the left.')]),
  exercise('block-curl', 'Supported abdominal curl', 40,
    'Lie on your back with your lower legs resting on a stable padded support and knees bent. Reach your arms towards your knees and slowly lift your head and shoulders a little. Lower gently. Avoid a full sit-up or holding your breath.',
    [pose('block-curl-down', 5, 'Relax down · feet supported'), pose('block-curl-up', 5, 'Small lift · reach towards your knees')],
    [cue(0, 'Lift your head and shoulders a little, then lower gently. Keep your feet supported.'), cue(20, 'Breathe out as you lift. Keep the movement small.')]),
  exercise('roller-hinge', 'Kneeling roll-supported hinge', 40,
    'Kneel with your hips resting towards your heels and a soft roll between your abdomen and thighs. Let your arms rest behind you. Gently fold forward over the roll, then straighten your back without lifting your hips from your heels. Stay within a comfortable range.',
    [pose('roller-fold', 5, 'Fold gently · hips stay down'), pose('roller-upright', 5, 'Straighten slowly · no pulling')],
    [cue(0, 'Fold gently over the roll, then straighten slowly. Keep your hips towards your heels.'), cue(20, 'Relax your shoulders and avoid forcing the movement.')]),
  exercise('prone-reach', 'Prone arm lifts', 40,
    'Lie on your stomach with your arms reaching forward and your forehead towards the mat. Gently engage your abdomen and buttocks. Lift your arms a small distance while drawing your shoulder blades down, then lower. Keep your legs on the floor and your neck long.',
    [pose('prone-down', 5, 'Arms resting · neck long'), pose('prone-up', 5, 'Small arm lift · legs stay down')],
    [cue(0, 'Lift your arms a little, then lower slowly. Keep your legs resting on the floor.'), cue(20, 'Draw your shoulder blades down. Keep your neck long.')]),
  exercise('cat-cow', 'Cat–cow', 40,
    'Start on hands and knees. Slowly round your back as you breathe out, then gently soften the curve as you breathe in. Keep the movement small and your neck relaxed. Stop if your wrists hurt or tingle.',
    [pose('cat', 5, 'Breathe out · round your back'), pose('cow', 5, 'Breathe in · soften the curve')],
    [cue(0, 'Breathe out and gently round your back.'), cue(5, 'Breathe in and gently lift your chest.'), cue(20, 'Move slowly with your breath. Stop if your wrists feel uncomfortable.')]),
  exercise('cross-curl', 'Cross-body curl', 40,
    'Lie on your back with your right foot flat. Rest your left ankle across your right knee. Slowly lift your right shoulder towards your left knee, then lower without pulling your neck. Halfway through, change legs and lift your left shoulder towards your right knee.',
    sideRepetitions('cross'),
    [cue(0, 'With your left ankle crossed, lift your right shoulder gently towards your left knee.'), cue(20, 'Change sides. Cross your right ankle and lift your left shoulder towards your right knee.')]),
  exercise('supported-rest', 'Supported rest', 180,
    'Lie on your back with your lower legs resting on a stable padded support. Rest your head and upper back comfortably on a cushion or wedge if needed. Let your arms relax beside you and breathe naturally for three minutes.',
    [pose('supported-rest', 180, 'Let your body settle · breathe naturally')],
    [cue(0, 'Settle into the support and let your arms relax. Breathe naturally.'), cue(90, 'Let your shoulders soften. There is nothing to force.'), cue(172, 'Begin to move your hands and feet gently. Take your time changing position.')]),
  exercise('side-plank', 'Bent-knee side lifts', 40,
    'Lie on your left side with bent knees and your left elbow beneath your shoulder. Rest your right hand on your hip. Lift your hips a little, then lower slowly. Change sides halfway through. Keep breathing and stop if your shoulder hurts.',
    sideRepetitions('side'),
    [cue(0, 'Support yourself on your left forearm. Gently lift and lower your hips.'), cue(20, 'Lower down and turn onto your right side. Continue with small, controlled lifts.')]),
  exercise('seated-release', 'Seated forward rest', 120,
    'Sit securely on the front of a stable padded block or chair, with both feet flat. Fold forward comfortably, resting your chest towards your thighs and letting your arms hang. Breathe slowly for two minutes. Finish by sitting up gradually.',
    [pose('seated-release', 120, 'Feet grounded · relax your shoulders')],
    [cue(0, 'Fold forward comfortably and let your shoulders relax. Keep both feet grounded.'), cue(60, 'Keep breathing slowly. Stay within a comfortable range.'), cue(112, 'Sit up slowly. Pause before standing.')]),
];
const noEquipment = new Set(['back-warmup', 'back-figure-four', 'back-twist', 'back-prone-reach', 'back-cat-cow', 'back-cross-curl', 'back-side-plank']);
export const BACK_ROUTINE: Routine = { id: 'back-care', family: 'back', title: 'Back Care · Level 1', subtitle: 'Five minutes without equipment', xp: 10, exercises: BACK_EXERCISES.filter(item => noEquipment.has(item.id)) };
export const BACK_LEVEL_2_ROUTINE: Routine = { id: 'back-care-level-2', family: 'back', title: 'Back Care · Level 2', subtitle: 'The complete routine with a roll and support', xp: 30, exercises: BACK_EXERCISES };
