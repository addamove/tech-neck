import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { publicAssetUrl } from './assets';
import { DEFAULT_ROUTINE } from './config';
import { cueTimeline } from './engine';
import { COUNTDOWN_CUES, CUE_SLOT_SECONDS, EXERCISE_START_CUE } from './voiceTiming';
import { CHIN_FOCUS_TIP, CHIN_SHOULDERS_TIP, CHIN_TIP_TIMING } from './chinTips';

test('all illustration styles, badges and legacy audio resolve under both root and Pages base paths', () => {
  for (const path of ['art/chin-v2.webp', 'art/female/chin.webp', 'art/marker/sides.webp', 'badges/streak-3.webp', 'audio/male/example.mp3']) {
    assert.equal(publicAssetUrl(path, '/'), `/${path}`);
    assert.equal(publicAssetUrl(`/${path}`, '/'), `/${path}`);
    assert.equal(publicAssetUrl(path, '/tech-neck/'), `/tech-neck/${path}`);
    assert.equal(publicAssetUrl(`/${path}`, '/tech-neck/'), `/tech-neck/${path}`);
  }
  assert.equal(publicAssetUrl('/tech-neck/audio/sample.mp3', '/tech-neck/'), '/tech-neck/audio/sample.mp3');
  assert.equal(publicAssetUrl('audio/sample.mp3', '/tech-neck'), '/tech-neck/audio/sample.mp3');
});
test('remote audio, media blobs, inline unlock audio and SVG fragment references are preserved', () => {
  for (const path of ['https://cdn.example.com/audio.mp3', '//cdn.example.com/audio.mp3', 'blob:https://example.com/session', 'data:audio/wav;base64,UklGRg==', '#home-wave-back']) {
    assert.equal(publicAssetUrl(path, '/tech-neck/'), path);
  }
});
test('both shipped voice manifests reference existing deployable clips under the Pages base without rewriting files', () => {
  let femaleKeys: string[] = [];
  for (const manifestPath of ['audio/manifest.json', 'audio/male/manifest.json']) {
    const source = readFileSync(join('public', manifestPath), 'utf8');
    const manifest = JSON.parse(source) as Record<string, { src: string; duration: number }>;
    for (const exercise of DEFAULT_ROUTINE.exercises) {
      assert.ok(manifest[exercise.description], `Missing instruction: ${exercise.id}`);
      for (const cue of cueTimeline(exercise)) assert.ok(manifest[cue.text], `Missing cue: ${cue.text}`);
    }
    for (const text of [...COUNTDOWN_CUES, EXERCISE_START_CUE]) {
      assert.ok(manifest[text], `Missing countdown clip: ${text}`);
      assert.ok(manifest[text].duration <= CUE_SLOT_SECONDS - 0.1, `Countdown clip exceeds its slot: ${text}`);
    }
    for (const [text, seconds] of [[CHIN_FOCUS_TIP, CHIN_TIP_TIMING.focusSeconds], [CHIN_SHOULDERS_TIP, CHIN_TIP_TIMING.shouldersSeconds]] as const) {
      assert.ok(manifest[text], `Missing chin guidance: ${text}`);
      assert.ok(manifest[text].duration <= seconds, `Chin guidance exceeds its reserved hold: ${text}`);
    }
    if (!femaleKeys.length) femaleKeys = Object.keys(manifest).sort();
    else assert.deepEqual(Object.keys(manifest).sort(), femaleKeys);
    for (const entry of Object.values(manifest)) {
      const deployUrl = publicAssetUrl(entry.src, '/tech-neck/');
      assert.ok(deployUrl.startsWith('/tech-neck/audio/'));
      assert.equal(deployUrl.includes('/tech-neck/tech-neck/'), false);
      assert.ok(existsSync(join('public', deployUrl.slice('/tech-neck/'.length))), `Missing deployed clip: ${deployUrl}`);
      assert.ok(Number.isFinite(entry.duration) && entry.duration > 0);
    }
    assert.equal(readFileSync(join('public', manifestPath), 'utf8'), source);
  }
});
