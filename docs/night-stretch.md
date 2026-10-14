# Night Stretch

Five active minutes, plus the user's 5/10/20-second preparation before each of six exercises. 10 XP; activity and charts share the existing completed-workout history. Male, female and marker illustration styles are supported. Opposite sides reuse mirrored artwork.

| Exercise | Active time | Change |
| --- | ---: | --- |
| Seated side stretch | 60 s | Change side at 30 s |
| Child's pose | 30 s | One comfortable hold |
| Side-lying thigh stretch | 60 s | Change side at 30 s |
| Knees to chest | 30 s | One comfortable hold |
| Gentle lying twist | 60 s | Change side at 30 s |
| Reclined butterfly | 60 s | Supported, relaxed hold |

The sequence, five-minute duration and evening framing are app design choices, not a clinically validated sleep treatment. No claims about detoxification, curing pain or improving sleep are made. Positions should be comfortable, without bouncing or forcing the range. The user can disable individual movements. Preparation is a good time to read the setup; very short preparation settings can interrupt its narration for the countdown, as elsewhere in the app.

## Level 2 — all eleven movements

Following the user's request, Level 2 includes all eleven movements in the reference order. Its 450 seconds (7:30) are active time; preparation remains additional. Both levels share the Night Stretch swipe card and have separate exercise switches. Timing is selected for the app's duration target rather than copied from the article.

| Movement | Seconds | Timing details |
| --- | ---: | --- |
| Knees to chest | 30 | Comfortable hold |
| Lying twist | 60 | 30 per side |
| Reclined butterfly | 30 | Comfortable hold |
| Glute bridge | 40 | Lift, hold comfortably, release at the end |
| Child's pose | 30 | Comfortable hold |
| Neck stretch | 40 | 20 per side |
| Cat–cow | 50 | Five cycles, 5 seconds per pose |
| Seated side stretch | 40 | 20 per side |
| Side-lying thigh stretch | 60 | 30 per side |
| Mountain pose | 30 | Relaxed standing |
| Forward fold | 40 | Soft knees; rise slowly at the end |

Cat–cow includes a wrist-comfort cue because the position bears weight through the hands. It can be disabled individually. The text uses original concise instructions rather than reproducing the article's prose or unsupported benefit claims.

## Sources and frame review

[Byrdie's morning stretch article](https://www.byrdie.com/morning-stretch-routine) supplied the user's requested visual reference. All eleven embedded clips were reviewed at four evenly spaced frames each. Downloaded analysis files stay under ignored `work/night-stretch/`; third-party videos and frames are not shipped.

| JW Player clip | Duration | Frame observation |
| --- | ---: | --- |
| ibZ10SRM | 6 s | Knees drawn in; head stays supported |
| 4BvOJexy | 9 s | One bent knee crosses the body |
| dks0rors | 8 s | Reclined, soles together, knees open |
| y3sMm8NU | 12 s | Hips ease towards heels, arms forward |
| JeQ52KGE | 14 s | Side bend with arms overhead |
| 3xTjIUz0 | 9 s | Side-lying, upper knee bent |
| yANzZCbW | 11 s | Alternating spinal rounding/extension |
| 5BJBHcAa | 10 s | Hips elevated, shoulders and feet grounded |
| JO2e8aGs | 10 s | Upright kneeling side-neck hold |
| t378UumD | 8 s | Balanced relaxed standing |
| 3VjX8RLD | 14 s | Hip hinge with head hanging comfortably |

Independent technique and pacing references:

- [Mayo Clinic: stretching and flexibility](https://www.mayoclinic.org/healthy-lifestyle/fitness/basics/stretching-and-flexibility/hlv-20049447): normal breathing, approximately 30-second holds, no bouncing or painful holds.
- [NHS: stretching after exercise](https://www.nhs.uk/live-well/exercise/how-to-stretch-after-exercising/): lying thigh stretch and inner-thigh stretch setup.
- [Mayo Clinic: basic stretches](https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20546848): lower-back and thigh stretching.
- [Mayo Clinic: mindful movements](https://sharedfiles.mayoclinic.org/bedside/ope/GNT-20421908.html): comfortable reclining rotation and returning through the centre.

## Assets and voice

Original generated sprite sheets are archived in ignored `work/night-stretch/originals`. `scripts/prepare-night-art.mjs` and `scripts/prepare-night-level2-art.mjs` extract twelve poses per style, with photographic WebP quality 85 and lossless marker WebP verified against decoded crop pixels. No third-party photographs are reused. Purple clothing is paired with a deep-violet header and soft violet controls.

Both existing neural voices narrate setup and a small number of active cues: entry, side change when applicable, and release. No repeating breathing loop. The shared engine reserves Start's own slot, prevents overlap, and caps playback at 1.5x.

The local generator uses `edge-tts==7.3.1`; updating from 7.2.8 resolved a service handshake error. Generated MP3 assets are shipped locally, with no runtime dependency on that service.

Full Circle continues to require Neck + Hands + Eye Gym, preserving its original condition when Night Stretch becomes the fourth family.

The 36 exercise assets total 2,060,086 bytes after compression, compared with 7,703,230 bytes for their native PNG crops (73.3% smaller). Marker pixels are verified lossless; photographic quality is 85. Cat–cow anchors are aligned with crop padding and small display transforms.

## Time to Unwind achievement

Completing either Night Stretch level at or after 12:00 and before the next local midnight unlocks `night-unwind`. The completion time, rather than start time, determines eligibility. It uses the same local-clock convention as activity charts. The existing achievement system awards 100 XP once, opens the existing achievement modal and triggers confetti for a live completion; loading a backup does not replay the celebration.

Badge: `public/badges/night-unwind.webp`, 640px WebP at quality 85. Generated with the built-in imagegen tool. Prompt: a gold scalloped enamel medallion matching the existing collection, deep-violet interior, ivory seated side-stretch silhouette, setting sun, crescent moon and lavender leaves; white background, no text or detailed fingers.
