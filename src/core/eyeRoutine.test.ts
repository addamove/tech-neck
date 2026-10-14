import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { EYE_ROUTINE, EYE_LEVEL_2_ROUTINE } from './eyeRoutine';
import { getSelectedRoutine } from './config';
import { advanceSession, completionFor, createSession, getPose } from './engine';
import { activeVoiceTimeline, dueVoiceCue } from './voiceTiming';
import { freshData, parseImport } from './persistence';
import { getStats } from './stats';
import { getActivityCharts } from './activityCharts';

test('Eye Gym has two minutes of exercises then one minute palming, excluding preparation', () => {
  assert.deepEqual(EYE_ROUTINE.exercises.map(exercise => exercise.durationSeconds), [30, 60, 30, 60]);
  assert.equal(EYE_ROUTINE.exercises.at(-1)!.id, 'eye-palming');
  const blinks = EYE_ROUTINE.exercises[0];
  for (let cycle = 0; cycle < 5; cycle++) {
    for (const [offset, pose] of [[0, 'eyes-open'], [2, 'eyes-closed'], [4, 'eyes-squeeze']] as const) {
      assert.equal(getPose(blinks, cycle * 6 + offset).poseId, pose);
      assert.equal(getPose(blinks, cycle * 6 + offset + 1.999).poseId, pose);
    }
  }
  const circles = EYE_ROUTINE.exercises[2];
  assert.equal(getPose(circles, 14.999).poseId, 'eyes-circle-clockwise');
  assert.equal(getPose(circles, 15).poseId, 'eyes-circle-counterclockwise');
});

test('Eye Gym Level 2 changes only palming to three minutes and keeps release in the final five seconds', () => {
  assert.equal(EYE_LEVEL_2_ROUTINE.family, 'eyes');
  assert.deepEqual(EYE_LEVEL_2_ROUTINE.exercises.map(exercise => exercise.durationSeconds), [30, 60, 30, 180]);
  assert.deepEqual(EYE_LEVEL_2_ROUTINE.exercises.slice(0, 3), EYE_ROUTINE.exercises.slice(0, 3));
  const palming = EYE_LEVEL_2_ROUTINE.exercises[3];
  assert.deepEqual(palming.cues.map(cue => cue.atSeconds), [0, 30, 175]);
  assert.equal(getPose(palming, 179.999).poseId, 'eyes-palming');
  const routine = getSelectedRoutine(EYE_LEVEL_2_ROUTINE.id, { preparationSeconds: 5, disabledExerciseIds: {} });
  assert.equal(routine.exercises.reduce((sum, exercise) => sum + exercise.durationSeconds, 0), 300);
  assert.equal(routine.exercises.reduce((sum, exercise) => sum + exercise.prepSeconds, 0), 20);
  const session = advanceSession(createSession(routine, 'eye-level-two'), 320000, routine);
  assert.equal(session.phase, 'complete');
  const completion = completionFor(session, routine);
  assert.equal(completion.xp, 5);
  assert.equal(parseImport(JSON.stringify({ ...freshData(), session, completions: [completion] })).completions[0].routineId, EYE_LEVEL_2_ROUTINE.id);
});

test('Eye Gym voice cues are unique, fit their slots in both voices and match blink boundaries', () => {
  for (const gender of ['', 'male/']) {
    const manifest = JSON.parse(readFileSync(`public/audio/${gender}manifest.json`, 'utf8'));
    for (const exercise of [...EYE_ROUTINE.exercises, EYE_LEVEL_2_ROUTINE.exercises[3]]) {
      const timeline = activeVoiceTimeline(exercise);
      assert.equal(new Set(timeline.map(cue => cue.atSeconds)).size, timeline.length);
      for (const cue of timeline) {
        const due = dueVoiceCue(timeline, cue.atSeconds - 0.001, cue.atSeconds, exercise.durationSeconds)!;
        assert.ok(manifest[cue.text], cue.text);
        assert.ok(manifest[cue.text].duration <= due.availableSeconds, `${gender}${cue.text}`);
      }
    }
  }
  const blinks = activeVoiceTimeline(EYE_ROUTINE.exercises[0]);
  assert.deepEqual(blinks.filter(cue => cue.text === 'Close.').map(cue => cue.atSeconds), [2, 8, 14, 20, 26]);
  assert.deepEqual(blinks.filter(cue => cue.text === 'Gently squeeze.').map(cue => cue.atSeconds), [4, 10, 16, 22, 28]);
  assert.deepEqual(blinks.filter(cue => cue.text === 'Open.').map(cue => cue.atSeconds), [6, 12, 18, 24]);
  assert.equal(blinks.length, 15); // Start plus fourteen movement cues.
  assert.equal(blinks[0].text, 'Start.');
  assert.ok(blinks.slice(1).every(cue => cue.atSeconds >= 2 && cue.atSeconds < 30));
  assert.match(EYE_ROUTINE.exercises[2].description, /keep them closed/);
  assert.ok(EYE_ROUTINE.exercises[2].poses.every(pose => pose.label.startsWith('Eyes closed')));
  for (const file of ['open', 'closed', 'distance', 'palming', 'circles']) assert.ok(existsSync(`public/art/eye-gym/${file}.webp`));
});

test('Eye Gym respects preparation, disabled exercises and joins the same activity charts', () => {
  const data = freshData();
  data.settings.selectedRoutineId = EYE_ROUTINE.id;
  data.settings.preparationSeconds = 5;
  data.settings.disabledExerciseIds = { 'eye-gym': ['eye-circles'] };
  const routine = getSelectedRoutine(EYE_ROUTINE.id, data.settings);
  assert.equal(routine.exercises.length, 3);
  const now = new Date('2026-10-13T10:00:00.000Z');
  const session = createSession(routine, 'eye-test', now);
  const total = routine.exercises.reduce((sum, exercise) => sum + exercise.durationSeconds + exercise.prepSeconds, 0);
  const finished = advanceSession(session, total * 1000, routine);
  assert.equal(finished.phase, 'complete');
  const record = completionFor(finished, routine, new Date(now.getTime() + total * 1000));
  const imported = parseImport(JSON.stringify({ ...data, session: finished, completions: [record] }));
  assert.equal(imported.completions[0].xp, 5);
  assert.equal(imported.settings.selectedRoutineId, 'eye-gym');
  assert.equal(getStats(imported.completions, new Date('2026-10-14T00:00:00.000Z')).totalSessions, 1);
  assert.equal(getActivityCharts(imported.completions, new Date('2026-10-14T00:00:00.000Z')).totalSessions, 1);
});
