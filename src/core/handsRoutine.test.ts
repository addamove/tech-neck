import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROUTINE, HANDS_ROUTINE, ROUTINES } from './config';
import { advanceSession, completionFor, createSession, getFrame, getPose, recordCompletion } from './engine';
import { freshData, loadData, parseImport } from './persistence';
import { getStats } from './stats';
import { getAchievements } from './achievements';
import { getActivityCharts } from './activityCharts';
import { activeVoiceTimeline, preparationInstructionSeconds, preparationVoiceTimeline } from './voiceTiming';
import type { Completion, Routine } from './types';

const now = new Date('2027-01-20T12:00:00.000Z');
function finished(routine: Routine, id: string, date = new Date('2027-01-01T12:00:00.000Z')): Completion {
  const total = routine.exercises.reduce((sum, item) => sum + item.prepSeconds + item.durationSeconds, 0) * 1000;
  const start = new Date(date.getTime() - total);
  return completionFor(advanceSession(createSession(routine, id, start), total, routine), routine, date);
}

test('hands routine has five six-cycle movements: 180 active seconds, 75 preparation and five XP', () => {
  assert.equal(ROUTINES.length, 2); assert.equal(HANDS_ROUTINE.id, 'hands-level-1'); assert.equal(HANDS_ROUTINE.xp, 5);
  assert.deepEqual(HANDS_ROUTINE.exercises.map(exercise => exercise.id), ['hands-spread', 'hands-bends', 'hands-wrist-bends', 'hands-palm-turns', 'hands-wrist-sides']);
  assert.equal(getFrame(null, HANDS_ROUTINE).workRemainingSeconds, 180); assert.equal(getFrame(null, HANDS_ROUTINE).totalRemainingSeconds, 255);
  for (const exercise of HANDS_ROUTINE.exercises) {
    assert.equal(exercise.prepSeconds, 15); assert.equal(exercise.durationSeconds, 36);
    assert.deepEqual(exercise.poses.map(pose => pose.seconds), [3, 3]); assert.equal(exercise.poses.some(pose => pose.isRest), false);
    for (let second = 0; second < 36; second += 3) assert.equal(getPose(exercise, second).poseId, `${exercise.id}-${second % 6 === 0 ? 'a' : 'b'}`);
    assert.deepEqual(preparationVoiceTimeline(exercise).map(cue => cue.atSeconds), [12, 13, 14]);
    assert.equal(preparationInstructionSeconds(exercise, 0), 12);
    assert.deepEqual(activeVoiceTimeline(exercise, 'hands-session').map(cue => [cue.atSeconds, cue.text]), [[0, 'Start.'], [12, exercise.cues[0].text]]);
  }
  const record = finished(HANDS_ROUTINE, 'hands-finished');
  assert.equal(record.elapsedMs, 255000); assert.equal(record.xp, 5); assert.equal(record.completedExerciseIds.length, 5);
  assert.equal(recordCompletion([record], record).length, 1);
});

test('mixed history preserves neck XP and routine-specific validation through version1 backups', () => {
  const records = [finished(DEFAULT_ROUTINE, 'neck'), finished(HANDS_ROUTINE, 'hands')];
  const data = freshData(); data.completions = records; data.settings.selectedRoutineId = HANDS_ROUTINE.id;
  data.session = { ...advanceSession(createSession(DEFAULT_ROUTINE, 'saved-neck'), 22000, DEFAULT_ROUTINE), paused: true };
  const serialized = JSON.stringify(data);
  assert.deepEqual(parseImport(serialized), data); assert.deepEqual(loadData({ getItem: () => serialized }).data, data);
  assert.equal(getStats(records, now).totalXp, 15); assert.equal(data.session.routineId, DEFAULT_ROUTINE.id);
  assert.throws(() => parseImport(JSON.stringify({ ...data, completions: [{ ...records[1], xp: 10 }] })), /XP/);
  assert.throws(() => parseImport(JSON.stringify({ ...data, completions: [{ ...records[0], xp: 5 }] })), /XP/);
  assert.throws(() => parseImport(JSON.stringify({ ...data, completions: [{ ...records[1], elapsedMs: 255001 }] })), /elapsedMs/);
  assert.throws(() => parseImport(JSON.stringify({ ...data, completions: [{ ...records[1], completedExerciseIds: records[0].completedExerciseIds }] })), /exercise IDs/);
  assert.equal(parseImport(JSON.stringify(freshData())).settings.selectedRoutineId, 'level-1');
});

test('ten mixed workouts unlock shared charts while hands milestones count only hands history', () => {
  const neck = Array.from({ length: 5 }, (_, index) => finished(DEFAULT_ROUTINE, `neck-${index}`));
  const hands = Array.from({ length: 5 }, (_, index) => finished(HANDS_ROUTINE, `hands-${index}`));
  const records = [...neck, ...hands];
  assert.equal(getActivityCharts(records.slice(0, 9), now).eligible, false);
  const charts = getActivityCharts(records, now);
  assert.equal(charts.eligible, true); assert.equal(charts.totalSessions, 10);
  assert.equal(charts.hours.reduce((sum, hour) => sum + hour.count, 0), 10); assert.equal(charts.weekdays.reduce((sum, day) => sum + day.count, 0), 10);
  assert.equal(getStats(records, now).totalXp, 75);
  const badges = getAchievements(records, now);
  assert.equal(badges.find(badge => badge.id === 'sessions-10')!.unlocked, true);
  assert.equal(badges.find(badge => badge.id === 'hands-first')!.unlocked, true); assert.equal(badges.find(badge => badge.id === 'hands-five')!.unlocked, true);
  assert.equal(badges.find(badge => badge.id === 'hands-ten')!.progress, 5); assert.equal(badges.find(badge => badge.id === 'hands-days-7')!.progress, 1);
  assert.ok(getAchievements(neck, now).filter(badge => badge.routineId === HANDS_ROUTINE.id).every(badge => !badge.unlocked && badge.progress === 0));
});

test('hands day milestone needs seven distinct local days and retains first unlock date through import and history reordering', () => {
  const records = Array.from({ length: 10 }, (_, index) => finished(HANDS_ROUTINE, `day-${index}`, new Date(2027, 0, Math.min(index + 1, 7), 12, index)));
  const future = finished(HANDS_ROUTINE, 'future', new Date('2028-01-01T12:00:00.000Z'));
  const imported = parseImport(JSON.stringify({ ...freshData(), completions: [...records, future] }));
  const badges = getAchievements(imported.completions, now);
  const days = badges.find(badge => badge.id === 'hands-days-7')!;
  assert.equal(days.progress, 7); assert.equal(days.unlockedAt, records[6].completedAt);
  const ten = badges.find(badge => badge.id === 'hands-ten')!;
  assert.equal(ten.progress, 10); assert.equal(ten.unlockedAt, records[9].completedAt);
  assert.deepEqual(getAchievements(imported.completions.slice().reverse(), now), badges);
});
