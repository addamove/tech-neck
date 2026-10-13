import { isPreparationSeconds } from './preparation';
import { rememberRoutineSelection } from './routineFamilies';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ROUTINES, getRoutine, getSelectedRoutine, getSessionRoutine } from './config';
import { advanceSession, completionFor, createSession, getFrame, recordCompletion, skipExercise, skipPreparation } from './engine';
import { freshData, loadData, readImport, saveData } from './persistence';
import { getStats } from './stats';
import { getAchievements } from './achievements';
import { useCalendarClock } from './useCalendarClock';
import { WorkoutSpeaker } from './speech';
import type { SpeechStatus } from './speech';
import type { AppData, Session, Settings, VoiceGender } from './types';
import { useWakeLock } from './useWakeLock';
import { activeVoiceTimeline, dueVoiceCue, preparationInstructionSeconds, preparationVoiceTimeline } from './voiceTiming';

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
  const selectedRoutine = getSelectedRoutine(options.routineId ?? data.settings.selectedRoutineId, data.settings);
  const routine = data.session ? getSessionRoutine(data.session) : selectedRoutine;
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
    return { ...previous, session: nextSession, completions: nextSession?.phase === 'complete' ? recordCompletion(previous.completions, completionFor(nextSession, getSessionRoutine(nextSession))) : previous.completions };
  }, []);
  const flush = useCallback(() => {
    const now = performance.now();
    const delta = Math.max(0, now - timerMark.current); timerMark.current = now;
    setData(previous => previous.session && !previous.session.paused ? withSession(previous, advanceSession(previous.session, delta, getSessionRoutine(previous.session))) : previous);
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
    const nextExercise = getSessionRoutine(nextSession).exercises[nextSession.exerciseIndex];
    speechPhase.current = `${nextSession.id}:${nextSession.exerciseIndex}:prep`;
    cueElapsed.current = -1;
    speakerRef.current?.cancel();
    if (settings.voiceEnabled) {
      const availableSeconds = preparationInstructionSeconds(nextExercise, nextSession.phaseElapsedMs / 1000);
      if (availableSeconds >= 0.5) speakerRef.current?.speak(nextExercise.description, availableSeconds, settings.voiceRate, settings.voiceGender, nextExercise.instructionAudio);
      else speakerRef.current?.unlock(); // Resume within the countdown, not the full description.
    }
  }, []);
  useEffect(() => {
    if (previewPlaying.current) return;
    if (!running || !session || !data.settings.voiceEnabled) { speakerRef.current?.cancel(); return; }
    const phaseKey = `${session.id}:${session.exerciseIndex}:${session.phase}`;
    if (speechPhase.current !== phaseKey) {
      speakerRef.current?.cancel(); speechPhase.current = phaseKey; cueElapsed.current = -1;
      if (session.phase === 'prep') speakPreparation(session, data.settings);
    }
    if (session.phase !== 'prep' && session.phase !== 'active') return;
    const elapsed = session.phaseElapsedMs / 1000;
    const timeline = session.phase === 'prep' ? preparationVoiceTimeline(exercise) : activeVoiceTimeline(exercise, session.id);
    const duration = session.phase === 'prep' ? exercise.prepSeconds : exercise.durationSeconds;
    const cue = dueVoiceCue(timeline, cueElapsed.current, elapsed, duration);
    cueElapsed.current = elapsed;
    if (cue) speakerRef.current?.speak(cue.text, cue.availableSeconds, data.settings.voiceRate, data.settings.voiceGender);
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
    const selected = getSelectedRoutine(routineId ?? options.routineId ?? current.settings.selectedRoutineId, current.settings);
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const nextSession = createSession(selected, id);
    timerMark.current = performance.now();
    // Play synchronously within the button gesture so bundled audio unlocks on phones.
    speakPreparation(nextSession, current.settings);
    setData(previous => ({ ...previous, session: nextSession, settings: { ...previous.settings, selectedRoutineId: selected.id, rememberedRoutineIds: rememberRoutineSelection(ROUTINES, previous.settings.selectedRoutineId, selected.id, previous.settings.rememberedRoutineIds) } }));
  }, [options.routineId, speakPreparation]);
  const resume = useCallback(() => {
    const current = dataRef.current;
    if (!current.session || current.session.phase === 'complete' || document.visibilityState !== 'visible') return;
    timerMark.current = performance.now();
    if (current.session.phase === 'prep') speakPreparation(current.session, current.settings);
    else {
      // Resuming an active exercise must not replay Start or missed cues.
      speechPhase.current = `${current.session.id}:${current.session.exerciseIndex}:active`;
      cueElapsed.current = current.session.phaseElapsedMs / 1000;
      if (current.settings.voiceEnabled) speakerRef.current?.unlock();
    }
    setData(previous => previous.session ? { ...previous, session: { ...previous.session, paused: false } } : previous);
  }, [speakPreparation]);
  const next = useCallback(() => {
    speakerRef.current?.cancel();
    setData(previous => previous.session ? withSession(previous, skipExercise(previous.session, getSessionRoutine(previous.session))) : previous);
    timerMark.current = performance.now();
  }, [withSession]);
  const skipPrep = useCallback(() => {
    speakerRef.current?.cancel();
    setData(previous => previous.session ? { ...previous, session: skipPreparation(previous.session) } : previous);
    timerMark.current = performance.now();
  }, []);
  const stop = useCallback(() => { speakerRef.current?.cancel(); setData(previous => ({ ...previous, session: null })); }, []);
  const updateSettings = useCallback((settings: Partial<Settings>) => {
    if (settings.preparationSeconds !== undefined && !isPreparationSeconds(settings.preparationSeconds)) return;
    if (settings.voiceEnabled === false) speakerRef.current?.cancel();
    const changesGender = settings.voiceGender !== undefined && settings.voiceGender !== dataRef.current.settings.voiceGender;
    if (settings.voiceGender !== undefined) preferredGender.current = settings.voiceGender;
    if (changesGender) speakerRef.current?.cancel();
    if (settings.voiceEnabled === true || changesGender) {
      speakerRef.current?.unlock();
      const session = dataRef.current.session;
      if (session?.phase === 'active') {
        speechPhase.current = `${session.id}:${session.exerciseIndex}:active`;
        cueElapsed.current = session.phaseElapsedMs / 1000;
      } else speechPhase.current = '';
    }
    if (settings.disabledExerciseIds) {
      const normalized: Record<string, string[]> = {};
      for (const canonical of ROUTINES) {
        const proposed = settings.disabledExerciseIds[canonical.id] ?? [];
        const disabled = canonical.exercises.filter(exercise => proposed.includes(exercise.id)).map(exercise => exercise.id);
        normalized[canonical.id] = disabled.length < canonical.exercises.length ? disabled : (dataRef.current.settings.disabledExerciseIds[canonical.id] ?? []);
      }
      settings = { ...settings, disabledExerciseIds: normalized };
    }
    setData(previous => ({ ...previous, settings: { ...previous.settings, ...settings, voiceRate: Math.max(0.5, Math.min(1.5, settings.voiceRate !== undefined && Number.isFinite(settings.voiceRate) ? settings.voiceRate : previous.settings.voiceRate)), selectedRoutineId: getRoutine(settings.selectedRoutineId ?? previous.settings.selectedRoutineId).id, rememberedRoutineIds: rememberRoutineSelection(ROUTINES, previous.settings.selectedRoutineId, settings.selectedRoutineId ?? previous.settings.selectedRoutineId, settings.rememberedRoutineIds ?? previous.settings.rememberedRoutineIds) } }));
  }, []);
  const setExerciseEnabled = useCallback((routineId: string, exerciseId: string, enabled: boolean): boolean => {
    const canonical = getRoutine(routineId);
    if (canonical.id !== routineId || !canonical.exercises.some(exercise => exercise.id === exerciseId)) return false;
    const current = dataRef.current.settings.disabledExerciseIds[routineId] ?? [];
    const disabled = enabled ? current.filter(id => id !== exerciseId) : [...new Set([...current, exerciseId])];
    if (disabled.length >= canonical.exercises.length) return false;
    setData(previous => ({ ...previous, settings: { ...previous.settings, disabledExerciseIds: { ...previous.settings.disabledExerciseIds, [routineId]: disabled } } }));
    return true;
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
  return { data, session, routine, selectedRoutine, routines: ROUTINES.map(item => getSelectedRoutine(item.id, data.settings)), exercise, frame, settings: data.settings, stats, achievements, storageError, speechStatus, wakeLockStatus, start, pause, resume, next, skipPreparation: skipPrep, stop, updateSettings, setExerciseEnabled, previewVoice, exportData, importData, resetStats };
}
