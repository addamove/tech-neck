import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTINES } from '../core/config';
import { canAnimatePreparation } from './ExerciseArt';
import { getFrame, createSession, advanceSession } from '../core/engine';

test('mirrored exercises stay static during preparation in every level and art style', () => {
  const staticIds = new Set(['chest', 'side-neck', 'head-turns', 'night-side-bend', 'night-quad', 'night-twist', 'night-neck', 'back-figure-four', 'back-twist', 'back-cross-curl', 'back-side-plank']);
  for (const routine of ROUTINES) for (const exercise of routine.exercises) {
    for (const style of ['male', 'female', 'marker'] as const) {
      assert.equal(canAnimatePreparation(exercise, style), !staticIds.has(exercise.id), `${routine.id}/${exercise.id}/${style}`);
    }
  }
});

test('static preparation keeps its initial image while active mirrored side changes still run', () => {
  const routine = ROUTINES.find(r => r.id === 'back-care')!;
  const exercise = routine.exercises.find(e => e.id === 'back-figure-four')!;
  const isolated = { ...routine, exercises: [exercise] };
  const session = createSession(isolated, 'static-mirror-preview');
  for (const ms of [0, 3000, 12000, 19999]) {
    assert.equal(getFrame(advanceSession(session, ms, isolated), isolated).poseId, exercise.prepPoseId);
  }
  assert.equal(getFrame(advanceSession(session, 44000, isolated), isolated).poseId, 'back-figure-left');
  assert.equal(getFrame(advanceSession(session, 45000, isolated), isolated).poseId, 'back-figure-right');
});
