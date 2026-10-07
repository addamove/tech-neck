import { getAchievements } from "../core/achievements";
import type { Completion, Session } from "../core/types";

export interface AchievementSnapshot {
  sessionId: string | null;
  phase: Session["phase"] | null;
  completions: Completion[];
}

export function achievementSnapshot(
  session: Session | null,
  completions: Completion[],
): AchievementSnapshot {
  return {
    sessionId: session?.id ?? null,
    phase: session?.phase ?? null,
    completions,
  };
}

// An unlock alone can come from loading a backup or a date boundary. Celebrate
// only a newly recorded completion of the session already running in this app.
export function newlyEarnedAchievements(
  previous: AchievementSnapshot | null,
  current: AchievementSnapshot,
): string[] {
  if (
    !previous ||
    !previous.phase ||
    previous.phase === "complete" ||
    current.phase !== "complete" ||
    !current.sessionId ||
    previous.sessionId !== current.sessionId ||
    previous.completions.some((record) => record.id === current.sessionId)
  ) return [];
  const completion = current.completions.find((record) => record.id === current.sessionId);
  if (!completion) return [];
  // Evaluate both histories at the same instant: an older future-dated backup
  // becoming eligible must not look like a badge earned by this workout.
  const now = new Date(completion.completedAt);
  const earnedBefore = new Set(getAchievements(previous.completions, now)
    .filter((achievement) => achievement.unlocked).map((achievement) => achievement.id));
  return getAchievements(current.completions, now)
    .filter((achievement) => achievement.unlocked && !earnedBefore.has(achievement.id))
    .map((achievement) => achievement.id);
}
