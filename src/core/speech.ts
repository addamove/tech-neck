import type { VoiceGender } from './types';
import { publicAssetUrl } from './assets';
import { COUNTDOWN_CUES, EXERCISE_START_CUE } from './voiceTiming';
export type SpeechStatus = 'ready' | 'speaking' | 'unavailable';
interface AudioEntry { src: string; duration: number }
type AudioManifest = Record<string, AudioEntry>;
const MAX_SPEECH_RATE = 1.5;

/** Web Speech exposes no gender metadata. Name hints are a best-effort fallback. */
export function selectEnglishVoice(voices: SpeechSynthesisVoice[], gender: VoiceGender): SpeechSynthesisVoice | undefined {
  const hints = gender === 'male' ? /\b(Andrew|Guy|Daniel|David|Alex|Fred|George|Thomas)\b/i : /\b(Jenny|Samantha|Zira|Aria|Karen|Victoria|Tessa|Susan|Hazel)\b/i;
  const english = voices.filter(voice => /^en(?:-|_)/i.test(voice.lang));
  const preferred = english.filter(voice => hints.test(voice.name));
  return preferred.find(voice => voice.localService) ?? preferred[0] ?? english.find(voice => voice.localService) ?? english[0];
}
export class WorkoutSpeaker {
  private generation = 0;
  private audio: HTMLAudioElement | null = null;
  private manifests: Partial<Record<VoiceGender, AudioManifest>> = {};
  private loads: Record<VoiceGender, Promise<AudioManifest>>;
  private disposed = false;
  constructor(private onStatus: (status: SpeechStatus) => void, private baseUrl = import.meta.env.BASE_URL) {
    const load = (gender: VoiceGender, path: string): Promise<AudioManifest> => fetch(publicAssetUrl(path, baseUrl))
      .then(response => response.ok ? response.json() : {})
      .then(value => {
        const manifest = value && typeof value === 'object' && !Array.isArray(value) ? value as AudioManifest : {};
        if (!this.disposed) this.manifests[gender] = manifest;
        return manifest;
      }).catch(() => { if (!this.disposed) this.manifests[gender] = {}; return {}; });
    this.loads = { female: load('female', 'audio/manifest.json'), male: load('male', 'audio/male/manifest.json') };
  }
  cancel() {
    this.generation++;
    if (this.audio) { this.audio.pause(); this.audio.onended = null; this.audio.onerror = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (!this.disposed) this.onStatus('ready');
  }
  unlock() {
    // A tiny silent WAV activates the reusable media element within a Resume
    // or voice-toggle gesture, including when restoring an active workout.
    this.audio ??= new Audio();
    const samples = 80;
    const wav = new Uint8Array(44 + samples);
    const view = new DataView(wav.buffer);
    const write = (offset: number, text: string) => { for (let i = 0; i < text.length; i++) wav[offset + i] = text.charCodeAt(i); };
    write(0, 'RIFF'); view.setUint32(4, 36 + samples, true); write(8, 'WAVE'); write(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, 8000, true); view.setUint32(28, 8000, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true);
    write(36, 'data'); view.setUint32(40, samples, true); wav.fill(128, 44);
    const audio = this.audio;
    const source = `data:audio/wav;base64,${btoa(String.fromCharCode(...wav))}`;
    audio.src = source;
    const generation = this.generation;
    void audio.play().then(() => { if (generation === this.generation && audio.src === source) audio.pause(); }).catch(() => {});
  }
  dispose() { this.cancel(); this.disposed = true; }
  speak(text: string, availableSeconds: number, preferredRate: number, gender: VoiceGender = 'female', customAudio?: string) {
    this.cancel();
    // Short recorded numbers can still fit after resuming midway through a
    // countdown beat; long instructions retain the normal minimum budget.
    const isCountdown = text === EXERCISE_START_CUE || COUNTDOWN_CUES.some(cue => cue === text);
    const minimumSeconds = isCountdown ? 0.15 : 0.5;
    if (availableSeconds < minimumSeconds || this.disposed) return;
    const generation = this.generation;
    const startedAt = performance.now();
    const current = () => generation === this.generation && !this.disposed;
    const remaining = () => availableSeconds - (performance.now() - startedAt) / 1000;
    let fallbackStarted = false;
    const fallback = () => {
      if (!current() || fallbackStarted) return;
      fallbackStarted = true;
      if (remaining() < minimumSeconds) { this.onStatus('ready'); return; }
      if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) { this.onStatus('unavailable'); return; }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      const voice = selectEnglishVoice(window.speechSynthesis.getVoices(), gender);
      if (voice) utterance.voice = voice;
      // Fit when possible, but let the next cue/phase interrupt longer speech
      // rather than making guidance too fast to follow.
      const estimate = text.trim().split(/\s+/).length / 2.8;
      utterance.rate = Math.min(MAX_SPEECH_RATE, Math.max(preferredRate, estimate / Math.max(0.3, remaining() - 0.2)));
      utterance.onstart = () => { if (current()) this.onStatus('speaking'); };
      utterance.onend = () => { if (current()) this.onStatus('ready'); };
      utterance.onerror = event => { if (current() && event.error !== 'canceled' && event.error !== 'interrupted') this.onStatus('unavailable'); };
      this.onStatus('speaking');
      window.speechSynthesis.speak(utterance);
    };
    const play = (entry: AudioEntry | undefined) => {
      if (!current()) return;
      if (remaining() < minimumSeconds) { this.onStatus('ready'); return; }
      if (!entry || typeof entry.src !== 'string' || !Number.isFinite(entry.duration) || entry.duration <= 0) { fallback(); return; }
      this.audio ??= new Audio();
      const audio = this.audio;
      audio.src = publicAssetUrl(entry.src, this.baseUrl);
      audio.playbackRate = Math.min(MAX_SPEECH_RATE, Math.max(preferredRate, entry.duration / Math.max(0.3, remaining() - 0.1)));
      audio.onended = () => { if (current()) this.onStatus('ready'); };
      audio.onerror = fallback;
      this.onStatus('speaking');
      void audio.play().catch(fallback);
    };
    // Legacy custom recordings are female overrides; male uses its own collection.
    const override = customAudio && gender === 'female' ? { src: customAudio, duration: availableSeconds } : undefined;
    if (override || this.manifests[gender]) { play(override ?? this.manifests[gender]?.[text]); return; }
    this.unlock(); this.onStatus('speaking');
    // A stalled manifest must not leave an explicit preview waiting forever.
    // Keep the shared preload alive, while this utterance falls back promptly.
    let timeout: ReturnType<typeof setTimeout>;
    const boundedLoad = Promise.race([
      this.loads[gender],
      new Promise<AudioManifest>(resolve => { timeout = setTimeout(() => resolve({}), Math.min(1000, availableSeconds * 250)); }),
    ]);
    void boundedLoad.then(manifest => play(manifest[text])).finally(() => clearTimeout(timeout));
  }
}
