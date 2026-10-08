import { cueTimeline } from './engine';
import { getChinTipTimeline } from './chinTips';
import type { Exercise, VoiceCue } from './types';

export const COUNTDOWN_CUES = ['Three.', 'Two.', 'One.'] as const;
export const EXERCISE_START_CUE = 'Start.';
export const CUE_SLOT_SECONDS = 1;
export interface TimedVoiceCue extends VoiceCue { deadlineSeconds?: number; maxDelaySeconds?: number }

export function preparationVoiceTimeline(exercise: Exercise): TimedVoiceCue[] {
  return COUNTDOWN_CUES.map((text, index) => {
    const atSeconds = exercise.prepSeconds - (COUNTDOWN_CUES.length - index) * CUE_SLOT_SECONDS;
    return { text, atSeconds, deadlineSeconds: atSeconds + CUE_SLOT_SECONDS };
  }).filter(cue => cue.atSeconds >= 0);
}
export function preparationInstructionSeconds(exercise: Exercise, elapsedSeconds: number): number {
  const countdownStart = preparationVoiceTimeline(exercise)[0]?.atSeconds ?? exercise.prepSeconds;
  return Math.max(0, countdownStart - elapsedSeconds);
}
export function activeVoiceTimeline(exercise: Exercise, sessionId?: string): TimedVoiceCue[] {
  // Start has its own slot, so initial stretch guidance cannot cancel it.
  return [
    { text: EXERCISE_START_CUE, atSeconds: 0, deadlineSeconds: CUE_SLOT_SECONDS },
    ...cueTimeline(exercise).map(cue => ({ ...cue, atSeconds: cue.atSeconds === 0 ? CUE_SLOT_SECONDS : cue.atSeconds })),
    ...(sessionId === undefined ? [] : getChinTipTimeline(exercise, sessionId)),
  ].sort((a, b) => a.atSeconds - b.atSeconds);
}
/** Select only the latest newly crossed cue, never catch up missed numbers. */
export function dueVoiceCue(timeline: TimedVoiceCue[], previousSeconds: number, elapsedSeconds: number, phaseDurationSeconds: number): { text: string; atSeconds: number; availableSeconds: number } | null {
  const cue = timeline.filter(item => item.atSeconds > previousSeconds && item.atSeconds <= elapsedSeconds).at(-1);
  if (!cue || elapsedSeconds - cue.atSeconds > (cue.maxDelaySeconds ?? 2)) return null;
  const following = timeline.find(item => item.atSeconds > cue.atSeconds);
  const deadline = Math.min(phaseDurationSeconds, cue.deadlineSeconds ?? Infinity, following?.atSeconds ?? Infinity);
  if (deadline <= elapsedSeconds) return null;
  return { text: cue.text, atSeconds: cue.atSeconds, availableSeconds: deadline - elapsedSeconds };
}
