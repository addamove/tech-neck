# Tech Neck

A mobile-first, English-language posture routine with white and turquoise screens modeled after the supplied references. Built with React, TypeScript, Tailwind CSS, and Vite. No backend or account.

Screens below 768 px show the app. Wider windows show a mobile-only placeholder; resizing preserves the current screen and saved data.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. For a production preview:

```sh
npm run build
npm run preview
```

## GitHub Pages

Version **1.0.0**. Source: the public [tech-neck repository](https://github.com/addamove/tech-neck). In the repository's **Settings → Pages → Build and deployment**, choose **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` installs locked dependencies, runs the tests, builds the app, and publishes only `dist/` when `main` changes. It can also be run manually from Actions.

The workflow sets `VITE_BASE_PATH=/tech-neck/` for the project URL [addamove.github.io/tech-neck](https://addamove.github.io/tech-neck/). Vite, runtime artwork/audio links, the manifest, and service worker use that same base. Local development defaults to `/`.

To preview the project-path build locally:

```sh
VITE_BASE_PATH=/tech-neck/ npm run build
VITE_BASE_PATH=/tech-neck/ npm run preview
```

Open `http://localhost:4173/tech-neck/`. For a custom-domain or account-root deployment, set the workflow's base to `/`.

The setup follows the official [Vite deployment guide](https://vite.dev/guide/static-deploy.html) and [GitHub Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). GitHub Actions are pinned to verified release commits.

## Move your saved data

Workouts, XP, milestones, preferences, and paused progress remain in your browser's localStorage. Publishing the source or deploying Pages does not upload that data. Localhost and the deployed site have separate storage, as do different browsers and devices.

Before moving, open the old app's **Settings → Export backup** and save its JSON privately. On the new site, use **Settings → Import backup**, review the preview, and confirm replacement. The import replaces that site's current saved data; it does not merge histories. Keep the backup outside the public repository. The Git ignore rules exclude working drafts, local configuration, build output, and common backup filenames.

## Routine

Level 1 includes seven exercises, in this order:

| Exercise | Work | Preparation |
| --- | ---: | ---: |
| Chin tuck in | 60 s | 20 s |
| Snow angel on the wall | 65 s | 20 s |
| Snow angel with bent elbows | 65 s | 20 s |
| Lifting arms with correct head posture | 65 s | 20 s |
| Stretch the back of your neck | 30 s | 20 s |
| Stretch sides of your neck | 50 s | 20 s |
| Stretch your chest muscles | 50 s | 20 s |

Total: **8 minutes 45 seconds**, including preparation. Every completed routine earns 10 XP, including routines with skipped exercises. Work remaining excludes preparation; elapsed time includes both. Earlier completed 10-minute routines remain valid in saved history and backups.

Preparation demonstrates the exercise poses every 3 seconds while keeping the 20-second countdown and spoken instructions. The doorway chest stretch keeps its initial pose throughout preparation. Pausing freezes the other demonstrations. Side-neck stretches last 25 seconds per side: 7 seconds stretching, 2 resting, 7 stretching, 2 resting, then 7 stretching. The right side begins immediately at 25 seconds; rests show a neutral pose without movement arrows. During a workout, bottom tabs are hidden; Back still offers pause and save/exit.

All timings, instructions, pose sequences, and cue schedules live in `src/core/config.ts`. To add a routine, append to `ROUTINES` and supply its static pose artwork in `src/components/ExerciseArt.tsx`.

## Activity and milestones

Activity shows total XP, completed workouts, the current week, the selected calendar month, the current day streak, and recent workouts. Calendar dates use the device's local timezone; weeks start on Monday. Multiple resets on one day count as separate workouts and one active day.

Six achievement medals mark your first reset, 3- and 7-day streaks, 10 and 25 completed workouts, and 30 active days. Tap a medal to see its goal, progress, and first earned date. Achievements are calculated from completed workout history, so importing a backup restores the same milestones. They add no extra XP.

New medals earned by completing a workout automatically open that same detail window with a brief confetti celebration; multiple medals appear one at a time. Loading a page or importing a backup does not replay celebrations. Reduced-motion preferences suppress confetti.

After 10 valid completed workouts, Activity also shows a weekday bar chart and an hourly frequency line chart. Both use all-time history and local completion times, matching the calendar. Duplicate sessions and future-dated records do not count toward the unlock. Each chart includes an accessible count table.

## Illustration styles

Settings offers **Male**, **Female**, and **Marker sketch** illustrations. This choice is independent of voice, is saved on this device, and is included in backups. Older backups use Male. Changing illustrations preserves the current workout and its progress. Movement arrows use the same timed directions in every style; chin-tuck walls remain fixed between poses.

## Voice, persistence, and installation

Bundled English neural voice recordings play instructions before each exercise; timed cues guide rests, breathing, and side changes. The final three preparation seconds say “Three, two, one,” followed by “Start” as the exercise begins. The countdown follows the workout timer, pauses with it, and uses the selected voice. Skipping preparation goes straight to “Start”; resuming an active exercise does not repeat it. Settings offers **Female** (`en-US-JennyNeural`, the existing default) and **Male** (`en-US-AndrewNeural`), plus **Preview voice** to hear the selected voice. The selection is saved on this device and included in backups; older backups default to Female. Voices can be selected and previewed even when workout guidance is muted.

Both sets contain the same English instructions and cues and are generated by `scripts/generate-neural-audio.py`. Arm exercises give the combined breathing reminder once, 15 seconds into active exercise. The female set remains in `public/audio/`; the male set is in `public/audio/male/`. To regenerate one set, run `work/venv/bin/python scripts/generate-neural-audio.py --gender female` or `--gender male`. Generation verifies each clip against its preparation or cue deadline before installing it and preserves the other voice set. MP3s play locally and need no generation service at runtime. If a recording cannot play, the app falls back to the device's English speech synthesis when supported. Playback speed can be adjusted in Settings. Keep-screen-awake requests use the browser Wake Lock API, which needs HTTPS or localhost and a supporting browser. The workout shows the current wake-lock state.

Activity, preferences, and saved workout progress are stored in localStorage on this device. Reloaded workouts wait for explicit resume. Settings offers a JSON export and a validated import preview; restoring a backup requires confirming replacement. Export a backup before changing browsers or clearing website data.

The production build includes a web app manifest and service worker. After opening the deployed HTTPS app once, supported browsers cache the app, illustrations, medals, and voice clips for offline use. On iPhone, use Safari’s **Share → Add to Home Screen**; other browsers offer their own install action. Development mode does not register the service worker.

## Optimize images

`npm run optimize:images` creates four comparison samples in ignored `work/image-compression/`. `npm run optimize:images -- --apply` converts and validates all exercise images and medals, preserves original PNGs privately, and installs the WebP files. Photo-style images and medals use quality85; marker drawings use strictly lossless compression, preserving every decoded RGBA pixel. Sprite dimensions and crop coordinates remain unchanged. Icons stay PNG.

The originals are not duplicated in the deployed site. On a fresh clone, restore them from the original source commit before running the utility:

```sh
mkdir -p work/image-originals
git archive 6971858 public/art public/badges | tar -x -C work/image-originals --strip-components=1
npm run optimize:images -- --apply
```

The installed Sharp dependency is used only by this development utility. Compression settings follow the [official Sharp WebP documentation](https://sharp.pixelplumbing.com/api-output/#webp).

## Check

```sh
npm test
npm run build
```

Core tests cover phase transitions, timing, persistence validation, completion XP, and activity calculations. Artwork sources and generation notes are documented in `ASSETS.md`.
