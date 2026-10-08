import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROUTINE } from './config';
import { advanceSession, completionFor, createSession } from './engine';
import { freshData, loadData, parseImport } from './persistence';
import { getStats } from './stats';

const oldRoutine = {
  ...DEFAULT_ROUTINE,
  exercises: DEFAULT_ROUTINE.exercises.map((exercise, index) => ({
    ...exercise, durationSeconds: index === 0 ? 60 : index >= 1 && index <= 3 ? 90 : exercise.durationSeconds,
  })),
};
const started = new Date('2026-10-07T10:00:00.000Z');
const oldComplete = advanceSession(createSession(oldRoutine, 'old-complete', started), 600000, oldRoutine);
const oldRecord = completionFor(oldComplete, oldRoutine, new Date(started.getTime() + 600000));
function oldActive(index: number, seconds: number) {
  const preceding = oldRoutine.exercises.slice(0, index).reduce((sum, exercise) => sum + exercise.prepSeconds + exercise.durationSeconds, 0);
  return advanceSession(createSession(oldRoutine, `old-active-${index}`, started), (preceding + oldRoutine.exercises[index].prepSeconds + seconds) * 1000, oldRoutine);
}

test('old ten-minute completion history and its completed session survive load/import with XP and settings intact', () => {
  const data = freshData(); data.settings.voiceGender = 'male'; data.settings.illustrationStyle = 'marker';
  data.completions = [oldRecord]; data.session = oldComplete;
  const serialized = JSON.stringify(data);
  const imported = parseImport(serialized);
  assert.deepEqual(imported, data);
  const loaded = loadData({ getItem: () => serialized });
  assert.equal(loaded.error, null); assert.deepEqual(loaded.data, data);
  assert.equal(loaded.data.completions[0].elapsedMs, 600000);
  assert.equal(getStats(loaded.data.completions, new Date('2026-10-08T12:00:00.000Z')).totalXp, 10);
  assert.throws(() => parseImport(JSON.stringify({ ...data, completions: [{ ...oldRecord, elapsedMs: 600001 }] })), /elapsedMs/);
});
test('the earlier8:45 routine remains valid alongside ten-minute history after chin duration changes', () => {
  const previousRoutine = { ...DEFAULT_ROUTINE, exercises: DEFAULT_ROUTINE.exercises.map((exercise, index) => ({ ...exercise, durationSeconds: index === 0 ? 60 : exercise.durationSeconds })) };
  const previousComplete = advanceSession(createSession(previousRoutine, 'previous-complete', started), 525000, previousRoutine);
  const previousRecord = completionFor(previousComplete, previousRoutine, new Date(started.getTime() + 525000));
  const data = { ...freshData(), completions: [oldRecord, previousRecord], session: previousComplete };
  assert.equal(previousRecord.elapsedMs, 525000);
  assert.deepEqual(parseImport(JSON.stringify(data)), data);
  const loaded = loadData({ getItem: () => JSON.stringify(data) });
  assert.equal(loaded.error, null); assert.deepEqual(loaded.data.completions, data.completions);
  assert.equal(getStats(loaded.data.completions, new Date('2026-10-08T12:00:00.000Z')).totalXp, 20);
});
test('old chin progress in the removed trailing rest advances to paused preparation without losing elapsed time', () => {
  for (const seconds of [57.999, 58, 59, 59.999]) {
    const session = oldActive(0, seconds);
    const data = { ...freshData(), completions: [oldRecord], session };
    const loaded = loadData({ getItem: () => JSON.stringify(data) });
    assert.equal(loaded.error, null);
    const restored = loaded.data.session!;
    assert.equal(restored.paused, true); assert.equal(restored.elapsedMs, session.elapsedMs);
    assert.deepEqual(loaded.data.completions, data.completions);
    if (seconds < 58) {
      assert.equal(restored.phase, 'active'); assert.equal(restored.exerciseIndex, 0);
      assert.equal(restored.phaseElapsedMs, session.phaseElapsedMs);
    } else {
      assert.equal(restored.phase, 'prep'); assert.equal(restored.exerciseIndex, 1); assert.equal(restored.phaseElapsedMs, 0);
      assert.deepEqual(restored.completedExerciseIds, ['chin-tuck']);
    }
    assert.deepEqual(parseImport(JSON.stringify(loaded.data)), loaded.data);
  }
});
test('old arm progress below 65 seconds remains paused in place; progress at or past 65 advances to paused preparation', () => {
  for (const index of [1, 2, 3]) {
    for (const seconds of [64.999, 65, 75, 89.999]) {
      const session = oldActive(index, seconds);
      const data = { ...freshData(), completions: [oldRecord], session };
      const serialized = JSON.stringify(data);
      const loaded = loadData({ getItem: () => serialized });
      assert.equal(loaded.error, null);
      const restored = loaded.data.session!;
      assert.equal(restored.paused, true); assert.equal(restored.id, session.id);
      assert.equal(restored.elapsedMs, session.elapsedMs);
      assert.deepEqual(loaded.data.completions, data.completions);
      if (seconds < 65) {
        assert.equal(restored.phase, 'active'); assert.equal(restored.exerciseIndex, index);
        assert.equal(restored.phaseElapsedMs, session.phaseElapsedMs);
      } else {
        assert.equal(restored.phase, 'prep'); assert.equal(restored.exerciseIndex, index + 1);
        assert.equal(restored.phaseElapsedMs, 0);
        assert.deepEqual(restored.completedExerciseIds, [...session.completedExerciseIds, oldRoutine.exercises[index].id]);
      }
      assert.equal(advanceSession(restored, 1000, DEFAULT_ROUTINE), restored);
      const resumed = advanceSession({ ...restored, paused: false }, 1000, DEFAULT_ROUTINE);
      assert.equal(resumed.elapsedMs, restored.elapsedMs + 1000);
      assert.deepEqual(parseImport(JSON.stringify(loaded.data)), loaded.data);
    }
  }
  const active = oldActive(1, 75);
  assert.throws(() => parseImport(JSON.stringify({ ...freshData(), session: { ...active, phaseElapsedMs: 90000 } })), /phase/);
});
test('engine does not subtract time or replay overshoot if an older active phase exceeds its shortened duration', () => {
  const old = oldActive(2, 75);
  const next = advanceSession(old, 1000, DEFAULT_ROUTINE);
  assert.equal(next.phase, 'prep'); assert.equal(next.exerciseIndex, 3);
  assert.equal(next.phaseElapsedMs, 1000);
  assert.equal(next.elapsedMs, old.elapsedMs + 1000);
  assert.ok(next.completedExerciseIds.includes('bent-angel'));
});
