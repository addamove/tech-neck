import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROUTINE } from './config';
import { advanceSession, createSession, cueTimeline, skipPreparation } from './engine';
import { activeVoiceTimeline, COUNTDOWN_CUES, dueVoiceCue, EXERCISE_START_CUE, preparationInstructionSeconds, preparationVoiceTimeline } from './voiceTiming';

test('every exercise reserves the final three preparation seconds for countdown with exact one-second budgets', () => {
  for (const exercise of DEFAULT_ROUTINE.exercises) {
    const timeline = preparationVoiceTimeline(exercise);
    assert.deepEqual(timeline.map(cue => cue.text), [...COUNTDOWN_CUES]);
    assert.deepEqual(timeline.map(cue => cue.atSeconds), [17, 18, 19]);
    assert.deepEqual(timeline.map(cue => cue.deadlineSeconds), [18, 19, 20]);
    assert.equal(preparationInstructionSeconds(exercise, 0), 17);
    assert.equal(preparationInstructionSeconds(exercise, 16.5), 0.5);
    assert.equal(preparationInstructionSeconds(exercise, 18), 0);
    assert.equal(dueVoiceCue(timeline, -1, 16.999, exercise.prepSeconds), null);
    for (const [index, elapsed] of [17, 18, 19].entries()) {
      assert.deepEqual(dueVoiceCue(timeline, elapsed - 0.001, elapsed, exercise.prepSeconds), { text: COUNTDOWN_CUES[index], atSeconds: elapsed, availableSeconds: 1 });
      assert.equal(dueVoiceCue(timeline, elapsed, elapsed + 0.1, exercise.prepSeconds), null);
    }
  }
});
test('a resumed countdown uses the current number without replaying instructions or catching up missed slots', () => {
  const exercise = DEFAULT_ROUTINE.exercises[0];
  const timeline = preparationVoiceTimeline(exercise);
  const initial = advanceSession(createSession(DEFAULT_ROUTINE, 'countdown-pause'), 18200, DEFAULT_ROUTINE);
  const paused = { ...initial, paused: true };
  assert.equal(advanceSession(paused, 10000, DEFAULT_ROUTINE), paused);
  const elapsed = paused.phaseElapsedMs / 1000;
  assert.equal(preparationInstructionSeconds(exercise, elapsed), 0);
  const current = dueVoiceCue(timeline, -1, elapsed, exercise.prepSeconds)!;
  assert.equal(current.text, 'Two.'); assert.ok(Math.abs(current.availableSeconds - 0.8) < 0.00001);
  assert.equal(dueVoiceCue(timeline, elapsed, elapsed, exercise.prepSeconds), null);
  const jumped = dueVoiceCue(timeline, 16.9, 19.2, exercise.prepSeconds)!;
  assert.equal(jumped.text, 'One.'); assert.ok(Math.abs(jumped.availableSeconds - 0.8) < 0.00001);
  for (const [elapsed, text] of [[17.5, 'Three.'], [18.5, 'Two.']] as const) {
    const resumed = dueVoiceCue(timeline, -1, elapsed, exercise.prepSeconds)!;
    assert.equal(resumed.text, text); assert.equal(resumed.availableSeconds, 0.5);
  }
  assert.equal(dueVoiceCue(timeline, 16.9, 20, exercise.prepSeconds), null);
});
test('short preparations count only the available slots and never schedule negative-time speech', () => {
  const short = { ...DEFAULT_ROUTINE.exercises[0], prepSeconds: 2 };
  assert.deepEqual(preparationVoiceTimeline(short).map(cue => [cue.atSeconds, cue.text]), [[0, 'Two.'], [1, 'One.']]);
  assert.equal(preparationInstructionSeconds(short, 0), 0);
  const immediate = { ...short, prepSeconds: 0 };
  assert.deepEqual(preparationVoiceTimeline(immediate), []);
  assert.equal(preparationInstructionSeconds(immediate, 0), 0);
});
test('Start owns the first active slot without colliding with initial guidance or changing later cue deadlines', () => {
  for (const exercise of DEFAULT_ROUTINE.exercises) {
    const timeline = activeVoiceTimeline(exercise);
    assert.deepEqual(timeline[0], { text: EXERCISE_START_CUE, atSeconds: 0, deadlineSeconds: 1 });
    assert.equal(timeline.filter(cue => cue.atSeconds === 0).length, 1);
    assert.deepEqual(timeline.slice(1), cueTimeline(exercise).map(cue => ({ ...cue, atSeconds: cue.atSeconds === 0 ? 1 : cue.atSeconds })));
    assert.deepEqual(dueVoiceCue(timeline, -1, 0, exercise.durationSeconds), { text: EXERCISE_START_CUE, atSeconds: 0, availableSeconds: 1 });
    assert.equal(dueVoiceCue(timeline, 0, 0.2, exercise.durationSeconds), null);
    const initialCue = exercise.cues.find(cue => cue.atSeconds === 0);
    if (initialCue) {
      const due = dueVoiceCue(timeline, 0.9, 1, exercise.durationSeconds)!;
      assert.equal(due.text, initialCue.text);
      assert.equal(due.availableSeconds, cueTimeline(exercise).find(cue => cue.atSeconds > 0)!.atSeconds - 1);
    }
  }
  const chin = DEFAULT_ROUTINE.exercises[0];
  assert.equal(dueVoiceCue(activeVoiceTimeline(chin), -1, 1.1, chin.durationSeconds), null); // An expired Start slot is never caught up.
});
test('skip preparation enters active immediately with Start only; active resume cursor never replays Start', () => {
  const initial = advanceSession(createSession(DEFAULT_ROUTINE, 'countdown-skip'), 10000, DEFAULT_ROUTINE);
  const active = skipPreparation(initial);
  assert.equal(active.phase, 'active'); assert.equal(active.phaseElapsedMs, 0);
  assert.equal(active.elapsedMs, initial.elapsedMs);
  const exercise = DEFAULT_ROUTINE.exercises[0];
  const timeline = activeVoiceTimeline(exercise);
  assert.equal(dueVoiceCue(timeline, -1, 0, exercise.durationSeconds)?.text, EXERCISE_START_CUE);
  for (const elapsed of [0, 0.2, 5]) {
    assert.equal(dueVoiceCue(timeline, elapsed, elapsed, exercise.durationSeconds), null);
  }
  const transition = advanceSession(createSession(DEFAULT_ROUTINE, 'countdown-natural'), 20000, DEFAULT_ROUTINE);
  assert.equal(transition.phase, 'active'); assert.equal(transition.phaseElapsedMs, 0);
  assert.equal(transition.elapsedMs, 20000); // Audio never adds a timer delay.
});
