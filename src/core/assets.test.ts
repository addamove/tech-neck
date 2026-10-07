import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { publicAssetUrl } from './assets';

test('all illustration styles, badges and legacy audio resolve under both root and Pages base paths', () => {
  for (const path of ['art/chin-v2.png', 'art/female/chin.png', 'art/marker/sides.png', 'badges/streak-3.png', 'audio/male/example.mp3']) {
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
    assert.equal(Object.keys(manifest).length, 17);
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
