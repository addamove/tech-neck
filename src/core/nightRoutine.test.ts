import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { NIGHT_ROUTINE, NIGHT_LEVEL_2_ROUTINE } from './nightRoutine';
import { ROUTINES, getSelectedRoutine } from './config';
import { advanceSession, completionFor, createSession, getPose } from './engine';
import { activeVoiceTimeline, dueVoiceCue } from './voiceTiming';
import { freshData, parseImport } from './persistence';
import { getStats } from './stats';
import { getAchievements } from './achievements';
import { newlyEarnedAchievements } from '../components/achievementCelebration';
import { NIGHT_PICTURES } from '../components/NightArt';

test('Night Stretch lasts five active minutes with balanced sides and a quiet final hold', () => {
  assert.deepEqual(NIGHT_ROUTINE.exercises.map(exercise => exercise.durationSeconds), [60, 30, 60, 30, 60, 60]);
  for (const exercise of NIGHT_ROUTINE.exercises.filter(item => item.poses.length === 2)) {
    assert.equal(getPose(exercise, 29.999).poseId, exercise.poses[0].poseId);
    assert.equal(getPose(exercise, 30).poseId, exercise.poses[1].poseId);
    assert.equal(getPose(exercise, 59.999).poseId, exercise.poses[1].poseId);
    assert.ok(exercise.cues.some(cue => cue.atSeconds === 30));
  }
  assert.equal(NIGHT_ROUTINE.exercises.at(-1)?.id, 'night-butterfly');
});

test('Night Stretch has all three compressed art styles and both voice sets with natural cue windows', () => {
  for (const exercise of [...NIGHT_ROUTINE.exercises, ...NIGHT_LEVEL_2_ROUTINE.exercises]) {
    for (const pose of exercise.poses) for (const style of ['male', 'female', 'marker']) {
      const art = NIGHT_PICTURES[pose.poseId];
      assert.ok(art, pose.poseId);
      assert.ok(existsSync(`public/art/night/${style}/${art.file}.webp`));
    }
    for (const gender of ['', 'male/']) {
      const manifest = JSON.parse(readFileSync(`public/audio/${gender}manifest.json`, 'utf8'));
      assert.ok(manifest[exercise.description], `${gender}${exercise.id} instruction`);
      const timeline = activeVoiceTimeline(exercise);
      assert.equal(new Set(timeline.map(cue => cue.atSeconds)).size, timeline.length);
      for (const cue of timeline) {
        const slot = dueVoiceCue(timeline, cue.atSeconds - 0.001, cue.atSeconds, exercise.durationSeconds)!;
        assert.ok(manifest[cue.text], cue.text);
        assert.ok(manifest[cue.text].duration <= slot.availableSeconds, `${gender}${cue.text}`);
      }
    }
  }
});

test('Night Stretch Level 2 keeps all eleven reference movements in order within 7:30 active time', () => {
  const routine = NIGHT_LEVEL_2_ROUTINE;
  assert.deepEqual(routine.exercises.map(item => item.id), ['night-knees', 'night-twist', 'night-butterfly', 'night-bridge', 'night-child', 'night-neck', 'night-cat-cow', 'night-side-bend', 'night-quad', 'night-mountain', 'night-fold']);
  assert.deepEqual(routine.exercises.map(item => item.durationSeconds), [30, 60, 30, 40, 30, 40, 50, 40, 60, 30, 40]);
  assert.equal(routine.exercises.reduce((sum, item) => sum + item.durationSeconds, 0), 450);
  for (const exercise of routine.exercises) {
    assert.ok(exercise.cues.every(cue => cue.atSeconds < exercise.durationSeconds));
    if (['night-side-bend', 'night-neck'].includes(exercise.id)) {
      assert.equal(getPose(exercise, 19.999).poseId, exercise.poses[0].poseId);
      assert.equal(getPose(exercise, 20).poseId, exercise.poses[1].poseId);
      assert.ok(exercise.cues.some(cue => cue.atSeconds === 20));
    }
  }
  const catCow = routine.exercises.find(item => item.id === 'night-cat-cow')!;
  for (let cycle = 0; cycle < 5; cycle++) {
    assert.equal(getPose(catCow, cycle * 10).poseId, 'night-cat');
    assert.equal(getPose(catCow, cycle * 10 + 5).poseId, 'night-cow');
  }
  const butterfly = routine.exercises.find(item => item.id === 'night-butterfly')!;
  assert.deepEqual(butterfly.cues.map(item => item.atSeconds), [0, 25]);
  assert.equal(NIGHT_ROUTINE.exercises.find(item => item.id === 'night-butterfly')!.durationSeconds, 60);
});

test('Night Stretch saves disabled movements, earns 10 XP and joins overall activity without replacing Full Circle families', () => {
  const data = freshData();
  data.settings.selectedRoutineId = NIGHT_ROUTINE.id;
  data.settings.preparationSeconds = 10;
  data.settings.disabledExerciseIds = { 'night-stretch': ['night-child'] };
  const routine = getSelectedRoutine(NIGHT_ROUTINE.id, data.settings);
  assert.equal(routine.exercises.length, 5);
  const now = new Date(2026, 9, 13, 9);
  const total = routine.exercises.reduce((sum, exercise) => sum + exercise.durationSeconds + exercise.prepSeconds, 0);
  const finished = advanceSession(createSession(routine, 'night-test', now), total * 1000, routine);
  assert.equal(finished.phase, 'complete');
  const completion = completionFor(finished, routine, new Date(now.getTime() + total * 1000));
  assert.equal(completion.xp, 10);
  const imported = parseImport(JSON.stringify({ ...data, session: finished, completions: [completion] }));
  const audit = new Date('2026-10-14T00:00:00.000Z');
  assert.equal(imported.settings.selectedRoutineId, NIGHT_ROUTINE.id);
  assert.equal(getStats(imported.completions, audit).totalSessions, 1);
  assert.equal(getStats(imported.completions, audit).totalXp, 40); // 10 + First Step's existing 30 XP reward.
  const records = ['level-1', 'hands-level-1'].map((id, index) => {
    const other = ROUTINES.find(item => item.id === id)!;
    const elapsed = other.exercises.reduce((sum, item) => sum + item.durationSeconds + item.prepSeconds, 0);
    return completionFor(advanceSession(createSession(other, `other-${index}`, now), elapsed * 1000, other), other, new Date(now.getTime() + elapsed * 1000));
  });
  const fullCircle = getAchievements([...records, completion], audit).find(item => item.id === 'all-three-one-day')!;
  assert.equal(fullCircle.progress, 2);
  assert.equal(fullCircle.unlocked, false);
});


test('Time to Unwind uses local noon, either Night level, and awards its bonus only once', () => {
  const now = new Date(2026, 9, 15);
  const completed = (routineId: string, hour: number, minute: number, id: string) => {
    const routine = ROUTINES.find(item => item.id === routineId)!;
    const at = new Date(2026, 9, 14, hour, minute);
    const duration = routine.exercises.reduce((sum, item) => sum + item.durationSeconds + item.prepSeconds, 0) * 1000;
    const session = advanceSession(createSession(routine, id, new Date(at.getTime() - duration)), duration, routine);
    return { session, record: completionFor(session, routine, at) };
  };
  const morning = completed(NIGHT_ROUTINE.id, 11, 59, 'before-noon');
  const noon = completed(NIGHT_LEVEL_2_ROUTINE.id, 12, 0, 'at-noon');
  const evening = completed(NIGHT_ROUTINE.id, 23, 59, 'before-midnight');
  const badge = (records: typeof noon.record[]) => getAchievements(records, now).find(item => item.id === 'night-unwind')!;
  assert.equal(badge([morning.record]).unlocked, false);
  assert.equal(badge([completed('level-1', 17, 0, 'neck').record]).unlocked, false);
  assert.equal(badge([completed(NIGHT_ROUTINE.id, 0, 0, 'midnight').record]).unlocked, false);
  assert.equal(badge([noon.record]).unlockedAt, noon.record.completedAt);
  assert.equal(badge([evening.record]).unlockedAt, evening.record.completedAt);
  const records = [morning.record, noon.record, evening.record];
  assert.equal(badge([...records].reverse()).unlockedAt, noon.record.completedAt);
  assert.equal(getStats(records, now).totalXp, 30 + 30 + 100);
  const imported = parseImport(JSON.stringify({ ...freshData(), completions: records }));
  assert.equal(getStats([...imported.completions, noon.record], now).totalXp, 160);
  assert.deepEqual(newlyEarnedAchievements(
    { sessionId: noon.session.id, phase: 'active', completions: [morning.record] },
    { sessionId: noon.session.id, phase: 'complete', completions: [morning.record, noon.record] },
  ), ['night-unwind']);
  assert.deepEqual(newlyEarnedAchievements(
    { sessionId: evening.session.id, phase: 'active', completions: [morning.record, noon.record] },
    { sessionId: evening.session.id, phase: 'complete', completions: records },
  ), []);
});
