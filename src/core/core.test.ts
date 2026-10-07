import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROUTINE } from './config';
import { advanceSession, completionFor, createSession, cueTimeline, getFrame, getPose, recordCompletion, skipExercise, skipPreparation } from './engine';
import { freshData, loadData, MAX_IMPORT_BYTES, parseImport, readImport, saveData, STORAGE_KEY } from './persistence';
import { getStats, localDateKey } from './stats';

test('final routine has 460 seconds work, 140 preparation and exact seven exercise lengths', () => {
  assert.deepEqual(DEFAULT_ROUTINE.exercises.map(item => item.durationSeconds), [60, 90, 90, 90, 30, 50, 50]);
  const frame = getFrame(null, DEFAULT_ROUTINE);
  assert.equal(frame.workRemainingSeconds, 460); assert.equal(frame.totalRemainingSeconds, 600);
});
test('chin resting boundaries switch to initial pose with two-second rests inside total duration', () => {
  const chin = DEFAULT_ROUTINE.exercises[0];
  assert.equal(getPose(chin, 9.999).poseId, 'chin-tuck-active');
  assert.equal(getPose(chin, 10).poseId, 'chin-tuck-initial');
  assert.equal(getPose(chin, 11.999).poseId, 'chin-tuck-initial');
  assert.equal(getPose(chin, 12).poseId, 'chin-tuck-active');
  assert.deepEqual(cueTimeline(chin).filter(cue => cue.text.includes('Rest')).map(cue => cue.atSeconds), [10, 22, 34, 46, 58]);
});
test('arm movements have fifteen six-second cycles, reminders leave a full cycle to speak', () => {
  for (const exercise of DEFAULT_ROUTINE.exercises.slice(1, 4)) {
    assert.deepEqual(exercise.poses.map(pose => pose.seconds), [3, 3]);
    assert.equal(getPose(exercise, 3).poseId, exercise.poses[1].poseId);
    const cues = cueTimeline(exercise);
    for (const cue of cues.filter(item => item.text.includes('chin'))) {
      const next = cues.find(item => item.atSeconds > cue.atSeconds)!;
      assert.equal(next.atSeconds - cue.atSeconds, 6);
    }
  }
});
test('back stretch image stays fixed during rests and both sided stretches switch at exactly25 seconds', () => {
  const back = DEFAULT_ROUTINE.exercises[4];
  assert.equal(getPose(back, 10).poseId, getPose(back, 0).poseId);
  assert.deepEqual(cueTimeline(back).filter(cue => cue.text.includes('Rest')).map(cue => cue.atSeconds), [10, 22]);
  for (const exercise of DEFAULT_ROUTINE.exercises.slice(5)) {
    assert.ok(getPose(exercise, 24.999).poseId.endsWith('left'));
    assert.ok(getPose(exercise, 25).poseId.endsWith('right'));
    assert.ok(getPose(exercise, 49.999).poseId.endsWith('right'));
  }
});
test('timer consumes overshoot across prep/work boundaries and never counts past completion', () => {
  const initial = createSession(DEFAULT_ROUTINE, 'session-1', new Date('2026-10-07T10:00:00.000Z'));
  const active = advanceSession(initial, 20500, DEFAULT_ROUTINE);
  assert.equal(active.phase, 'active'); assert.equal(active.phaseElapsedMs, 500);
  const second = advanceSession(initial, 80750, DEFAULT_ROUTINE);
  assert.equal(second.phase, 'prep'); assert.equal(second.exerciseIndex, 1); assert.equal(second.phaseElapsedMs, 750);
  const done = advanceSession(initial, 9999999, DEFAULT_ROUTINE);
  assert.equal(done.phase, 'complete'); assert.equal(done.elapsedMs, 600000);
  assert.equal(done.completedExerciseIds.length, 7);
  assert.equal(advanceSession(done, 100000, DEFAULT_ROUTINE), done);
});
test('pause and restore freeze countdown, resumes use only newly supplied elapsed time', () => {
  const active = advanceSession(createSession(DEFAULT_ROUTINE, 'paused'), 30000, DEFAULT_ROUTINE);
  const paused = { ...active, paused: true };
  assert.equal(advanceSession(paused, 999999, DEFAULT_ROUTINE), paused);
  const data = { ...freshData(), session: active };
  const loaded = loadData({ getItem: () => JSON.stringify(data) });
  assert.equal(loaded.error, null); assert.equal(loaded.data.session?.paused, true);
  assert.equal(loaded.data.session?.phaseElapsedMs, 10000);
  const resumed = advanceSession({ ...loaded.data.session!, paused: false }, 1000, DEFAULT_ROUTINE);
  assert.equal(resumed.phaseElapsedMs, 11000);
});
test('skipping preparation differs from skipping exercises; every completed workout awards XP exactly once', () => {
  let session = skipPreparation(createSession(DEFAULT_ROUTINE, 'unique'));
  assert.equal(session.phase, 'active'); assert.deepEqual(session.skippedExerciseIds, []);
  for (let index = 0; index < 7; index++) session = skipExercise(session, DEFAULT_ROUTINE);
  assert.equal(session.phase, 'complete'); assert.equal(session.skippedExerciseIds.length, 7);
  const completion = completionFor(session, DEFAULT_ROUTINE, new Date(Date.now() + 1000));
  const once = recordCompletion([], completion);
  assert.equal(recordCompletion(once, completion), once); assert.equal(once[0].xp, 10);
  const data = { ...freshData(), session, completions: once };
  assert.deepEqual(parseImport(JSON.stringify(data)), data);
});
test('strict backup validation rejects invalid versions, dates, duplicate XP, progress and oversized JSON', async () => {
  const data = freshData();
  assert.throws(() => parseImport(JSON.stringify({ ...data, version: 2 })), /version/);
  assert.throws(() => parseImport(JSON.stringify({ ...data, settings: { ...data.settings, voiceEnabled: 'yes' } })), /voiceEnabled/);
  assert.throws(() => parseImport('not-json'), /JSON/);
  assert.throws(() => parseImport(' '.repeat(MAX_IMPORT_BYTES + 1)), /2 MB/);
  const session = createSession(DEFAULT_ROUTINE, 'invalid');
  assert.throws(() => parseImport(JSON.stringify({ ...data, session: { ...session, exerciseIndex: 4 } })), /progress/);
  assert.throws(() => parseImport(JSON.stringify({ ...data, session: { ...session, startedAt: '2026-02-31T10:00:00.000Z' } })), /ISO date/);
  let completed = session;
  for (let index = 0; index < 7; index++) completed = skipExercise(completed, DEFAULT_ROUTINE);
  const record = completionFor(completed, DEFAULT_ROUTINE, new Date(Date.now() + 1000));
  assert.throws(() => parseImport(JSON.stringify({ ...data, completions: [record, record] })), /Duplicate/);
  assert.throws(() => parseImport(JSON.stringify({ ...data, completions: [{ ...record, xp: 999 }] })), /XP/);
  assert.throws(() => parseImport(JSON.stringify({ ...data, session: completed })), /matching/);
  await assert.rejects(readImport(new File(['{}'], 'backup.exe', { type: 'application/json' })), /JSON backup/);
});
test('storage errors are surfaced and corrupted existing storage is not modified by loading', () => {
  assert.throws(() => saveData({ setItem: () => { throw new Error('quota'); } }, freshData()), /could not be saved/);
  let reads = 0;
  const loaded = loadData({ getItem: key => { assert.equal(key, STORAGE_KEY); reads++; return 'broken'; } });
  assert.equal(reads, 1); assert.match(loaded.error!, /could not be loaded/); assert.equal(loaded.data.session, null);
});
test('statistics use local calendar dates, Monday weeks and consecutive workout days', () => {
  const now = new Date(2026, 9, 7, 12); // Wednesday in device timezone.
  const dates = [new Date(2026, 9, 4, 23, 59), new Date(2026, 9, 5, 0, 1), new Date(2026, 9, 6, 12), new Date(2026, 9, 7, 11), new Date(2026, 9, 7, 11, 30)];
  const records = dates.map((date, index) => ({ id: `stats-${index}`, routineId: DEFAULT_ROUTINE.id, startedAt: date.toISOString(), completedAt: date.toISOString(), elapsedMs: 0, xp: 10, completedExerciseIds: [], skippedExerciseIds: DEFAULT_ROUTINE.exercises.map(item => item.id) }));
  const stats = getStats(records, now);
  assert.equal(stats.totalXp, 50); assert.equal(stats.thisWeek, 4); assert.equal(stats.lastSevenDays, 5); assert.equal(stats.currentStreak, 4);
  assert.equal(stats.calendar.length, 31);
  assert.equal(stats.calendar.find(day => day.date === localDateKey(now))?.count, 2);
  assert.equal(getStats(records.slice(0, 3), now).currentStreak, 3);
});
