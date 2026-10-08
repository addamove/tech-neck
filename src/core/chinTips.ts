import type { Exercise } from './types';
import type { TimedVoiceCue } from './voiceTiming';

export const CHIN_FOCUS_TIP = 'Focus on creating length on the back of your neck.';
export const CHIN_SHOULDERS_TIP = 'Consciously roll your shoulders down and back to keep the upper trapezius muscles from bunching up around the base of your skull.';
export const CHIN_TIP_TIMING = { focusSeconds: 3, shouldersSeconds: 7.3, shouldersProbability: 0.3, startReserveSeconds: 1.2, tuckReserveSeconds: 2.3, endMarginSeconds: 0.2, beforeEndSeconds: 10, maxDelaySeconds: 0.25 };

function randomFraction(sessionId: string, salt: string): number {
  let hash = 2166136261;
  for (const character of `${sessionId}:chin-tips:${salt}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}
interface Window { start: number; end: number }
function tipInWindow(text: string, seconds: number, window: Window, random: number): TimedVoiceCue {
  const availableTicks = Math.floor((window.end - seconds - window.start) * 10 + 0.00001);
  const atSeconds = Math.round((window.start + Math.floor(random * (availableTicks + 1)) / 10) * 10) / 10;
  return { text, atSeconds, deadlineSeconds: Math.round((atSeconds + seconds) * 10) / 10, maxDelaySeconds: CHIN_TIP_TIMING.maxDelaySeconds };
}

/** Stable per-workout choices survive pause, reload and voice changes without
 * storing a second random state. Holds exclude Start, tuck cues and all rests. */
export function getChinTipTimeline(exercise: Exercise, sessionId: string): TimedVoiceCue[] {
  if (exercise.id !== 'chin-tuck') return [];
  const cutoff = exercise.durationSeconds - CHIN_TIP_TIMING.beforeEndSeconds;
  const windows: Window[] = [];
  for (let at = 0; at < cutoff;) {
    for (const pose of exercise.poses) {
      if (at >= cutoff) break;
      if (!pose.isRest) {
        const start = at + (at === 0 ? CHIN_TIP_TIMING.startReserveSeconds : CHIN_TIP_TIMING.tuckReserveSeconds);
        const end = Math.min(at + pose.seconds, cutoff) - CHIN_TIP_TIMING.endMarginSeconds;
        if (end - start >= CHIN_TIP_TIMING.focusSeconds) windows.push({ start, end });
      }
      at += pose.seconds;
    }
  }
  if (!windows.length) return [];
  const pairs = windows.flatMap((focus, index) => windows.slice(index + 1)
    .filter(shoulders => shoulders.end - shoulders.start >= CHIN_TIP_TIMING.shouldersSeconds)
    .map(shoulders => ({ focus, shoulders })));
  const includeShoulders = randomFraction(sessionId, 'shoulders-chance') < CHIN_TIP_TIMING.shouldersProbability && pairs.length > 0;
  const pair = includeShoulders ? pairs[Math.floor(randomFraction(sessionId, 'window-pair') * pairs.length)] : null;
  const focus = pair?.focus ?? windows[Math.floor(randomFraction(sessionId, 'focus-window') * windows.length)];
  const timeline = [tipInWindow(CHIN_FOCUS_TIP, CHIN_TIP_TIMING.focusSeconds, focus, randomFraction(sessionId, 'focus-offset'))];
  if (pair) timeline.push(tipInWindow(CHIN_SHOULDERS_TIP, CHIN_TIP_TIMING.shouldersSeconds, pair.shoulders, randomFraction(sessionId, 'shoulders-offset')));
  return timeline;
}
