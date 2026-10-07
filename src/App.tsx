import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Flame,
  Info,
  LockKeyhole,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useWorkout } from "./core/useWorkout";
import { readImport } from "./core/persistence";
import { completedHistory } from "./core/history";
import { getStats } from "./core/stats";
import { getActivityCharts } from "./core/activityCharts";
import { getPose } from "./core/engine";
import { PREPARATION_DEMO_STEP_MS } from "./core/config";
import { publicAssetUrl } from "./core/assets";
import type { AppData } from "./core/types";
import ExerciseArt from "./components/ExerciseArt";
import AboutPage from "./components/AboutPage";
import ActivityCharts from "./components/ActivityCharts";
import AchievementConfetti from "./components/AchievementConfetti";
import { achievementSnapshot, newlyEarnedAchievements, type AchievementSnapshot } from "./components/achievementCelebration";

type Tab = "train" | "activity" | "settings";
const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
const localDay = (value: string) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  detail,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  detail: string;
}) {
  return (
    <button
      className="setting-row"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
    >
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span className={`toggle ${checked ? "on" : ""}`}>
        <span />
      </span>
    </button>
  );
}

export default function App() {
  const workout = useWorkout();
  const {
    data,
    session,
    routine,
    exercise,
    frame,
    settings,
    stats,
    wakeLockStatus,
    storageError,
  } = workout;
  const [tab, setTab] = useState<Tab>("train");
  const [showWorkout, setShowWorkout] = useState(false);
  const [showAbout, setShowAbout] = useState(
    () => window.location.hash === "#/about",
  );
  const aboutOrigin = useRef<{ tab: Tab; scrollY: number } | null>(null);
  const aboutAppEntry = useRef(false);
  const aboutRouteListener = useRef<() => void>(() => {});
  const [dialog, setDialog] = useState<
    "exit" | "reset" | "import" | "export" | "achievement" | null
  >(null);
  const [selectedAchievementId, setSelectedAchievementId] = useState<
    string | null
  >(null);
  const achievements = workout.achievements ?? [];
  const selectedAchievement = achievements.find(
    (item) => item.id === selectedAchievementId,
  );
  const celebrationBaseline = useRef<AchievementSnapshot | null>(null);
  const importingBackup = useRef(false);
  const [celebrationQueue, setCelebrationQueue] = useState<string[]>([]);
  const [celebratingAchievementId, setCelebratingAchievementId] = useState<string | null>(null);
  useEffect(() => {
    const current = achievementSnapshot(session, data.completions);
    const newlyEarned = importingBackup.current
      ? []
      : newlyEarnedAchievements(celebrationBaseline.current, current);
    celebrationBaseline.current = current;
    if (newlyEarned.length)
      setCelebrationQueue((queue) => [...queue, ...newlyEarned.filter((id) => !queue.includes(id))]);
  }, [session, data.completions, achievements]);
  useEffect(() => {
    if (dialog !== null || !celebrationQueue.length) return;
    const nextId = celebrationQueue[0];
    setSelectedAchievementId(nextId);
    setCelebratingAchievementId(nextId);
    setDialog("achievement");
  }, [dialog, celebrationQueue]);
  const closeAchievement = () => {
    if (celebratingAchievementId)
      setCelebrationQueue((queue) => queue.filter((id) => id !== celebratingAchievementId));
    setCelebratingAchievementId(null);
    setDialog(null);
  };
  const [importPreview, setImportPreview] = useState<{
    file: File;
    data: AppData;
  } | null>(null);
  const [preparedBackup, setPreparedBackup] = useState<{
    json: string;
    url: string;
    filename: string;
    returnToImport: boolean;
  } | null>(null);
  const [backupNotice, setBackupNotice] = useState("");
  const backupText = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const url = preparedBackup?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [preparedBackup?.url]);
  const [notice, setNotice] = useState("");
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const homeLaunchGuard = useRef(false);
  useEffect(() => {
    if (!showWorkout) homeLaunchGuard.current = false;
  }, [showWorkout]);
  const totalSeconds = routine.exercises.reduce(
    (sum, item) => sum + item.durationSeconds + item.prepSeconds,
    0,
  );
  const activeScreen =
    !showAbout && showWorkout && session && frame && exercise;
  const finishScreen = activeScreen && session.phase === "complete";
  // Preview poses without advancing the exercise or scheduling active cues.
  // Doorway preparation keeps its initial pose; other demos freeze on pause.
  const preparationPoses = exercise.poses.filter(
    (pose, index, poses) =>
      poses.findIndex(
        (candidate) =>
          candidate.poseId === pose.poseId &&
          Boolean(candidate.isRest) === Boolean(pose.isRest),
      ) === index,
  );
  const prepStartIndex = Math.max(
    0,
    preparationPoses.findIndex((pose) => pose.poseId === exercise.prepPoseId),
  );
  const preparationStep =
    session && frame.phase === "prep" && exercise.id !== "chest"
      ? preparationPoses[
          (prepStartIndex +
            Math.floor(session.phaseElapsedMs / PREPARATION_DEMO_STEP_MS)) %
            preparationPoses.length
        ]
      : null;
  const displayPoseId = preparationStep?.poseId ?? frame.poseId;
  const currentPose =
    preparationStep ??
    (session && frame.phase === "active"
      ? getPose(exercise, session.phaseElapsedMs / 1000)
      : null);
  const isRest = Boolean(
    currentPose?.isRest &&
    session &&
    // The first initial chin pose shows the upcoming tuck; later initial
    // poses demonstrate the return movement between repetitions.
    (frame.phase !== "prep" ||
      exercise.id !== "chin-tuck" ||
      session.phaseElapsedMs >= PREPARATION_DEMO_STEP_MS),
  );
  const start = () => {
    workout.start();
    setShowWorkout(true);
  };
  const launchHomeWorkout = () => {
    if (homeLaunchGuard.current) return;
    homeLaunchGuard.current = true;
    // Keep audio unlocking and narration inside the original click gesture.
    if (session && session.phase !== "complete") {
      workout.resume();
      setShowWorkout(true);
    } else start();
  };
  const leave = () => {
    workout.pause();
    setDialog("exit");
  };
  const saveAndExit = () => {
    setShowWorkout(false);
    setDialog(null);
  };
  const clearAboutRoute = () => {
    if (window.location.hash === "#/about") {
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    }
    setShowAbout(false);
    aboutOrigin.current = null;
    aboutAppEntry.current = false;
  };
  const openAbout = () => {
    if (showAbout) return;
    aboutOrigin.current = { tab, scrollY: window.scrollY };
    aboutAppEntry.current = true;
    window.history.pushState(window.history.state, "", "#/about");
    setShowAbout(true);
    window.scrollTo(0, 0);
  };
  const backFromAbout = () => {
    if (aboutAppEntry.current) window.history.back();
    else {
      clearAboutRoute();
      setTab("train");
      window.scrollTo(0, 0);
    }
  };
  // Keep the browser listener current without re-subscribing on timer updates.
  aboutRouteListener.current = () => {
    const nextAbout = window.location.hash === "#/about";
    if (nextAbout) {
      if (!showAbout && !aboutOrigin.current)
        aboutOrigin.current = { tab, scrollY: window.scrollY };
      if (showWorkout) {
        if (session && session.phase !== "complete") workout.pause();
        setShowWorkout(false);
      }
      setShowAbout(true);
      window.scrollTo(0, 0);
    } else if (showAbout) {
      setShowAbout(false);
      const source = aboutOrigin.current;
      setTab(source?.tab ?? "train");
      window.requestAnimationFrame(() => {
        if (window.location.hash !== "#/about")
          window.scrollTo(0, source?.scrollY ?? 0);
      });
    }
  };
  useEffect(() => {
    const onRouteChange = () => aboutRouteListener.current();
    window.addEventListener("hashchange", onRouteChange);
    window.addEventListener("popstate", onRouteChange);
    return () => {
      window.removeEventListener("hashchange", onRouteChange);
      window.removeEventListener("popstate", onRouteChange);
    };
  }, []);
  const navigateToTab = (nextTab: Tab) => {
    if (showAbout) clearAboutRoute();
    if (showWorkout) {
      if (session && session.phase !== "complete") workout.pause();
      setShowWorkout(false);
    }
    setTab(nextTab);
    window.scrollTo(0, 0);
  };
  const exportFile = () => {
    const json = workout.exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const filename = `tech-neck-backup-${localDay(new Date().toISOString())}.json`;
    setPreparedBackup({
      json,
      url,
      filename,
      returnToImport: dialog === "import",
    });
    setBackupNotice("");
    setDialog("export");
    setNotice("Your backup is ready.");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    try {
      anchor.click();
    } catch {
      // The dialog keeps the same download available if this browser blocks it.
    } finally {
      anchor.remove();
    }
  };
  const closeBackup = () => {
    setDialog(
      preparedBackup?.returnToImport && importPreview ? "import" : null,
    );
    setPreparedBackup(null);
    setBackupNotice("");
  };
  const copyBackup = async () => {
    if (!preparedBackup) return;
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(preparedBackup.json);
      setBackupNotice(
        "Backup copied. Paste it into a file and save it as JSON.",
      );
    } catch {
      backupText.current?.focus();
      backupText.current?.select();
      setBackupNotice(
        "The backup text is selected. Copy it and save it as a JSON file.",
      );
    }
  };
  const previewImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = await readImport(file);
      setImportPreview({ file, data: parsed });
      setDialog("import");
      setNotice("");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "This file could not be imported.",
      );
    }
    if (fileInput.current) fileInput.current.value = "";
  };
  const confirmImport = async () => {
    if (!importPreview) return;
    importingBackup.current = true;
    try {
      await workout.importData(importPreview.file);
      celebrationBaseline.current = null;
      setCelebrationQueue([]);
      setCelebratingAchievementId(null);
      setDialog(null);
      setImportPreview(null);
      setShowWorkout(false);
      setNotice("Your backup has been restored.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Import failed.");
    } finally {
      importingBackup.current = false;
    }
  };
  // The hook refreshes stats on minute/focus/midnight boundaries. Reuse that
  // clock so calendar, recent history, and totals admit future imports together.
  const calendarStats = useMemo(
    () => getStats(data.completions, new Date(), month),
    [data.completions, month, stats],
  );
  const recentHistory = useMemo(
    () => completedHistory(data.completions).slice().reverse().slice(0, 5),
    [data.completions, stats],
  );
  const activityCharts = useMemo(
    () => getActivityCharts(data.completions),
    [data.completions, stats],
  );
  const completionsByDay = new Map(
    calendarStats.calendar.map((day) => [day.date, day.count]),
  );
  const monthCount = calendarStats.calendar.reduce(
    (sum, day) => sum + day.count,
    0,
  );
  const dayCount = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const firstOffset = (month.getDay() + 6) % 7;
  const today = localDay(new Date().toISOString());
  const changeMonth = (amount: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + amount, 1));

  return (
    <>
    <main className="mobile-only-screen">
      <div className="mobile-only-card">
        <span className="mobile-only-icon" aria-hidden="true">
          <Smartphone size={30} strokeWidth={1.7} />
        </span>
        <p className="mobile-only-brand">tech neck</p>
        <h1>Made for your mobile screen</h1>
        <p>Tech Neck currently supports mobile screen sizes only. Open it on your phone or use a narrower window.</p>
      </div>
    </main>
    <div className={`app-shell ${activeScreen ? "session-shell" : ""}`}>
      <header className="topbar">
        {showAbout ? (
          <>
            <button className="back-pill" onClick={backFromAbout}>
              <ArrowLeft size={17} />
              Back
            </button>
            <button
              type="button"
              className="brand-mark"
              aria-label="Tech Neck home"
              onClick={() => navigateToTab("train")}
            >
              <span className="brand-dot" />
              tech neck
            </button>
          </>
        ) : activeScreen ? (
          <>
            <button className="back-pill" onClick={leave}>
              <ArrowLeft size={17} />
              Back
            </button>
            <span className="header-label">LEVEL 1</span>
            <button
              className="top-icon"
              aria-label={
                settings.voiceEnabled
                  ? "Mute voice guidance"
                  : "Enable voice guidance"
              }
              onClick={() =>
                workout.updateSettings({ voiceEnabled: !settings.voiceEnabled })
              }
            >
              {settings.voiceEnabled ? (
                <Volume2 size={21} />
              ) : (
                <VolumeX size={21} />
              )}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="brand-mark"
              aria-label="Tech Neck home"
              onClick={() => {
                setTab("train");
                window.scrollTo(0, 0);
              }}
            >
              <span className="brand-dot" />
              tech neck
            </button>
            <button
              className="top-icon"
              aria-label="About Tech Neck"
              onClick={openAbout}
            >
              <Info size={20} />
            </button>
          </>
        )}
      </header>
      {storageError && (
        <div className="notice error" role="alert">
          {storageError}
        </div>
      )}
      {showAbout ? (
        <AboutPage />
      ) : activeScreen ? (
        finishScreen ? (
          <main className="completion-screen">
            <div className="completion-orbit">
              <Check size={54} strokeWidth={2.2} />
            </div>
            <span className="eyebrow">DAILY RESET COMPLETE</span>
            <h1>
              A little taller.
              <br />A little lighter.
            </h1>
            <p>
              You made time for yourself.
              <br />
              Keep that good posture with you.
            </p>
            <div className="earned-xp">
              <Sparkles size={19} /> +{routine.xp} XP
            </div>
            <div className="finish-details">
              <span>
                {formatTime(frame.elapsedSeconds)}
                <small>Time spent</small>
              </span>
              <span>
                {session.completedExerciseIds.length +
                  session.skippedExerciseIds.length}
                /{routine.exercises.length}
                <small>Exercises</small>
              </span>
            </div>
            <button
              className="primary-button"
              onClick={() => {
                workout.stop();
                setShowWorkout(false);
                setTab("activity");
              }}
            >
              View my activity
              <ArrowRight size={18} />
            </button>
            <button
              className="text-button"
              onClick={() => {
                workout.stop();
                setShowWorkout(false);
              }}
            >
              Back to home
            </button>
            <Waves />
          </main>
        ) : (
          <main
            className={`workout-screen ${frame.phase === "prep" ? "preparation" : ""}`}
          >
            <div className="workout-topline">
              <span className="eyebrow">
                {frame.phase === "prep"
                  ? "GET READY"
                  : `EXERCISE ${session.exerciseIndex + 1} OF ${routine.exercises.length}`}
              </span>
              <button
                className="quiet-icon"
                aria-label="Exit workout"
                onClick={leave}
              >
                <X size={19} />
              </button>
            </div>
            <ExerciseArt
              poseId={displayPoseId}
              title={exercise.title}
              isRest={isRest}
              illustrationStyle={settings.illustrationStyle}
            />
            {frame.phase === "active" && (
              <>
                <div
                  className="exercise-time"
                  aria-label={`${frame.exerciseRemainingSeconds} seconds remaining`}
                >
                  {formatTime(frame.exerciseRemainingSeconds)}
                </div>
                <div
                  className={`pose-label ${frame.poseLabel.toLowerCase().includes("rest") ? "rest-label" : ""}`}
                >
                  {session.paused ? "Paused — take your time" : frame.poseLabel}
                </div>
              </>
            )}
            <h1 className="exercise-title">{exercise.title}</h1>
            <p className="exercise-description">{exercise.description}</p>
            {frame.phase === "prep" ? (
              <div className="prep-actions">
                <span className="next-label">
                  {session.paused ? "Preparation paused" : "Next exercise in"}
                </span>
                <div className="prep-time">
                  {formatTime(frame.remainingSeconds)}
                </div>
                <div className="prep-button-row">
                  <button
                    className="outline-button prep-skip"
                    onClick={workout.skipPreparation}
                  >
                    Skip preparation
                    <ArrowRight size={16} />
                  </button>
                  <button
                    className="small-round"
                    aria-label={
                      session.paused
                        ? "Resume preparation"
                        : "Pause preparation"
                    }
                    onClick={session.paused ? workout.resume : workout.pause}
                  >
                    {session.paused ? (
                      <Play size={17} fill="currentColor" />
                    ) : (
                      <Pause size={17} fill="currentColor" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="exercise-controls">
                <span />
                <button
                  className="round-control"
                  aria-label={
                    session.paused ? "Resume workout" : "Pause workout"
                  }
                  onClick={session.paused ? workout.resume : workout.pause}
                >
                  {session.paused ? (
                    <Play size={26} fill="currentColor" />
                  ) : (
                    <Pause size={27} fill="currentColor" />
                  )}
                </button>
                <button
                  className="round-control next-control"
                  aria-label="Skip to next exercise"
                  onClick={workout.next}
                >
                  <ArrowRight size={30} />
                </button>
              </div>
            )}
            <div className="workout-footer">
              <span>
                {formatTime(frame.elapsedSeconds)}
                <small>Time elapsed</small>
              </span>
              <span className="exercise-counter">
                {session.exerciseIndex + 1}/{routine.exercises.length}
              </span>
              <span>
                {formatTime(frame.workRemainingSeconds)}
                <small>Work remaining</small>
              </span>
            </div>
            <div className="session-progress" aria-label="Workout progress">
              <span style={{ width: `${frame.progress * 100}%` }} />
            </div>
            <div className="wake-status">
              <Monitor size={12} />
              {!settings.wakeLockEnabled
                ? "Keep screen awake is off"
                : wakeLockStatus === "active"
                  ? "Screen stays awake"
                  : wakeLockStatus === "unsupported"
                    ? "Keep your screen on manually"
                    : wakeLockStatus === "requesting"
                      ? "Keeping screen awake…"
                      : wakeLockStatus === "off"
                        ? "Screen can sleep while paused"
                        : "Screen lock unavailable — keep screen on"}
            </div>
            {settings.voiceEnabled &&
              workout.speechStatus === "unavailable" && (
                <div className="wake-status" role="status">
                  <VolumeX size={12} />
                  Voice unavailable — follow the instructions above
                </div>
              )}
          </main>
        )
      ) : tab === "train" ? (
        <main className="home-screen">
          <div className="home-intro">
            <h1>
              Room to
              <br />
              <span>feel better.</span>
            </h1>
            <p>
              A few minutes for your neck.
              <br />A fresh start for the rest of your day.
            </p>
          </div>
          <div className="home-links">
            <button
              className="outline-button"
              onClick={() => setTab("activity")}
            >
              <Sparkles size={18} />
              <span>{stats.totalXp} XP</span>
              <ChevronRight size={18} />
            </button>
            <button
              className="outline-button"
              onClick={() => setTab("activity")}
            >
              <CalendarDays size={18} />
              <span>My activity</span>
              <ChevronRight size={18} />
            </button>
            <button
              className="outline-button"
              onClick={() => setTab("settings")}
            >
              <Settings2 size={18} />
              <span>Settings</span>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="start-area">
            {(!session || session.phase === "complete") && (
              <span className="start-label">START TRAINING</span>
            )}
            <button
              className="start-play"
              aria-label={
                session && session.phase !== "complete"
                  ? "Resume saved workout"
                  : "Start training"
              }
              onClick={launchHomeWorkout}
            >
              <span className="start-play-surface" aria-hidden="true" />
              <Play size={43} fill="currentColor" strokeWidth={1.3} />
            </button>
            <strong>Tech Neck · Level 1</strong>
            <span className="routine-meta">
              {routine.exercises.length} exercises <span>·</span>{" "}
              {formatTime(totalSeconds)} min <span>·</span> +{routine.xp} XP
            </span>
          </div>
          <Waves />
        </main>
      ) : tab === "activity" ? (
        <main className="inner-screen activity-screen">
          <span className="eyebrow">EVERY LITTLE RESET COUNTS</span>
          <h1>My activity</h1>
          <div className="xp-banner">
            <span>
              <Sparkles size={22} />
              <strong>{stats.totalXp}</strong>
              <small>total XP</small>
            </span>
            <span className="streak">
              <Flame size={20} />
              {stats.currentStreak}
              <small>day streak</small>
            </span>
          </div>
          <div className="stats-row">
            <span>
              <strong>{stats.totalSessions}</strong>
              <small>Total workouts</small>
            </span>
            <span>
              <strong>{stats.thisWeek}</strong>
              <small>This week</small>
            </span>
            <span>
              <strong>{monthCount}</strong>
              <small>Selected month</small>
            </span>
          </div>
          <div className="calendar-head">
            <button
              className="icon-button"
              aria-label="Previous month"
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeft size={21} />
            </button>
            <h2>
              {month.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <button
              className="icon-button"
              aria-label="Next month"
              onClick={() => changeMonth(1)}
            >
              <ChevronRight size={21} />
            </button>
          </div>
          <div className="calendar-weekdays">
            {["M", "T", "W", "T", "F", "S", "S"].map((name, i) => (
              <span key={i}>{name}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {Array.from({ length: firstOffset }, (_, i) => (
              <span key={`empty-${i}`} />
            ))}
            {Array.from({ length: dayCount }, (_, i) => {
              const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
              const count = completionsByDay.get(date) ?? 0;
              return (
                <span
                  key={date}
                  className={`calendar-day ${count ? "trained" : ""} ${date === today ? "today" : ""}`}
                  aria-label={`${date}: ${count} workouts`}
                >
                  <span>{i + 1}</span>
                  {count > 0 && <i />}
                </span>
              );
            })}
          </div>
          <p className="calendar-legend">
            <span /> A day you made time for yourself
          </p>
          <ActivityCharts data={activityCharts} />
          {stats.totalSessions === 0 ? (
            <div className="empty-activity">
              <p>Your first reset is the start of a good habit.</p>
              <button
                className="outline-button"
                onClick={() => setTab("train")}
              >
                Let’s get started
                <ArrowRight size={17} />
              </button>
            </div>
          ) : (
            <div className="recent-workouts">
              <h2>Recent resets</h2>
              {recentHistory.map((record) => (
                <div className="history-row" key={record.id}>
                  <span className="history-icon">
                    <Check size={18} />
                  </span>
                  <span>
                    <strong>Level 1 completed</strong>
                    <small>
                      {new Date(record.completedAt).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" },
                      )}{" "}
                      · {formatTime(Math.floor(record.elapsedMs / 1000))}
                      {record.skippedExerciseIds.length > 0
                        ? ` · ${record.skippedExerciseIds.length} skipped`
                        : ""}
                    </small>
                  </span>
                  <span className="history-xp">+{record.xp} XP</span>
                </div>
              ))}
            </div>
          )}
          <section className="achievements-section" aria-label="Achievements">
            <div className="achievements-heading">
              <h2>Little milestones</h2>
              <span>
                {achievements.filter((item) => item.unlocked).length}/
                {achievements.length} earned
              </span>
            </div>
            <p>Good habits grow one reset at a time.</p>
            <div className="achievements-grid">
              {achievements.map((achievement) => (
                <button
                  key={achievement.id}
                  className={`achievement-card ${achievement.unlocked ? "earned" : "locked"}`}
                  aria-label={`${achievement.title}. ${achievement.unlocked ? "Earned" : "Locked"}. ${achievement.criterion}. Progress ${achievement.progress} of ${achievement.target}.`}
                  onClick={() => {
                    setCelebratingAchievementId(null);
                    setSelectedAchievementId(achievement.id);
                    setDialog("achievement");
                  }}
                >
                  <div className="badge-art">
                    <img
                      src={publicAssetUrl(`badges/${achievement.id}.webp`)}
                      alt=""
                      draggable={false}
                    />
                    {!achievement.unlocked && (
                      <span className="badge-lock">
                        <LockKeyhole size={11} />
                      </span>
                    )}
                  </div>
                  <h3>{achievement.title}</h3>
                  <span className="badge-criterion">
                    {achievement.criterion}
                  </span>
                  {achievement.unlocked ? (
                    <span className="badge-earned">
                      <Check size={11} />
                      Earned
                    </span>
                  ) : (
                    <>
                      <div className="badge-progress" aria-hidden="true">
                        <span
                          style={{ width: `${achievement.progressPercent}%` }}
                        />
                      </div>
                      <span className="badge-count">
                        {achievement.progress} / {achievement.target}
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
            <small className="achievement-note">
              Milestones celebrate your progress. Every completed reset earns 10
              XP.
            </small>
          </section>
        </main>
      ) : (
        <main className="inner-screen settings-screen">
          <span className="eyebrow">MAKE IT YOURS</span>
          <h1>Settings</h1>
          <section>
            <h2>During your workout</h2>
            <Toggle
              checked={settings.voiceEnabled}
              onChange={() =>
                workout.updateSettings({ voiceEnabled: !settings.voiceEnabled })
              }
              label="Voice guidance"
              detail="Instructions and gentle reminders"
            />
            <fieldset className="voice-selection">
              <legend className="sr-only">Guidance voice</legend>
              <div className="voice-selection-head">
                <span>Voice</span>
                <button
                  type="button"
                  className="voice-preview"
                  onClick={() => workout.previewVoice()}
                  disabled={workout.speechStatus === "speaking"}
                >
                  <Volume2 size={14} />
                  {workout.speechStatus === "speaking"
                    ? "Playing…"
                    : "Preview voice"}
                </button>
              </div>
              <div className="voice-options">
                {(["female", "male"] as const).map((gender) => (
                  <label key={gender}>
                    <input
                      type="radio"
                      name="guidance-voice"
                      value={gender}
                      checked={(settings.voiceGender ?? "female") === gender}
                      onChange={() =>
                        workout.updateSettings({ voiceGender: gender })
                      }
                    />
                    <span>{gender === "female" ? "Female" : "Male"}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="speed-setting">
              <span>Voice speed</span>
              <span className="speed-select">
                <select
                  aria-label="Voice speed"
                  value={settings.voiceRate}
                  onChange={(e) =>
                    workout.updateSettings({
                      voiceRate: Number(e.target.value),
                    })
                  }
                >
                  <option value={0.85}>Slower</option>
                  <option value={1}>Normal</option>
                  <option value={1.15}>Faster</option>
                  {![0.85, 1, 1.15].includes(settings.voiceRate) && (
                    <option value={settings.voiceRate}>
                      {settings.voiceRate}× (imported)
                    </option>
                  )}
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </span>
            </label>
            <Toggle
              checked={settings.wakeLockEnabled}
              onChange={() =>
                workout.updateSettings({
                  wakeLockEnabled: !settings.wakeLockEnabled,
                })
              }
              label="Keep screen awake"
              detail="While your workout is running"
            />
          </section>
          <section className="illustration-section">
            <h2>Illustrations</h2>
            <p>Choose the look of your exercise guide.</p>
            <fieldset className="illustration-options">
              <legend className="sr-only">Illustration style</legend>
              {(
                [
                  ["male", "Male"],
                  ["female", "Female"],
                  ["marker", "Marker sketch"],
                ] as const
              ).map(([style, label]) => (
                <label key={style}>
                  <input
                    type="radio"
                    name="illustration-style"
                    value={style}
                    checked={(settings.illustrationStyle ?? "male") === style}
                    onChange={() =>
                      workout.updateSettings({ illustrationStyle: style })
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
          </section>
          <section className="data-section">
            <h2>Your data</h2>
            <p>
              Your activity and settings are saved on this device. Keep a backup
              to take them with you.
            </p>
            <button className="outline-button" onClick={exportFile}>
              <Download size={18} />
              Export backup
              <ArrowRight size={17} />
            </button>
            <button
              className="outline-button"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={18} />
              Import backup
              <ArrowRight size={17} />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => void previewImport(e.target.files?.[0])}
            />
            {notice && (
              <p className="notice inline-notice" role="status">
                {notice}
              </p>
            )}
          </section>
          <div className="privacy-note">
            <ShieldCheck size={19} />
            <span>
              Just you and your progress.
              <br />
              No account. No cloud. No tracking.
            </span>
          </div>
          <button className="text-button about-link" onClick={openAbout}>
            About Tech Neck <Info size={15} />
          </button>
          <small className="version-label">TECH NECK · VERSION 1.0</small>
        </main>
      )}
      {(!activeScreen || finishScreen) && (
        <nav className="bottom-nav" aria-label="Main navigation">
          <span
            className="nav-selection"
            aria-hidden="true"
            style={{
              transform: `translateX(${activeScreen || tab === "train" ? 0 : tab === "activity" ? 100 : 200}%)`,
              opacity: showAbout ? 0 : 1,
            }}
          />
          <button
            className={
              !showAbout && (activeScreen || tab === "train") ? "selected" : ""
            }
            aria-current={
              !showAbout && (activeScreen || tab === "train")
                ? "page"
                : undefined
            }
            onClick={() => navigateToTab("train")}
          >
            <Play size={19} />
            <span>Train</span>
          </button>
          <button
            className={!showAbout && tab === "activity" ? "selected" : ""}
            aria-current={
              !showAbout && !activeScreen && tab === "activity"
                ? "page"
                : undefined
            }
            onClick={() => navigateToTab("activity")}
          >
            <CalendarDays size={20} />
            <span>Activity</span>
          </button>
          <button
            className={!showAbout && tab === "settings" ? "selected" : ""}
            aria-current={
              !showAbout && !activeScreen && tab === "settings"
                ? "page"
                : undefined
            }
            onClick={() => navigateToTab("settings")}
          >
            <Settings2 size={20} />
            <span>Settings</span>
          </button>
        </nav>
      )}
      {dialog === "export" && preparedBackup && (
        <Modal title="Your backup" onClose={closeBackup}>
          <p>
            Your backup is ready. Download the JSON file or copy the text below
            and save it as a .json file.
          </p>
          <a
            className="primary-button"
            href={preparedBackup.url}
            download={preparedBackup.filename}
            style={{ textDecoration: "none" }}
          >
            Download JSON
            <Download size={17} />
          </a>
          <button className="outline-button" onClick={() => void copyBackup()}>
            Copy backup
          </button>
          <textarea
            ref={backupText}
            aria-label="Backup JSON"
            readOnly
            value={preparedBackup.json}
            spellCheck={false}
            style={{
              width: "100%",
              height: 150,
              marginTop: 16,
              padding: 10,
              border: "1px solid #d5e3e1",
              borderRadius: 10,
              boxSizing: "border-box",
              resize: "vertical",
              fontFamily: "monospace",
              fontSize: 11,
              color: "inherit",
              background: "#f6faf9",
            }}
          />
          {backupNotice && <p role="status">{backupNotice}</p>}
          <button className="text-button" onClick={closeBackup}>
            {preparedBackup.returnToImport ? "Back to restore" : "Done"}
          </button>
        </Modal>
      )}
      {dialog === "achievement" && selectedAchievement && (
        <Modal
          key={selectedAchievement.id}
          title={selectedAchievement.title}
          onClose={closeAchievement}
        >
          {celebratingAchievementId === selectedAchievement.id && (
            <AchievementConfetti key={selectedAchievement.id} />
          )}
          <div
            className={`achievement-detail ${selectedAchievement.unlocked ? "earned" : "locked"}`}
          >
            <img
              src={publicAssetUrl(`badges/${selectedAchievement.id}.webp`)}
              alt=""
            />
            <span className="achievement-detail-status">
              {selectedAchievement.unlocked ? (
                <Check size={15} />
              ) : (
                <LockKeyhole size={15} />
              )}{" "}
              {selectedAchievement.unlocked
                ? celebratingAchievementId === selectedAchievement.id
                  ? "Well done — you earned this milestone!"
                  : "Milestone earned"
                : "A milestone ahead"}
            </span>
          </div>
          <p className="achievement-description">
            {selectedAchievement.description}
          </p>
          <div className="achievement-detail-progress">
            <Trophy size={17} />
            <span>{selectedAchievement.criterion}</span>
            <strong>
              {selectedAchievement.progress}/{selectedAchievement.target}
            </strong>
          </div>
          {selectedAchievement.unlockedAt && (
            <p className="achievement-date">
              Earned{" "}
              {new Date(selectedAchievement.unlockedAt).toLocaleDateString(
                "en-US",
                { month: "long", day: "numeric", year: "numeric" },
              )}
            </p>
          )}
          <button className="primary-button" onClick={closeAchievement}>
            Keep going
            <Check size={17} />
          </button>
        </Modal>
      )}
      {dialog === "exit" && (
        <Modal title="Take a break?" onClose={() => setDialog(null)}>
          <p>
            Your workout is paused. Save your place and continue whenever you’re
            ready.
          </p>
          <button
            className="primary-button"
            onClick={() => {
              workout.resume();
              setDialog(null);
            }}
          >
            Continue workout
            <Play size={17} />
          </button>
          <button className="outline-button" onClick={saveAndExit}>
            Save & exit
          </button>
          <button
            className="text-button danger-text"
            onClick={() => {
              workout.stop();
              setShowWorkout(false);
              setDialog(null);
            }}
          >
            End without completing
          </button>
        </Modal>
      )}
      {dialog === "reset" && (
        <Modal title="Start fresh?" onClose={() => setDialog(null)}>
          <p>
            This will replace your saved workout. Your completed activity and XP
            stay safe.
          </p>
          <button
            className="primary-button"
            onClick={() => {
              start();
              setDialog(null);
            }}
          >
            Start new workout
            <RotateCcw size={17} />
          </button>
          <button className="text-button" onClick={() => setDialog(null)}>
            Keep my saved workout
          </button>
        </Modal>
      )}
      {dialog === "import" && importPreview && (
        <Modal title="Restore this backup?" onClose={() => setDialog(null)}>
          <p>
            This backup contains{" "}
            <strong>
              {importPreview.data.completions.length} completed workouts
            </strong>
            ,{" "}
            <strong>
              {importPreview.data.completions.reduce(
                (sum, record) => sum + record.xp,
                0,
              )}{" "}
              XP
            </strong>
            , settings
            {importPreview.data.session ? ", and a saved workout" : ""}.
          </p>
          <p className="muted">
            Restoring will replace all activity, settings, and your saved
            workout on this device. Export your current data first if you want
            to keep it.
          </p>
          <button
            className="primary-button"
            onClick={() => void confirmImport()}
          >
            Replace & restore
            <Upload size={17} />
          </button>
          <button className="outline-button" onClick={exportFile}>
            Export current data
            <Download size={17} />
          </button>
          <button className="text-button" onClick={() => setDialog(null)}>
            Cancel
          </button>
          {notice && <p role="alert">{notice}</p>}
        </Modal>
      )}
    </div>
    </>
  );
}

function Waves() {
  return (
    <svg
      className="home-waves"
      viewBox="0 0 480 150"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="home-wave-back" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b5eee1" />
          <stop offset="55%" stopColor="#a1e7e2" />
          <stop offset="100%" stopColor="#87ddd5" />
        </linearGradient>
        <linearGradient id="home-wave-front" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8cddd1" />
          <stop offset="50%" stopColor="#64ccbf" />
          <stop offset="100%" stopColor="#98e5d9" />
        </linearGradient>
      </defs>
      <path
        className="wave-layer wave-back"
        d="M-80 14C85 9 188 128 327 91C406 68 477 8 560 40V180H-80Z"
        fill="url(#home-wave-back)"
      />
      <path
        className="wave-layer wave-front"
        d="M-80 138C50 155 145 114 225 100C310 86 345 25 422 30C490 35 530 100 560 105V180H-80Z"
        fill="url(#home-wave-front)"
        fillOpacity=".85"
      />
    </svg>
  );
}
