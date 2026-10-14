import { Minus, Plus } from 'lucide-react';
import { DURATION_STEP, MIN_EXERCISE_SECONDS, MAX_EXERCISE_SECONDS } from '../core/exerciseDurations';
import { ROUTINES } from '../core/config';
import type { Settings } from '../core/types';
import ExerciseArt from './ExerciseArt';

export default function ExercisesPage({ settings, onChange, onDurationChange }: {
  settings: Settings;
  onChange: (disabled: Record<string, string[]>) => void;
  onDurationChange: (durations: NonNullable<Settings["exerciseDurations"]>) => void;
}) {
  const disabled = settings.disabledExerciseIds ?? {};
  return (
    <main className="inner-screen exercises-screen">
      <span className="eyebrow">MAKE IT YOURS</span>
      <h1>Exercises</h1>
      <p>Choose your movements and adjust their duration in 5-second steps. Changes apply to your next workout.</p>
      {ROUTINES.map((routine) => {
        const omitted = disabled[routine.id] ?? [];
        const enabledCount = routine.exercises.filter((exercise) => !omitted.includes(exercise.id)).length;
        return <section key={routine.id} aria-label={routine.title}>
          <h2>{routine.title}</h2>
          <div className="exercise-settings-list">
            {routine.exercises.map((exercise) => {
              const seconds = settings.exerciseDurations?.[routine.id]?.[exercise.id] ?? exercise.durationSeconds;
              const adjustDuration = (delta: number) => onDurationChange({ ...settings.exerciseDurations, [routine.id]: { ...settings.exerciseDurations?.[routine.id], [exercise.id]: seconds + delta } });
              const timer = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
              const enabled = !omitted.includes(exercise.id);
              const lastEnabled = enabled && enabledCount <= 1;
              return <div className="exercise-setting-row" key={exercise.id}>
                <div className="exercise-thumbnail" aria-hidden="true">
                  <ExerciseArt poseId={exercise.prepPoseId} title={exercise.title} illustrationStyle={settings.illustrationStyle} />
                </div>
                <div className="exercise-setting-title">
                  <strong>{exercise.title}</strong>
                  <div className="exercise-duration" role="group" aria-label={`${exercise.title} duration in ${routine.title}`}>
                    <button type="button" aria-label={`Decrease ${exercise.title} by 5 seconds in ${routine.title}`} disabled={seconds - DURATION_STEP < MIN_EXERCISE_SECONDS} onClick={() => adjustDuration(-DURATION_STEP)}><Minus size={14} /></button>
                    <output aria-live="polite" aria-label="Exercise duration">{timer}</output>
                    <button type="button" aria-label={`Increase ${exercise.title} by 5 seconds in ${routine.title}`} disabled={seconds + DURATION_STEP > MAX_EXERCISE_SECONDS} onClick={() => adjustDuration(DURATION_STEP)}><Plus size={14} /></button>
                  </div>
                  {lastEnabled && <small>At least one exercise required</small>}
                </div>
                <button type="button" className="exercise-setting-switch" role="switch" aria-checked={enabled} aria-label={`${exercise.title} in ${routine.title}`} disabled={lastEnabled} onClick={() => onChange({ ...disabled, [routine.id]: enabled ? [...omitted, exercise.id] : omitted.filter((id) => id !== exercise.id) })}>
                  <span className={`toggle ${enabled ? 'on' : ''}`}><span /></span>
                </button>
              </div>;
            })}
          </div>
        </section>;
      })}
    </main>
  );
}
