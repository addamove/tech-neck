import { ROUTINES } from '../core/config';
import type { Settings } from '../core/types';
import ExerciseArt from './ExerciseArt';

export default function ExercisesPage({ settings, onChange }: {
  settings: Settings;
  onChange: (disabled: Record<string, string[]>) => void;
}) {
  const disabled = settings.disabledExerciseIds ?? {};
  return (
    <main className="inner-screen exercises-screen">
      <span className="eyebrow">MAKE IT YOURS</span>
      <h1>Exercises</h1>
      <p>Choose the movements for your next workout. Keep at least one exercise enabled in each routine.</p>
      {ROUTINES.map((routine) => {
        const omitted = disabled[routine.id] ?? [];
        const enabledCount = routine.exercises.filter((exercise) => !omitted.includes(exercise.id)).length;
        return <section key={routine.id} aria-label={routine.title}>
          <h2>{routine.title}</h2>
          <div className="exercise-settings-list">
            {routine.exercises.map((exercise) => {
              const enabled = !omitted.includes(exercise.id);
              const lastEnabled = enabled && enabledCount <= 1;
              return <div className="exercise-setting-row" key={exercise.id}>
                <div className="exercise-thumbnail" aria-hidden="true">
                  <ExerciseArt poseId={exercise.prepPoseId} title={exercise.title} illustrationStyle={settings.illustrationStyle} />
                </div>
                <span className="exercise-setting-title"><strong>{exercise.title}</strong><small>{lastEnabled ? 'At least one exercise required' : `${exercise.durationSeconds} sec movement`}</small></span>
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
