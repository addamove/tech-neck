import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTINES, getSelectedRoutine, getSessionRoutine } from './config';
import { createSession, advanceSession, completionFor, getFrame, cueTimeline } from './engine';
import { freshData, parseImport } from './persistence';
import { PREPARATION_OPTIONS } from './preparation';
import { preparationVoiceTimeline, preparationInstructionSeconds } from './voiceTiming';

test('each preparation setting survives active sessions and completed backup round trips for all routines', () => {
  for (const canonical of ROUTINES) for (const seconds of PREPARATION_OPTIONS) {
    const data = freshData();
    data.settings.preparationSeconds = seconds;
    const routine = getSelectedRoutine(canonical.id, data.settings);
    assert.ok(routine.exercises.every(exercise => exercise.prepSeconds === seconds));
    const session = createSession(routine, `${canonical.id}-${seconds}`, new Date('2026-10-01T10:00:00.000Z'));
    data.session = advanceSession(session, (seconds - 1) * 1000, canonical);
    data.settings.preparationSeconds = seconds === 20 ? 5 : 20;
    const restored = parseImport(JSON.stringify(data));
    assert.equal(getFrame(restored.session, getSessionRoutine(restored.session!)).remainingSeconds, 1);
    assert.ok(getSessionRoutine(restored.session!).exercises.every(exercise => exercise.prepSeconds === seconds));
    const total = routine.exercises.reduce((sum, exercise) => sum + seconds + exercise.durationSeconds, 0);
    const completed = advanceSession(session, total * 1000, canonical);
    assert.equal(completed.phase, 'complete');
    assert.equal(completed.elapsedMs, total * 1000);
    const completion = completionFor(completed, canonical, new Date('2026-10-01T11:00:00.000Z'));
    const imported = parseImport(JSON.stringify({ ...data, session: completed, completions: [completion] }));
    assert.equal(imported.completions[0].preparationSeconds, seconds);
  }
});

test('legacy hands sessions retain their 15-second preparation while new workouts use the default 20', () => {
  const data = freshData(); delete data.settings.preparationSeconds;
  data.session = advanceSession(createSession(ROUTINES.find(routine => routine.id === 'hands-level-1')!, 'legacy'), 14000, ROUTINES.find(routine => routine.id === 'hands-level-1')!);
  const imported = parseImport(JSON.stringify(data));
  assert.equal(imported.settings.preparationSeconds, 20);
  assert.equal(getFrame(imported.session, getSessionRoutine(imported.session!)).remainingSeconds, 1);
  for (const invalid of [0, 15, 30, '10', null]) {
    assert.throws(() => parseImport(JSON.stringify({ ...data, settings: { ...data.settings, preparationSeconds: invalid } })), /Preparation time/);
    assert.throws(() => parseImport(JSON.stringify({ ...data, session: { ...data.session, preparationSeconds: invalid } })), /Preparation time/);
  }
});

test('all preparation choices reserve three countdown slots without changing active durations', () => {
  for (const seconds of PREPARATION_OPTIONS) {
    const routine = getSelectedRoutine('level-1', { disabledExerciseIds: {}, preparationSeconds: seconds });
    assert.equal(routine.exercises.reduce((sum, exercise) => sum + exercise.durationSeconds, 0), 300);
    assert.equal(preparationInstructionSeconds(routine.exercises[0], 0), seconds - 3);
    assert.deepEqual(preparationVoiceTimeline(routine.exercises[0]).map(cue => cue.atSeconds), [seconds - 3, seconds - 2, seconds - 1]);
  }
});

test('rest reminders remain but return-to-stretch speech is absent in both neck levels', () => {
  for (const routine of ROUTINES.filter(routine => routine.family === 'neck')) {
    for (const id of ['side-neck', 'back-neck']) {
      const cues = cueTimeline(routine.exercises.find(exercise => exercise.id === id)!);
      assert.ok(cues.some(cue => cue.text === 'Rest for two seconds.'));
      assert.ok(cues.every(cue => !cue.text.includes('Gently return')));
    }
  }
});
