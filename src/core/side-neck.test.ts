import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROUTINE } from './config';
import { advanceSession, createSession, cueTimeline, getFrame, getPose, skipExercise, skipPreparation } from './engine';

const side = DEFAULT_ROUTINE.exercises.find(exercise => exercise.id === 'side-neck')!;
test('side-neck repeats seven-plus-two independently per side and switches directly into stretching at 25', () => {
  assert.equal(side.durationSeconds, 50); assert.equal(side.prepSeconds, 20);
  assert.equal(side.poses.reduce((sum, pose) => sum + pose.seconds, 0), 50);
  assert.equal(side.poses.filter(pose => pose.isRest).reduce((sum, pose) => sum + pose.seconds, 0), 8);
  for (const start of [7, 16, 32, 41]) {
    assert.equal(Boolean(getPose(side, start - 0.001).isRest), false);
    assert.equal(getPose(side, start).isRest, true);
    assert.equal(getPose(side, start + 1.999).isRest, true);
    assert.equal(Boolean(getPose(side, start + 2).isRest), false);
    assert.equal(getPose(side, start).label, 'Rest for two seconds');
  }
  assert.equal(getPose(side, 24.999).poseId, 'side-neck-left');
  assert.equal(Boolean(getPose(side, 24.999).isRest), false);
  assert.equal(getPose(side, 25).poseId, 'side-neck-right');
  assert.equal(Boolean(getPose(side, 25).isRest), false);
  assert.equal(Boolean(getPose(side, 31.999).isRest), false);
  assert.equal(getPose(side, 49.999).poseId, 'side-neck-right');
  assert.equal(Boolean(getPose(side, 49.999).isRest), false);
});
test('side-neck voice rests align with each side cycle and announces the right side at 25 without a rest collision', () => {
  const timeline = cueTimeline(side);
  assert.deepEqual(timeline.filter(cue => cue.text === 'Rest for two seconds.').map(cue => cue.atSeconds), [7, 16, 32, 41]);
  assert.deepEqual(timeline.filter(cue => cue.text === 'Gently return to the stretch.').map(cue => cue.atSeconds), [9, 18, 34, 43]);
  assert.deepEqual(timeline.filter(cue => cue.text === 'Switch to your right side.').map(cue => cue.atSeconds), [25]);
  assert.ok(timeline[0].text.startsWith('Start on your left side.'));
  assert.equal(timeline[0].atSeconds, 0);
  assert.equal(new Set(timeline.map(cue => cue.atSeconds)).size, timeline.length);
  assert.ok(timeline.every(cue => cue.atSeconds < 50));
  for (const cue of timeline.filter(cue => cue.text === 'Rest for two seconds.')) {
    assert.equal(timeline.find(next => next.atSeconds > cue.atSeconds)!.atSeconds - cue.atSeconds, 2);
  }
});
test('side-neck rest freezes on pause and finishes into the next preparation at exactly 50 seconds', () => {
  let session = createSession(DEFAULT_ROUTINE, 'side-rest');
  for (let skipped = 0; skipped < 5; skipped++) session = skipExercise(session, DEFAULT_ROUTINE);
  session = advanceSession(skipPreparation(session), 32000, DEFAULT_ROUTINE);
  assert.equal(getFrame(session, DEFAULT_ROUTINE).poseLabel, 'Rest for two seconds');
  assert.equal(getFrame(session, DEFAULT_ROUTINE).exerciseRemainingSeconds, 18);
  const paused = { ...session, paused: true };
  assert.equal(advanceSession(paused, 10000, DEFAULT_ROUTINE), paused);
  const resumed = advanceSession({ ...paused, paused: false }, 2000, DEFAULT_ROUTINE);
  assert.equal(getFrame(resumed, DEFAULT_ROUTINE).poseLabel, 'Right side');
  const finalMoment = advanceSession(resumed, 15999, DEFAULT_ROUTINE);
  assert.equal(finalMoment.phase, 'active'); assert.equal(finalMoment.phaseElapsedMs, 49999);
  const next = advanceSession(finalMoment, 1, DEFAULT_ROUTINE);
  assert.equal(next.phase, 'prep'); assert.equal(next.exerciseIndex, 6); assert.equal(next.phaseElapsedMs, 0);
  assert.ok(next.completedExerciseIds.includes('side-neck'));
});
