import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROUTINE } from './config';
import { advanceSession, completionFor, createSession } from './engine';
import { freshData, loadData, parseImport, saveData } from './persistence';
import { getStats } from './stats';
import type { IllustrationStyle } from './types';

test('legacy version1 backups default illustrations to male and preserve the independently chosen voice', () => {
  const old = { ...freshData(), settings: { voiceEnabled: true, voiceRate: 1.2, voiceGender: 'male', wakeLockEnabled: true, selectedRoutineId: DEFAULT_ROUTINE.id } };
  const imported = parseImport(JSON.stringify(old));
  const loaded = loadData({ getItem: () => JSON.stringify(old) });
  assert.equal(freshData().settings.illustrationStyle, 'male');
  assert.equal(imported.version, 1); assert.equal(imported.settings.illustrationStyle, 'male');
  assert.equal(imported.settings.voiceGender, 'male'); assert.equal(imported.settings.voiceRate, 1.2);
  assert.equal(loaded.error, null); assert.equal(loaded.data.settings.illustrationStyle, 'male');
});
test('each illustration choice survives storage/export/import without changing voice, paused session or XP history', () => {
  const now = new Date();
  const completed = advanceSession(createSession(DEFAULT_ROUTINE, 'style-history', new Date(now.getTime() - 700000)), 600000, DEFAULT_ROUTINE);
  const completion = completionFor(completed, DEFAULT_ROUTINE, new Date(now.getTime() - 100000));
  const active = advanceSession(createSession(DEFAULT_ROUTINE, 'style-current', new Date(now.getTime() - 5000)), 5000, DEFAULT_ROUTINE);
  active.paused = true;
  for (const illustrationStyle of ['male', 'female', 'marker'] as IllustrationStyle[]) {
    const data = freshData();
    data.settings.illustrationStyle = illustrationStyle; data.settings.voiceGender = 'male'; data.settings.voiceEnabled = false;
    data.session = active; data.completions = [completion];
    let saved = '';
    saveData({ setItem: (_key, value) => { saved = value; } }, data);
    const restored = loadData({ getItem: () => saved });
    assert.equal(restored.error, null); assert.deepEqual(restored.data, data);
    const exportedAndImported = parseImport(JSON.stringify(restored.data));
    assert.equal(exportedAndImported.settings.illustrationStyle, illustrationStyle);
    assert.equal(exportedAndImported.settings.voiceGender, 'male'); assert.equal(exportedAndImported.settings.voiceEnabled, false);
    assert.deepEqual(exportedAndImported.session, active); assert.deepEqual(exportedAndImported.completions, [completion]);
    assert.equal(getStats(exportedAndImported.completions, now).totalXp, 10);
  }
});
test('invalid explicit illustration values are rejected instead of silently replacing a choice', () => {
  const data = freshData();
  for (const illustrationStyle of ['Female', 'unknown', '', null, true, 42, {}]) {
    assert.throws(() => parseImport(JSON.stringify({ ...data, settings: { ...data.settings, illustrationStyle } })), /illustrationStyle/);
  }
});
