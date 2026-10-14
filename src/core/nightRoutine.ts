import type { Exercise, Routine } from './types';

// A gentle evening adaptation; see docs/night-stretch.md for sources and timing.
export const NIGHT_ROUTINE: Routine = {
  family: 'night', id: 'night-stretch', title: 'Night Stretch · Level 1',
  subtitle: 'A gentle five-minute wind-down', xp: 10,
  exercises: [
    {
      id: 'night-side-bend', title: 'Seated side stretch', durationSeconds: 60, prepSeconds: 20,
      description: 'Sit comfortably with your hips grounded. Reach your arms overhead and lean gently to one side. Keep your chest facing forward. Change sides halfway through, without pulling or bouncing.',
      prepPoseId: 'night-side-left',
      poses: [{ poseId: 'night-side-left', seconds: 30, label: 'Lean left · keep both hips grounded' }, { poseId: 'night-side-right', seconds: 30, label: 'Lean right · keep both hips grounded' }],
      cues: [{ atSeconds: 0, text: 'Lean gently to your left. Keep both hips grounded and breathe normally.' }, { atSeconds: 30, text: 'Come back through the centre, then lean gently to your right.' }, { atSeconds: 55, text: 'Slowly return to the centre.' }],
    },
    {
      id: 'night-child', title: "Child's pose", durationSeconds: 30, prepSeconds: 20,
      description: 'Kneel and ease your hips towards your heels. Let your chest rest towards your thighs and reach your arms forward. Support your forehead with a cushion if needed. Keep your hands relaxed and avoid pressure through your wrists.',
      prepPoseId: 'night-child', poses: [{ poseId: 'night-child', seconds: 30, label: 'Let your back lengthen · hands relaxed' }],
      cues: [{ atSeconds: 0, text: 'Ease your hips back. Rest your forehead and let your hands relax.' }, { atSeconds: 25, text: 'Come up slowly and comfortably.' }],
    },
    {
      id: 'night-quad', title: 'Side-lying thigh stretch', durationSeconds: 60, prepSeconds: 20,
      description: 'Lie on your left side with your head supported. Bend your right knee and hold your ankle only if it is easy to reach. Keep your knees close together and your back relaxed. Roll over halfway through to stretch the other leg.',
      prepPoseId: 'night-quad-right',
      poses: [{ poseId: 'night-quad-right', seconds: 30, label: 'Right thigh · knees aligned' }, { poseId: 'night-quad-left', seconds: 30, label: 'Left thigh · knees aligned' }],
      cues: [{ atSeconds: 0, text: 'Hold a gentle stretch in your right thigh. Keep your knees close together.' }, { atSeconds: 30, text: 'Release, roll onto your right side, and gently stretch your left thigh.' }, { atSeconds: 55, text: 'Release your foot slowly.' }],
    },
    {
      id: 'night-knees', title: 'Knees to chest', durationSeconds: 30, prepSeconds: 20,
      description: 'Lie on your back with your head supported. Bring your knees towards your chest and hold behind your thighs. Keep your neck relaxed and use only a comfortable range. Let your legs settle back down slowly.',
      prepPoseId: 'night-knees', poses: [{ poseId: 'night-knees', seconds: 30, label: 'Head resting · gentle hold behind the thighs' }],
      cues: [{ atSeconds: 0, text: 'Bring your knees towards your chest. Keep your head resting and breathe easily.' }, { atSeconds: 25, text: 'Slowly lower your feet to the floor.' }],
    },
    {
      id: 'night-twist', title: 'Gentle lying twist', durationSeconds: 60, prepSeconds: 20,
      description: 'Lie on your back. Bend your right knee and let it move gently across your body to the left. Keep both shoulders resting and your neck comfortable. Support the knee if needed. Return through the centre to change sides halfway through.',
      prepPoseId: 'night-twist-left',
      poses: [{ poseId: 'night-twist-left', seconds: 30, label: 'Right knee across to the left · shoulders resting' }, { poseId: 'night-twist-right', seconds: 30, label: 'Left knee across to the right · shoulders resting' }],
      cues: [{ atSeconds: 0, text: 'Let your right knee move gently to the left. Keep both shoulders resting.' }, { atSeconds: 30, text: 'Return through the centre. Let your left knee move gently to the right.' }, { atSeconds: 55, text: 'Slowly return to the centre.' }],
    },
    {
      id: 'night-butterfly', title: 'Reclined butterfly', durationSeconds: 60, prepSeconds: 20,
      description: 'Rest on your back with the soles of your feet together. Let your knees open comfortably, supported by cushions if needed. Rest your arms and breathe naturally. Do not push your knees down. Finish by bringing your knees together slowly.',
      prepPoseId: 'night-butterfly', poses: [{ poseId: 'night-butterfly', seconds: 60, label: 'Support your knees · breathe naturally' }],
      cues: [{ atSeconds: 0, text: 'Rest with your feet together. Support your knees and let your shoulders soften.' }, { atSeconds: 30, text: 'Keep breathing naturally. There is no need to push deeper.' }, { atSeconds: 55, text: 'Bring your knees together slowly. Take your time getting up.' }],
    },
  ],
};

const movement = (id: string): Exercise => NIGHT_ROUTINE.exercises.find(exercise => exercise.id === id)!;

// All eleven movements, in the reference article's order. Active time: 450 s.
export const NIGHT_LEVEL_2_ROUTINE: Routine = {
  family: 'night', id: 'night-stretch-level-2', title: 'Night Stretch · Level 2',
  subtitle: 'The full eleven-movement sequence', xp: 10,
  exercises: [
    movement('night-knees'),
    movement('night-twist'),
    {
      ...movement('night-butterfly'), durationSeconds: 30,
      poses: [{ ...movement('night-butterfly').poses[0], seconds: 30 }],
      cues: [movement('night-butterfly').cues[0], { atSeconds: 25, text: 'Bring your knees together slowly.' }],
    },
    {
      id: 'night-bridge', title: 'Glute bridge', durationSeconds: 40, prepSeconds: 20,
      description: 'Lie on your back with bent knees and feet flat. Press through your feet to lift your hips, keeping your shoulders grounded. Hold comfortably while breathing, then lower slowly. Avoid arching your lower back.',
      prepPoseId: 'night-bridge', poses: [{ poseId: 'night-bridge', seconds: 40, label: 'Lift comfortably · shoulders grounded' }],
      cues: [{ atSeconds: 0, text: 'Press through your feet and lift your hips. Keep breathing.' }, { atSeconds: 20, text: 'Keep your shoulders grounded. Ease down if you need a rest.' }, { atSeconds: 35, text: 'Lower your hips slowly to the floor.' }],
    },
    movement('night-child'),
    {
      id: 'night-neck', title: 'Neck stretch', durationSeconds: 40, prepSeconds: 20,
      description: 'Sit tall and relax your shoulders. Tilt your left ear towards your left shoulder, resting a hand lightly on your head without pulling. After twenty seconds, slowly return to the centre and change sides.',
      prepPoseId: 'night-neck-left',
      poses: [{ poseId: 'night-neck-left', seconds: 20, label: 'Left side · keep your shoulders relaxed' }, { poseId: 'night-neck-right', seconds: 20, label: 'Right side · no pulling' }],
      cues: [{ atSeconds: 0, text: 'Tilt gently to your left. Let your shoulders stay relaxed.' }, { atSeconds: 20, text: 'Return to the centre, then gently tilt to your right.' }, { atSeconds: 35, text: 'Slowly return to the centre.' }],
    },
    {
      id: 'night-cat-cow', title: 'Cat–cow', durationSeconds: 50, prepSeconds: 20,
      description: 'Start on hands and knees. Slowly round your back as you breathe out, then gently soften the curve and lift your chest as you breathe in. Keep the movement comfortable and your neck long. Stop if your wrists hurt or tingle.',
      prepPoseId: 'night-cat',
      poses: [{ poseId: 'night-cat', seconds: 5, label: 'Breathe out · gently round your back' }, { poseId: 'night-cow', seconds: 5, label: 'Breathe in · gently lift your chest' }],
      cues: [{ atSeconds: 0, text: 'Breathe out and gently round your back.' }, { atSeconds: 5, text: 'Breathe in and gently lift your chest.' }, { atSeconds: 20, text: 'Continue slowly with your breath. Keep the movement small and comfortable.' }],
    },
    {
      ...movement('night-side-bend'), durationSeconds: 40,
      poses: movement('night-side-bend').poses.map(pose => ({ ...pose, seconds: 20 })),
      cues: movement('night-side-bend').cues.map(cue => ({ ...cue, atSeconds: cue.atSeconds === 30 ? 20 : cue.atSeconds === 55 ? 35 : cue.atSeconds })),
    },
    movement('night-quad'),
    {
      id: 'night-mountain', title: 'Mountain pose', durationSeconds: 30, prepSeconds: 20,
      description: 'Stand tall with both feet grounded and your weight balanced. Relax your arms beside you. Let your shoulders settle down, soften your face and breathe normally. Imagine growing gently taller through the crown of your head.',
      prepPoseId: 'night-mountain', poses: [{ poseId: 'night-mountain', seconds: 30, label: 'Feet grounded · shoulders relaxed' }],
      cues: [{ atSeconds: 0, text: 'Stand tall with your weight balanced. Relax your shoulders and breathe.' }, { atSeconds: 20, text: 'Let your face soften. Keep your breathing easy.' }],
    },
    {
      id: 'night-fold', title: 'Forward fold', durationSeconds: 40, prepSeconds: 20,
      description: 'Stand with your feet hip-width apart and knees soft. Fold forward from your hips and let your head and arms relax. Reach only as far as comfortable. To finish, bend your knees and rise slowly, pausing if you feel dizzy.',
      prepPoseId: 'night-fold', poses: [{ poseId: 'night-fold', seconds: 40, label: 'Soft knees · relaxed head and arms' }],
      cues: [{ atSeconds: 0, text: 'Fold forward with soft knees. Let your head and arms relax.' }, { atSeconds: 20, text: 'Breathe normally. You do not need to reach the floor.' }, { atSeconds: 34, text: 'Bend your knees and come up slowly. Take your time.' }],
    },
  ],
};
