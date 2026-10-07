import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorkoutSpeaker, selectEnglishVoice } from './speech';
import type { SpeechStatus } from './speech';
import { freshData, loadData, parseImport, saveData } from './persistence';
import { DEFAULT_ROUTINE } from './config';

const phrase = 'Inhale while lifting up.';
type Manifest = Record<string, { src: string; duration: number }>;
const female: Manifest = { [phrase]: { src: '/audio/jenny.mp3', duration: 1.6 } };
const male: Manifest = { [phrase]: { src: '/audio/male/andrew.mp3', duration: 1.7 } };
const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));
function response(value: Manifest): Response { return { ok: true, json: async () => value } as Response; }
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function voice(name: string, lang = 'en-US', localService = true): SpeechSynthesisVoice {
  return { name, lang, localService, default: false, voiceURI: name };
}
function mockBrowser(fetcher: (url: string) => Promise<Response>, voices = [voice('Samantha'), voice('Andrew')]) {
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const plays: string[] = [];
  const audios: AudioMock[] = [];
  const utterances: SpeechSynthesisUtterance[] = [];
  let rejectAudio = false;
  class AudioMock {
    src = ''; playbackRate = 1; paused = true;
    onended: (() => void) | null = null; onerror: (() => void) | null = null;
    constructor() { audios.push(this); }
    pause() { this.paused = true; }
    play() {
      this.paused = false; plays.push(this.src);
      if (rejectAudio && !this.src.startsWith('data:')) { this.onerror?.(); return Promise.reject(new Error('Audio decode failed')); }
      return Promise.resolve();
    }
  }
  class UtteranceMock {
    lang = ''; rate = 1; voice: SpeechSynthesisVoice | null = null;
    onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror = null;
    constructor(public text: string) {}
  }
  const synthesis = { cancel() {}, getVoices: () => voices, speak(utterance: SpeechSynthesisUtterance) { utterances.push(utterance); (utterance.onstart as unknown as (() => void) | null)?.(); } };
  const values = { window: { speechSynthesis: synthesis, SpeechSynthesisUtterance: UtteranceMock }, Audio: AudioMock, SpeechSynthesisUtterance: UtteranceMock, fetch: (url: string) => fetcher(url) };
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  return { plays, audios, utterances, failAudio: () => { rejectAudio = true; }, restore() {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  } };
}

test('old version1 imports and saved data migrate to female; invalid explicit genders reject', () => {
  const old = { ...freshData(), settings: { voiceEnabled: false, voiceRate: 1.2, wakeLockEnabled: true, selectedRoutineId: DEFAULT_ROUTINE.id } };
  const imported = parseImport(JSON.stringify(old));
  assert.equal(imported.version, 1); assert.equal(imported.settings.voiceGender, 'female'); assert.equal(imported.settings.voiceEnabled, false);
  assert.equal(loadData({ getItem: () => JSON.stringify(old) }).data.settings.voiceGender, 'female');
  for (const value of [null, true, false, 'MALE', 'neutral', 1, {}]) {
    assert.throws(() => parseImport(JSON.stringify({ ...old, settings: { ...old.settings, voiceGender: value } })), /voiceGender/);
  }
});
test('male selection survives storage/export/import without changing mute, rate or schema', () => {
  const data = freshData(); data.settings.voiceGender = 'male'; data.settings.voiceEnabled = false; data.settings.voiceRate = 1.2;
  let saved = '';
  saveData({ setItem: (_key, value) => { saved = value; } }, data);
  const loaded = loadData({ getItem: () => saved });
  assert.equal(loaded.error, null); assert.deepEqual(loaded.data, data);
  assert.deepEqual(parseImport(JSON.stringify(loaded.data)), data);
});
test('playback selects actual gender collection, preserves female mapping and reuses the activated element', async () => {
  const originalFemale = JSON.stringify(female);
  const browser = mockBrowser(async url => response(url.includes('/male/') ? male : female));
  const statuses: SpeechStatus[] = [];
  const speaker = new WorkoutSpeaker(status => statuses.push(status), '/app/');
  try {
    await flush();
    speaker.speak(phrase, 3, 1);
    assert.equal(browser.audios[0].src, '/app/audio/jenny.mp3');
    const oldEnded = browser.audios[0].onended!;
    speaker.speak(phrase, 3, 1, 'male');
    assert.equal(browser.audios[0].src, '/app/audio/male/andrew.mp3');
    oldEnded(); assert.equal(statuses.at(-1), 'speaking'); // Stale female completion cannot stop male status.
    assert.equal(browser.audios.length, 1); assert.equal(browser.utterances.length, 0);
    assert.equal(JSON.stringify(female), originalFemale);
  } finally { speaker.dispose(); browser.restore(); }
});
test('switching while manifests load cannot resurrect the old voice', async () => {
  const femaleLoad = deferred<Response>(), maleLoad = deferred<Response>();
  const browser = mockBrowser(url => url.includes('/male/') ? maleLoad.promise : femaleLoad.promise);
  const speaker = new WorkoutSpeaker(() => {}, '/');
  try {
    speaker.speak(phrase, 3, 1, 'female');
    speaker.speak(phrase, 3, 1, 'male');
    maleLoad.resolve(response(male)); await flush();
    femaleLoad.resolve(response(female)); await flush();
    assert.deepEqual(browser.plays.filter(src => src.endsWith('.mp3')), ['/audio/male/andrew.mp3']);
    assert.equal(browser.audios[0].paused, false); // Late unlock promise cannot pause the actual recording.
  } finally { speaker.dispose(); browser.restore(); }
});
test('cancel or disposal prevents a delayed manifest from playing a preview', async () => {
  for (const dispose of [false, true]) {
    const loading = deferred<Response>();
    const browser = mockBrowser(async url => url.includes('/male/') ? loading.promise : response(female));
    const speaker = new WorkoutSpeaker(() => {}, '/');
    try {
      speaker.speak(phrase, 3, 1, 'male');
      if (dispose) speaker.dispose(); else speaker.cancel();
      loading.resolve(response(male)); await flush();
      assert.equal(browser.plays.some(src => src.endsWith('.mp3')), false);
      assert.equal(browser.utterances.length, 0);
    } finally { speaker.dispose(); browser.restore(); }
  }
});
test('male instruction does not use a legacy female override; missing male clips use male English fallback once', async () => {
  const browser = mockBrowser(async url => response(url.includes('/male/') ? {} : female));
  const speaker = new WorkoutSpeaker(() => {}, '/');
  try {
    await flush();
    speaker.speak(phrase, 3, 1, 'male', '/audio/legacy-female.mp3');
    assert.equal(browser.plays.some(src => src.includes('legacy-female')), false);
    assert.equal(browser.utterances.length, 1);
    assert.equal(browser.utterances[0].voice?.name, 'Andrew');
    speaker.speak(phrase, 3, 1, 'female');
    browser.failAudio();
    speaker.speak(phrase, 3, 1, 'female'); await flush();
    assert.equal(browser.utterances.length, 2); // onerror plus rejected play creates one fallback, not two.
    assert.equal(browser.utterances.at(-1)?.voice?.name, 'Samantha');
  } finally { speaker.dispose(); browser.restore(); }
});
test('Web Speech fallback uses English name hints without inventing a gender metadata property', () => {
  const voices = [voice('Andrew', 'fr-FR'), voice('Samantha'), voice('Andrew', 'en-US', false), voice('Neutral English')];
  assert.equal(selectEnglishVoice(voices, 'male')?.name, 'Andrew');
  assert.equal(selectEnglishVoice(voices, 'male')?.lang, 'en-US');
  assert.equal(selectEnglishVoice(voices, 'female')?.name, 'Samantha');
  assert.equal(selectEnglishVoice([voice('Unknown', 'en-GB')], 'male')?.name, 'Unknown');
  assert.equal(selectEnglishVoice([voice('Andrew', 'fr-FR')], 'male'), undefined);
});
test('MP3 fitting and preferred settings never exceed 1.5x, and transitions still cancel playback', async () => {
  const longClip: Manifest = { [phrase]: { src: '/audio/long.mp3', duration: 15 } };
  const browser = mockBrowser(async () => response(longClip));
  const statuses: SpeechStatus[] = [];
  const speaker = new WorkoutSpeaker(status => statuses.push(status), '/');
  try {
    await flush();
    for (const [seconds, preferred] of [[0.6, 1], [30, 2], [0.6, 2]]) {
      speaker.speak(phrase, seconds, preferred);
      assert.equal(browser.audios[0].playbackRate, 1.5);
    }
    speaker.speak(phrase, 30, 1.2);
    assert.equal(browser.audios[0].playbackRate, 1.2);
    const staleEnded = browser.audios[0].onended!;
    speaker.cancel();
    assert.equal(browser.audios[0].paused, true);
    assert.equal(browser.audios[0].onended, null);
    staleEnded();
    assert.equal(statuses.at(-1), 'ready');
    assert.equal(browser.utterances.length, 0);
  } finally { speaker.dispose(); browser.restore(); }
});
test('Web Speech fitting and preferred settings never exceed 1.5x', async () => {
  const browser = mockBrowser(async () => response({}));
  const speaker = new WorkoutSpeaker(() => {}, '/');
  const longInstruction = 'Move gently and keep your shoulders relaxed while you follow the next stretch.';
  try {
    await flush();
    for (const [seconds, preferred] of [[0.6, 1], [30, 2], [0.6, 2]]) {
      speaker.speak(longInstruction, seconds, preferred);
      assert.equal(browser.utterances.at(-1)?.rate, 1.5);
    }
    speaker.speak(longInstruction, 30, 1.2);
    assert.equal(browser.utterances.at(-1)?.rate, 1.2);
    assert.equal(browser.utterances.length, 4);
  } finally { speaker.dispose(); browser.restore(); }
});
test('a stalled manifest falls back promptly and late resolution cannot start overlapping MP3 speech', async () => {
  const loading = deferred<Response>();
  const browser = mockBrowser(async () => loading.promise);
  const originalTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  let fire!: () => void;
  const speaker = new WorkoutSpeaker(() => {}, '/');
  try {
    globalThis.setTimeout = ((callback: () => void) => { fire = callback; return 1; }) as unknown as typeof setTimeout;
    globalThis.clearTimeout = (() => {}) as typeof clearTimeout;
    speaker.speak(phrase, 3, 1, 'male');
    fire();
    for (let i = 0; i < 6; i++) await Promise.resolve();
    assert.equal(browser.utterances.length, 1); assert.equal(browser.utterances[0].voice?.name, 'Andrew');
    loading.resolve(response(male));
    for (let i = 0; i < 6; i++) await Promise.resolve();
    assert.equal(browser.plays.some(src => src.endsWith('.mp3')), false);
  } finally {
    globalThis.setTimeout = originalTimeout; globalThis.clearTimeout = originalClearTimeout;
    speaker.dispose(); browser.restore();
  }
});
