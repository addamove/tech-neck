import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getRoutine } from './config';
import { advanceSession, completionFor, createSession, cueTimeline, getFrame, recordCompletion, skipExercise, skipPreparation } from './engine';
import { freshData, loadData, readImport, saveData } from './persistence';
import { getStats } from './stats';
import { getAchievements } from './achievements';
import { useCalendarClock } from './useCalendarClock';
import { WorkoutSpeaker } from './speech';
import type { SpeechStatus } from './speech';
import type { AppData, Session, Settings, VoiceGender } from './types';
import { useWakeLock } from './useWakeLock';

function initialData() {
  try { return loadData(window.localStorage); }
  catch { return { data: freshData(), error: 'Device storage is unavailable. Export a backup before closing the app.' }; }
}
export function useWorkout(options: { routineId?: string } = {}) {
  const calendarClock = useCalendarClock();
  const [initial] = useState(initialData);
  const [data, setData] = useState<AppData>(initial.data);
  const [storageError, setStorageError] = useState<string | null>(initial.error);
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>('ready');
  const dataRef = useRef(data); dataRef.current = data;
  const preferredGender = useRef(data.settings.voiceGender); preferredGender.current = data.settings.voiceGender;
  const previewPlaying = useRef(false);
  const currentSpeechStatus = useRef<SpeechStatus>('ready');
  const speakerRef = useRef<WorkoutSpeaker | null>(null);
  const speechPhase = useRef('');
  const cueElapsed = useRef(-1);
  const timerMark = useRef(0);
  const routine = getRoutine(data.session?.routineId ?? options.routineId ?? data.settings.selectedRoutineId);
  const session = data.session;
  const exercise = routine.exercises[session?.exerciseIndex ?? 0];
  const running = Boolean(session && !session.paused && session.phase !== 'complete');
  const wakeLockStatus = useWakeLock(running && data.settings.wakeLockEnabled);

  useEffect(() => {
    const speaker = new WorkoutSpeaker(status => {
      currentSpeechStatus.current = status;
      if (status !== 'speaking') previewPlaying.current = false;
      setSpeechStatus(status);
    }); speakerRef.current = speaker;
    return () => { speaker.dispose(); speakerRef.current = null; };
  }, []);
  const withSession = useCallback((previous: AppData, nextSession: Session | null): AppData => {
    return { ...previous, session: nextSession, completions: nextSession?.phase === 'complete' ? recordCompletion(previous.completions, completionFor(nextSession, getRoutine(nextSession.routineId))) : previous.completions };
  }, []);
  const flush = useCallback(() => {
    const now = performance.now();
    const delta = Math.max(0, now - timerMark.current); timerMark.current = now;
    setData(previous => previous.session && !previous.session.paused ? withSession(previous, advanceSession(previous.session, delta, getRoutine(previous.session.routineId))) : previous);
  }, [withSession]);
  const pause = useCallback(() => {
    if (timerMark.current) flush();
    speakerRef.current?.cancel();
    setData(previous => previous.session ? { ...previous, session: { ...previous.session, paused: true } } : previous);
  }, [flush]);
  useEffect(() => {
    if (!running) return;
    timerMark.current = performance.now();
    const timer = window.setInterval(flush, 100);
    const onVisibility = () => { if (document.visibilityState !== 'visible') pause(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', pause);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('pagehide', pause); };
  }, [running, flush, pause]);

  const speakPreparation = useCallback((nextSession: Session, settings: Settings) => {
    const nextExercise = getRoutine(nextSession.routineId).exercises[nextSession.exerciseIndex];
    speechPhase.current = `${nextSession.id}:${nextSession.exerciseIndex}:prep`;
    cueElapsed.current = -1;
    if (settings.voiceEnabled) speakerRef.current?.speak(nextExercise.description, nextExercise.prepSeconds - nextSession.phaseElapsedMs / 1000, settings.voiceRate, settings.voiceGender, nextExercise.instructionAudio);
  }, []);
  useEffect(() => {
    if (previewPlaying.current) return;
    if (!running || !session || !data.settings.voiceEnabled) { speakerRef.current?.cancel(); return; }
    const phaseKey = `${session.id}:${session.exerciseIndex}:${session.phase}`;
    if (speechPhase.current !== phaseKey) {
      speakerRef.current?.cancel(); speechPhase.current = phaseKey; cueElapsed.current = -1;
      if (session.phase === 'prep') speakPreparation(session, data.settings);
    }
    if (session.phase !== 'active') return;
    const elapsed = session.phaseElapsedMs / 1000;
    const timeline = cueTimeline(exercise);
    const due = timeline.filter(cue => cue.atSeconds > cueElapsed.current && cue.atSeconds <= elapsed);
    cueElapsed.current = elapsed;
    const cue = due.at(-1);
    if (!cue || elapsed - cue.atSeconds > 2) return;
    const following = timeline.find(item => item.atSeconds > cue.atSeconds);
    const deadline = Math.min(exercise.durationSeconds, following?.atSeconds ?? exercise.durationSeconds);
    speakerRef.current?.speak(cue.text, deadline - elapsed, data.settings.voiceRate, data.settings.voiceGender);
  }, [session, exercise, running, data.settings.voiceEnabled, data.settings.voiceRate, data.settings.voiceGender, speakPreparation]);

  const lastSaved = useRef({ data, at: 0, trusted: !initial.error });
  useEffect(() => {
    // A failed read must leave the original backup intact, including when
    // fresh fallback settings change. Only a validated import can replace it.
    if (initial.error && lastSaved.current.trusted !== true) return;
    if (lastSaved.current.data === data) return;
    const previous = lastSaved.current.data;
    const urgent = previous.settings !== data.settings || previous.completions !== data.completions || previous.session?.paused !== data.session?.paused || previous.session?.phase !== data.session?.phase || previous.session?.exerciseIndex !== data.session?.exerciseIndex || previous.session?.id !== data.session?.id;
    if (!urgent && Date.now() - lastSaved.current.at < 1000) return;
    try { saveData(window.localStorage, data); lastSaved.current = { data, at: Date.now(), trusted: true }; setStorageError(null); }
    catch (error) { setStorageError(error instanceof Error ? error.message : 'Device storage is unavailable.'); }
  }, [data, initial.error]);
  useEffect(() => {
    const saveBeforeClose = () => {
      if (initial.error && lastSaved.current.trusted !== true) return;
      try { const current = dataRef.current; saveData(window.localStorage, { ...current, session: current.session ? { ...current.session, paused: true } : null }); }
      catch { /* The existing in-app storage message already provides recovery guidance. */ }
    };
    window.addEventListener('pagehide', saveBeforeClose);
    return () => window.removeEventListener('pagehide', saveBeforeClose);
  }, [initial.error]);

  const start = useCallback((routineId?: string) => {
    const current = dataRef.current;
    const selected = getRoutine(routineId ?? options.routineId ?? current.settings.selectedRoutineId);
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const nextSession = createSession(selected, id);
    timerMark.current = performance.now();
    // Play synchronously within the button gesture so bundled audio unlocks on phones.
    speakPreparation(nextSession, current.settings);
    setData(previous => ({ ...previous, session: nextSession, settings: { ...previous.settings, selectedRoutineId: selected.id } }));
  }, [options.routineId, speakPreparation]);
  const resume = useCallback(() => {
    const current = dataRef.current;
    if (!current.session || current.session.phase === 'complete' || document.visibilityState !== 'visible') return;
    timerMark.current = performance.now();
    if (current.session.phase === 'prep') speakPreparation(current.session, current.settings);
    else if (current.settings.voiceEnabled) speakerRef.current?.unlock();
    setData(previous => previous.session ? { ...previous, session: { ...previous.session, paused: false } } : previous);
  }, [speakPreparation]);
  const next = useCallback(() => {
    speakerRef.current?.cancel();
    setData(previous => previous.session ? withSession(previous, skipExercise(previous.session, getRoutine(previous.session.routineId))) : previous);
    timerMark.current = performance.now();
  }, [withSession]);
  const skipPrep = useCallback(() => {
    speakerRef.current?.cancel();
    setData(previous => previous.session ? { ...previous, session: skipPreparation(previous.session) } : previous);
    timerMark.current = performance.now();
  }, []);
  const stop = useCallback(() => { speakerRef.current?.cancel(); setData(previous => ({ ...previous, session: null })); }, []);
  const updateSettings = useCallback((settings: Partial<Settings>) => {
    if (settings.voiceEnabled === false) speakerRef.current?.cancel();
    const changesGender = settings.voiceGender !== undefined && settings.voiceGender !== dataRef.current.settings.voiceGender;
    if (settings.voiceGender !== undefined) preferredGender.current = settings.voiceGender;
    if (changesGender) speakerRef.current?.cancel();
    if (settings.voiceEnabled === true || changesGender) { speakerRef.current?.unlock(); speechPhase.current = ''; }
    setData(previous => ({ ...previous, settings: { ...previous.settings, ...settings, voiceRate: Math.max(0.5, Math.min(2, settings.voiceRate !== undefined && Number.isFinite(settings.voiceRate) ? settings.voiceRate : previous.settings.voiceRate)), selectedRoutineId: getRoutine(settings.selectedRoutineId ?? previous.settings.selectedRoutineId).id } }));
  }, []);
  const previewVoice = useCallback((gender?: VoiceGender) => {
    const settings = dataRef.current.settings;
    // Explicit preview is available even with workout guidance muted or paused.
    speakerRef.current?.speak('Inhale while lifting up.', 3, settings.voiceRate, gender ?? preferredGender.current);
    previewPlaying.current = currentSpeechStatus.current === 'speaking';
  }, []);
  const exportData = useCallback(() => JSON.stringify(dataRef.current, null, 2), []);
  const importData = useCallback(async (file: File) => {
    const imported = await readImport(file);
    if (imported.session) imported.session.paused = true;
    // One storage write after complete validation. Failed writes leave current state intact.
    saveData(window.localStorage, imported);
    speakerRef.current?.cancel(); speechPhase.current = ''; cueElapsed.current = -1;
    lastSaved.current = { data: imported, at: Date.now(), trusted: true };
    setData(imported); setStorageError(null);
  }, []);
  const resetStats = useCallback(() => setData(previous => ({ ...previous, completions: [], session: previous.session?.phase === 'complete' ? null : previous.session })), []);
  const frame = useMemo(() => getFrame(session, routine), [session, routine]);
  const stats = useMemo(() => getStats(data.completions), [data.completions, calendarClock]);
  const achievements = useMemo(() => getAchievements(data.completions), [data.completions, calendarClock]);
  return { data, session, routine, exercise, frame, settings: data.settings, stats, achievements, storageError, speechStatus, wakeLockStatus, start, pause, resume, next, skipPreparation: skipPrep, stop, updateSettings, previewVoice, exportData, importData, resetStats };
}
