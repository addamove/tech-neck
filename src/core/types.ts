export interface PoseStep { poseId: string; seconds: number; label: string; isRest?: boolean }
export interface VoiceCue { atSeconds: number; text: string; repeatEverySeconds?: number }
export interface Exercise {
  id: string; title: string; description: string; durationSeconds: number; prepSeconds: number;
  prepPoseId: string; poses: PoseStep[]; cues: VoiceCue[]; instructionAudio?: string;
}
export type PreparationSeconds = 5 | 10 | 20;
export interface Routine { family?: 'neck' | 'hands' | 'eyes'; preparationSeconds?: PreparationSeconds; id: string; title: string; subtitle: string; xp: number; exercises: Exercise[] }
export type VoiceGender = 'female' | 'male';
export type IllustrationStyle = 'male' | 'female' | 'marker';
export interface Settings { preparationSeconds?: PreparationSeconds; voiceEnabled: boolean; voiceRate: number; voiceGender: VoiceGender; illustrationStyle: IllustrationStyle; wakeLockEnabled: boolean; selectedRoutineId: string; rememberedRoutineIds?: Record<string, string>; disabledExerciseIds: Record<string, string[]> }
export type Phase = 'prep' | 'active' | 'complete';
export interface Session {
  preparationSeconds?: PreparationSeconds;
  exerciseIds?: string[];
  id: string; routineId: string; startedAt: string; phase: Phase; exerciseIndex: number;
  phaseElapsedMs: number; elapsedMs: number; paused: boolean;
  skippedExerciseIds: string[]; completedExerciseIds: string[];
}
export interface Completion {
  preparationSeconds?: PreparationSeconds;
  exerciseIds?: string[];
  id: string; routineId: string; startedAt: string; completedAt: string; elapsedMs: number; xp: number;
  skippedExerciseIds: string[]; completedExerciseIds: string[];
}
export interface AppData { format: 'tech-neck'; version: 1; settings: Settings; completions: Completion[]; session: Session | null }
export interface WorkoutFrame {
  phase: Phase; remainingSeconds: number; exerciseRemainingSeconds: number; workRemainingSeconds: number;
  totalRemainingSeconds: number; elapsedSeconds: number; poseId: string; poseLabel: string; progress: number;
}
export interface CalendarDay { date: string; count: number; xp: number; isToday: boolean }
export interface WorkoutStats {
  totalSessions: number; totalXp: number; thisWeek: number; lastSevenDays: number;
  thisMonth: number; currentStreak: number; bestStreak: number; activeDays: number; calendar: CalendarDay[];
}
export type AchievementMetric = 'sessions' | 'bestStreak' | 'activeDays';
export interface AchievementDefinition {
  id: string; title: string; description: string; criterion: string; metric: AchievementMetric; target: number;
  routineId?: string;
}
export interface Achievement extends AchievementDefinition {
  progress: number; progressPercent: number; unlocked: boolean; unlockedAt: string | null;
}
export type WakeLockStatus = 'unsupported' | 'off' | 'requesting' | 'active' | 'unavailable';
