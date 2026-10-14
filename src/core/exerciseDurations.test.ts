import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTINES, getSelectedRoutine, getSessionRoutine } from './config';
import { advanceSession, completionFor, createSession, cueTimeline, getPose, getFrame } from './engine';
import { freshData, parseImport } from './persistence';
import { withExerciseDuration } from './exerciseDurations';

test('custom durations survive settings edits, reload and completed history in every routine', () => {
  for (const canonical of ROUTINES) {
    const data = freshData();
    data.settings.exerciseDurations = { [canonical.id]: Object.fromEntries(canonical.exercises.map(e => [e.id, e.durationSeconds + 5])) };
    const routine = getSelectedRoutine(canonical.id, data.settings);
    const initial = createSession(routine, canonical.id, new Date('2026-10-01T10:00:00.000Z'));
    data.session = advanceSession(initial, (routine.exercises[0].prepSeconds + 1) * 1000, canonical);
    data.settings.exerciseDurations[canonical.id] = {};
    const restored = parseImport(JSON.stringify(data));
    assert.equal(getFrame(restored.session, getSessionRoutine(restored.session!)).remainingSeconds, routine.exercises[0].durationSeconds - 1);
    const total = routine.exercises.reduce((sum, e) => sum + e.durationSeconds + e.prepSeconds, 0) * 1000;
    const complete = advanceSession(initial, total, canonical);
    assert.equal(complete.phase, 'complete');
    assert.equal(complete.elapsedMs, total);
    data.session = complete;
    data.completions = [completionFor(complete, canonical, new Date('2026-10-01T14:00:00.000Z'))];
    assert.deepEqual(parseImport(JSON.stringify(data)), data);
  }
});

test('short and long durations keep valid poses and cues; sides switch at halfway', () => {
  for (const routine of ROUTINES) for (const exercise of routine.exercises) for (const seconds of [5, 15, exercise.durationSeconds + 5, 600]) {
    const adjusted = withExerciseDuration(exercise, seconds);
    assert.equal(adjusted.durationSeconds, seconds);
    assert.ok(adjusted.poses.every(pose => Number.isFinite(pose.seconds) && pose.seconds > 0));
    assert.ok(cueTimeline(adjusted).every(cue => cue.atSeconds < seconds));
    for (const at of [0, seconds / 2, seconds - .001]) assert.ok(getPose(adjusted, at));
  }
  for (const [routineId, exerciseId] of [['level-1','side-neck'], ['level-1','chest'], ['back-care','back-cross-curl'], ['night-stretch','night-quad'], ['eye-gym','eye-circles']]) {
    const original = ROUTINES.find(r => r.id === routineId)!.exercises.find(e => e.id === exerciseId)!;
    const adjusted = withExerciseDuration(original, original.durationSeconds + 5);
    assert.notEqual(getPose(adjusted, 0).poseId, getPose(adjusted, adjusted.durationSeconds / 2).poseId);
    assert.ok(cueTimeline(adjusted).some(cue => cue.atSeconds === adjusted.durationSeconds / 2));
  }
});

test('blinking retains two-second cadence beyond the original duration and omits initial open', () => {
  const original = ROUTINES.find(r => r.id === 'eye-gym')!.exercises[0];
  const adjusted = withExerciseDuration(original, 40);
  assert.deepEqual(adjusted.poses.map(p => p.seconds), [2,2,2]);
  const cues = cueTimeline(adjusted);
  assert.equal(cues[0].atSeconds, 2);
  assert.equal(cues.at(-1)!.atSeconds, 38);
  assert.equal(cues.at(-1)!.text, 'Close.');
});

test('finishing cues move with the timer and levels keep independent overrides', () => {
  const data = freshData(); data.settings.exerciseDurations = { 'eye-gym': { 'eye-palming': 65 } };
  const adjusted = getSelectedRoutine('eye-gym', data.settings).exercises.at(-1)!;
  assert.equal(adjusted.cues.at(-1)!.atSeconds, 60);
  assert.equal(getSelectedRoutine('eye-gym-level-2', data.settings).exercises.at(-1)!.durationSeconds, 180);
});

test('invalid imported durations are rejected and legacy backups remain supported', () => {
  const data = freshData();
  assert.deepEqual(parseImport(JSON.stringify(data)), data);
  for (const value of [0, -5, 601, 5.5, '30', null]) {
    assert.throws(() => parseImport(JSON.stringify({ ...data, settings: { ...data.settings, exerciseDurations: { 'level-1': { 'chin-tuck': value } } } })), /duration/i);
  }
});
