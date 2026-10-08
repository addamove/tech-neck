import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROUTINE } from './config';
import { CHIN_FOCUS_TIP, CHIN_SHOULDERS_TIP, CHIN_TIP_TIMING, getChinTipTimeline } from './chinTips';
import { activeVoiceTimeline, dueVoiceCue } from './voiceTiming';

const chin = DEFAULT_ROUTINE.exercises[0];

test('every workout gets one stable focus tip, with independently sampled shoulder guidance near 30%', () => {
  let shoulders = 0;
  const focusTimes = new Set<number>();
  for (let index = 0; index < 10000; index++) {
    const id = `workout-${index}`;
    const tips = getChinTipTimeline(chin, id);
    assert.equal(tips.filter(tip => tip.text === CHIN_FOCUS_TIP).length, 1);
    assert.deepEqual(getChinTipTimeline(JSON.parse(JSON.stringify(chin)), id), tips);
    shoulders += tips.filter(tip => tip.text === CHIN_SHOULDERS_TIP).length;
    focusTimes.add(tips[0].atSeconds);
  }
  assert.ok(shoulders > 2800 && shoulders < 3200, `${shoulders}/10000 shoulder tips`);
  assert.ok(focusTimes.size > 50, 'random timing should vary between workouts');
  for (const exercise of DEFAULT_ROUTINE.exercises.slice(1)) assert.deepEqual(getChinTipTimeline(exercise, 'workout-1'), []);
});

test('all randomized tips finish within a safe hold before the final ten seconds and never overlap fixed cues', () => {
  const safeWindows = [[1.2, 9.8], [14.3, 21.8], [26.3, 33.8], [38.3, 45.8]];
  const fixed = activeVoiceTimeline(chin);
  for (let index = 0; index < 1000; index++) {
    const id = `safe-${index}`;
    const tips = getChinTipTimeline(chin, id);
    const timeline = activeVoiceTimeline(chin, id);
    assert.deepEqual(timeline.filter(cue => !tips.some(tip => tip.text === cue.text)), fixed);
    for (const tip of tips) {
      const end = tip.deadlineSeconds!;
      const budget = tip.text === CHIN_FOCUS_TIP ? CHIN_TIP_TIMING.focusSeconds : CHIN_TIP_TIMING.shouldersSeconds;
      assert.ok(Math.abs(end - tip.atSeconds - budget) < 0.00001);
      assert.ok(safeWindows.some(([start, stop]) => tip.atSeconds >= start && end <= stop));
      assert.ok(end < chin.durationSeconds - 10);
      assert.equal(fixed.some(cue => cue.atSeconds >= tip.atSeconds && cue.atSeconds < end), false);
      const due = dueVoiceCue(timeline, tip.atSeconds - 0.01, tip.atSeconds, chin.durationSeconds)!;
      assert.equal(due.text, tip.text);
      assert.ok(Math.abs(due.availableSeconds - budget) < 0.00001);
    }
    if (tips.length === 2) {
      assert.equal(tips[1].text, CHIN_SHOULDERS_TIP);
      assert.ok(tips[0].deadlineSeconds! < tips[1].atSeconds);
    }
  }
});

test('missed tips are discarded, resume cannot repeat them, and a late tick keeps the explicit hold deadline', () => {
  const timeline = activeVoiceTimeline(chin, 'pause-workout');
  const tip = getChinTipTimeline(chin, 'pause-workout')[0];
  const at = tip.atSeconds;
  assert.equal(dueVoiceCue(timeline, at - 0.01, at + 0.3, chin.durationSeconds), null);
  assert.equal(dueVoiceCue(timeline, at + 0.2, at + 0.2, chin.durationSeconds), null);
  assert.equal(dueVoiceCue(timeline, at, at + 0.1, chin.durationSeconds), null);
  const due = dueVoiceCue(timeline, at - 0.01, at + 0.2, chin.durationSeconds)!;
  assert.equal(due.text, tip.text);
  assert.ok(Math.abs(due.availableSeconds - (tip.deadlineSeconds! - at - 0.2)) < 0.00001);
  assert.equal(dueVoiceCue(timeline, at - 0.01, tip.deadlineSeconds!, chin.durationSeconds), null);
});
