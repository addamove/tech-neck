import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROUTINE, LEVEL_2_ROUTINE, getSelectedRoutine, getSessionRoutine } from './config';
import { advanceSession, completionFor, createSession, getFrame, getPose } from './engine';
import { freshData, parseImport } from './persistence';

test('neck levels have exact active budgets with preparation additional and finish stretches actively', () => {
  for (const [routine, work] of [[DEFAULT_ROUTINE, 300], [LEVEL_2_ROUTINE, 420]] as const) {
    assert.equal(getFrame(null, routine).workRemainingSeconds, work);
    assert.equal(getFrame(null, routine).totalRemainingSeconds, work + routine.exercises.length * 20);
    assert.deepEqual(routine.exercises.slice(1, 4).map(exercise => exercise.durationSeconds), [30, 30, 30]);
    for (const id of ['chin-tuck', 'side-neck']) {
      const exercise = routine.exercises.find(exercise => exercise.id === id)!;
      assert.ok(!getPose(exercise, exercise.durationSeconds - 0.001).isRest);
    }
  }
  const side = LEVEL_2_ROUTINE.exercises.find(exercise => exercise.id === 'side-neck')!;
  assert.equal(getPose(side, 33.999).poseId, 'side-neck-left');
  assert.equal(getPose(side, 34).poseId, 'side-neck-right');
  const circles = LEVEL_2_ROUTINE.exercises.find(exercise => exercise.id === 'arm-circles')!;
  assert.ok(getPose(circles, 14.999).poseId.startsWith('arm-circles-front'));
  assert.ok(getPose(circles, 15).poseId.startsWith('arm-circles-back'));
});
test('selection freezes a session and completion snapshot across settings edits and backup roundtrip', () => {
  const data = freshData();
  data.settings.disabledExerciseIds = { 'level-1': ['chin-tuck', 'snow-angel'] };
  const selected = getSelectedRoutine('level-1', data.settings);
  const session = createSession(selected, 'subset', new Date('2026-10-12T10:00:00.000Z'));
  data.settings.disabledExerciseIds = { 'level-1': ['chest'] };
  assert.deepEqual(getSessionRoutine(session).exercises.map(exercise => exercise.id), selected.exercises.map(exercise => exercise.id));
  const complete = advanceSession(session, 999999, getSessionRoutine(session));
  const completion = completionFor(complete, getSessionRoutine(complete), new Date('2026-10-12T11:00:00.000Z'));
  data.session = complete; data.completions = [completion];
  assert.deepEqual(parseImport(JSON.stringify(data)), data);
  const bad = structuredClone(data); bad.completions[0].exerciseIds = [];
  assert.throws(() => parseImport(JSON.stringify(bad)), /snapshot/);
  bad.completions[0].exerciseIds = ['chest', 'back-neck'];
  assert.throws(() => parseImport(JSON.stringify(bad)), /snapshot/);
  bad.completions[0].exerciseIds = completion.exerciseIds;
  bad.completions[0].elapsedMs = complete.elapsedMs + 1;
  assert.throws(() => parseImport(JSON.stringify(bad)), /elapsedMs/);
});
test('legacy absent selection fields load as all enabled; invalid all-disabled backups reject', () => {
  const legacy = JSON.parse(JSON.stringify(freshData())); delete legacy.settings.disabledExerciseIds;
  assert.deepEqual(parseImport(JSON.stringify(legacy)).settings.disabledExerciseIds, {});
  legacy.settings.disabledExerciseIds = { 'level-1': DEFAULT_ROUTINE.exercises.map(exercise => exercise.id) };
  assert.throws(() => parseImport(JSON.stringify(legacy)), /one exercise/);
  assert.throws(() => createSession({ ...DEFAULT_ROUTINE, exercises: [] }, 'empty'), /at least one/);
});

test('fractional timer accumulation survives active and completed backup bounds', () => {
  const started = new Date('2026-10-12T10:00:00.000Z');
  let session = createSession(DEFAULT_ROUTINE, 'fractional-active', started);
  session = advanceSession({ ...session, phase: 'active' }, 75445.38331632633, DEFAULT_ROUTINE);
  // First exercise preparation was skipped; following preparation starts after 58s.
  assert.equal(session.elapsedMs, 75445.38331632633);
  // Equivalent delta partitions may leave this adjacent floating-point value.
  session.phaseElapsedMs = 17445.383316326344;
  assert.deepEqual(parseImport(JSON.stringify({ ...freshData(), session })).session, session);
  const complete = advanceSession(createSession(DEFAULT_ROUTINE, 'fractional-complete', started), 440000, DEFAULT_ROUTINE);
  complete.elapsedMs = 440000.0000000001;
  const record = completionFor(complete, DEFAULT_ROUTINE, new Date('2026-10-12T11:00:00.000Z'));
  const data = { ...freshData(), session: complete, completions: [record] };
  assert.deepEqual(parseImport(JSON.stringify(data)), data);
  assert.throws(() => parseImport(JSON.stringify({ ...freshData(), session: { ...session, elapsedMs: session.elapsedMs - 1 } })), /Elapsed time/);
  assert.throws(() => parseImport(JSON.stringify({ ...data, session: null, completions: [{ ...record, elapsedMs: 440001 }] })), /elapsedMs/);
  const first = createSession(DEFAULT_ROUTINE, 'phase-rounding', started);
  first.phaseElapsedMs = 12345.000000000002; first.elapsedMs = 12345;
  assert.deepEqual(parseImport(JSON.stringify({ ...freshData(), session: first })).session, first);
});

test('backward circles reverse the same three art frames', () => {
  const circles = LEVEL_2_ROUTINE.exercises.find(exercise => exercise.id === 'arm-circles')!;
  assert.deepEqual([0, 1, 2].map(at => getPose(circles, at).poseId), ['arm-circles-front-1', 'arm-circles-front-2', 'arm-circles-front-3']);
  assert.deepEqual([15, 16, 17].map(at => getPose(circles, at).poseId), ['arm-circles-back-1', 'arm-circles-back-3', 'arm-circles-back-2']);
});
