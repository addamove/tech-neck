import test from "node:test";
import assert from "node:assert/strict";
import { newlyEarnedAchievements, type AchievementSnapshot } from "./achievementCelebration";
import type { Completion } from "../core/types";

const record = (id: string, date = "2026-10-08T12:00:00.000Z"): Completion => ({
  id, routineId: "level-1", startedAt: date, completedAt: date,
  elapsedMs: 525000, xp: 10, skippedExerciseIds: [], completedExerciseIds: [],
});
const snapshot = (phase: AchievementSnapshot["phase"], completions: Completion[] = [], sessionId: string | null = "new-workout"): AchievementSnapshot => ({ sessionId, phase, completions });

test("celebrates a first badge only on a newly completed running session", () => {
  const before = snapshot("active");
  const after = snapshot("complete", [record("new-workout")]);
  assert.deepEqual(newlyEarnedAchievements(before, after), ["first-workout"]);
  assert.deepEqual(newlyEarnedAchievements(after, after), []);
});

test("initial loading, unrelated imported sessions and missing completions do not celebrate", () => {
  const completed = snapshot("complete", [record("new-workout")]);
  assert.deepEqual(newlyEarnedAchievements(null, completed), []);
  assert.deepEqual(newlyEarnedAchievements(snapshot(null, [], null), completed), []);
  assert.deepEqual(newlyEarnedAchievements(snapshot("active", [], "other-session"), completed), []);
  assert.deepEqual(newlyEarnedAchievements(snapshot("active"), snapshot("complete")), []);
});

test("returns every newly earned badge in definition order", () => {
  const history = Array.from({ length: 7 }, (_, index) => record(`old-${index}`, "2026-10-06T12:00:00.000Z"));
  history.push(record("day-two-a", "2026-10-07T12:00:00.000Z"), record("day-two-b", "2026-10-07T13:00:00.000Z"));
  assert.deepEqual(newlyEarnedAchievements(snapshot("active", history), snapshot("complete", [...history, record("new-workout")])), ["streak-3", "sessions-10"]);
});

test("existing or previously recorded achievements never celebrate again", () => {
  const history = [record("old-workout")];
  assert.deepEqual(newlyEarnedAchievements(snapshot("active", history), snapshot("complete", [...history, record("new-workout")])), []);
  const alreadyRecorded = [record("new-workout")];
  assert.deepEqual(newlyEarnedAchievements(snapshot("active", alreadyRecorded), snapshot("complete", alreadyRecorded)), []);
});

test("future-dated imported records are evaluated at the same time in both histories", () => {
  const history = Array.from({ length: 10 }, (_, index) => record(`import-${index}`, "2026-10-08T11:59:59.000Z"));
  assert.deepEqual(newlyEarnedAchievements(snapshot("active", history), snapshot("complete", [...history, record("new-workout")])), []);
});
