import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTINES, getSelectedRoutine } from './config';
import { advanceSession, completionFor, createSession } from './engine';
import { freshData, loadData, readImport, saveData } from './persistence';
import { ACHIEVEMENT_DEFINITIONS, achievementXp, getAchievements } from './achievements';
import { getStats } from './stats';
import { getXpTimeline } from './xpTimeline';
import type { AppData, Settings } from './types';

const now = new Date(2026, 9, 14, 23, 59);
function settingsForEveryLevel(): Settings {
  const settings = freshData().settings;
  settings.selectedRoutineId = 'eye-gym-level-2';
  settings.preparationSeconds = 5;
  settings.exerciseDurations = {};
  for (const routine of ROUTINES) {
    settings.disabledExerciseIds[routine.id] = [routine.exercises.at(-1)!.id];
    // Include a saved duration for the disabled exercise too.
    settings.exerciseDurations[routine.id] = Object.fromEntries(routine.exercises.map(exercise => [exercise.id, exercise.durationSeconds + 5]));
  }
  return settings;
}
function fixture(): AppData {
  const data = freshData();
  data.settings = settingsForEveryLevel();
  function add(routineId: string, day: number, hour: number) {
    const routine = getSelectedRoutine(routineId, data.settings);
    const start = new Date(2026, 8, day, hour);
    const milliseconds = routine.exercises.reduce((sum, e) => sum + e.prepSeconds + e.durationSeconds, 0) * 1000;
    const session = advanceSession(createSession(routine, `backup-${data.completions.length}`, start), milliseconds, routine);
    data.completions.push(completionFor(session, routine, new Date(+start + milliseconds)));
  }
  for (let day = 1; day <= 30; day++) add(day % 2 ? 'level-1' : 'level-2', day, 9);
  for (let day = 1; day <= 10; day++) add('hands-level-1', day, 10);
  for (let day = 1; day <= 5; day++) for (let index = 0; index < 3; index++) add(index === 1 ? 'eye-gym-level-2' : 'eye-gym', day, 11 + index);
  add('night-stretch', 1, 19);
  add('night-stretch-level-2', 2, 19);
  add('back-care', 3, 18);
  add('back-care-level-2', 4, 18);
  return data;
}
async function restoreExport(data: AppData): Promise<AppData> {
  // Same JSON serialization and file validation used by the Settings actions.
  const file = new File([JSON.stringify(data, null, 2)], 'tech-neck-backup.json', { type: 'application/json' });
  const imported = await readImport(file);
  let serialized = '';
  saveData({ setItem: (_key, value) => { serialized = value; } }, imported);
  const restored = loadData({ getItem: () => serialized });
  assert.equal(restored.error, null);
  return restored.data;
}

test('file export/import retains exercise toggles and durations for all families, including hidden levels', async () => {
  const original = fixture();
  const restored = await restoreExport(original);
  assert.deepEqual(restored.settings, original.settings);
  assert.deepEqual(restored.completions, original.completions);
  for (const routine of ROUTINES) assert.deepEqual(getSelectedRoutine(routine.id, restored.settings), getSelectedRoutine(routine.id, original.settings));
});

test('all achievements, unlock dates, partial progress and XP survive repeated file restores', async () => {
  const original = fixture();
  const earned = getAchievements(original.completions, now);
  assert.equal(earned.length, ACHIEVEMENT_DEFINITIONS.length);
  assert.ok(earned.every(badge => badge.unlocked), 'Fixture must exercise every achievement');
  const expectedXp = original.completions.reduce((sum, completion) => sum + completion.xp, 0) + earned.reduce((sum, badge) => sum + achievementXp(badge.id), 0);
  let restored = original;
  for (let pass = 0; pass < 3; pass++) {
    restored = await restoreExport(restored);
    assert.deepEqual(getAchievements(restored.completions, now), earned);
    assert.deepEqual(getStats(restored.completions, now), getStats(original.completions, now));
    assert.equal(getStats(restored.completions, now).totalXp, expectedXp);
    assert.deepEqual(getXpTimeline(restored.completions, now), getXpTimeline(original.completions, now));
  }
  for (const count of [0, 2, 9, 29, 34, 42, 54]) {
    const partial = { ...original, completions: original.completions.slice(0, count) };
    const imported = await restoreExport(partial);
    assert.deepEqual(getAchievements(imported.completions, now), getAchievements(partial.completions, now));
  }
});
