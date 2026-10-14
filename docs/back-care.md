# Back Care

Two levels based on the user's twelve-movement brochure. Active time is 5 minutes / 10 XP for Level 1 and 12 minutes / 30 XP for Level 2. The user's preparation setting (5/10/20 seconds) is additional. Both levels share one swipe family, retain separate exercise switches and use the common activity history and charts.

| Brochure | Movement | Seconds | Level 1 |
| --- | --- | ---: | --- |
| 1 | Reach and draw knees in | 40 | Yes |
| 2 | Supported back curl, soft roll | 40 | No |
| 3 | Figure-four stretch | 50 | Yes |
| 4 | Lying spinal twist | 50 | Yes |
| 5 | Supported abdominal curl, padded block | 40 | No |
| 6 | Kneeling roll-supported hinge | 40 | No |
| 7 | Prone arm lifts | 40 | Yes |
| 8 | Cat–cow | 40 | Yes |
| 9 | Cross-body curl | 40 | Yes |
| 10 | Supported rest | 180 | No |
| 11 | Bent-knee side lifts | 40 | Yes |
| 12 | Seated forward rest | 120 | No |

The brochure gives three minutes for movement 10 and two for movement 12. Other durations are app pacing choices to meet the approved totals. Movement 12 stays in Level 2 although its text permits a chair instead of a block. Dynamic movements use complete ten-second cycles, five seconds per state. Bilateral stretches split at 25 seconds; curls and side lifts switch at 20 seconds.

## Technique review

The brochure is the movement reference, not evidence that this exact timed sequence treats a condition. English instructions are concise original wording, with comfortable ranges, small curls rather than full sit-ups, normal breathing and stable padded equipment. Cat–cow explicitly mentions wrist discomfort. Exercises remain individually optional.

References consulted:

- [Mayo Clinic: back exercises](https://www.mayoclinic.org/healthy-lifestyle/adult-health/in-depth/back-pain/art-20546859): knee-to-chest, lower-back rotation and cat stretching.
- [NHS: back pain](https://www.nhs.uk/conditions/back-pain/): activity guidance and stopping exercises that worsen pain.
- [Guy's and St Thomas': physiotherapy and exercises](https://www.guysandstthomas.nhs.uk/health-information/low-back-pain/physiotherapy-and-exercises): graded, comfortable movement.
- [Cambridge University Hospitals: stretches](https://www.cuh.nhs.uk/patient-information/stretches-back-pain-management-programme/): gentle stretching guidance.

## Artwork and audio

54 new WebP frames, eighteen per style; cat–cow reuses the existing Night Stretch art. Opposite sides mirror the same asset. Photo frames use quality 85; marker frames use lossless WebP with decoded-pixel equality checks. Generation sources stay in ignored `work/back-care/originals`, not the deployed app.

`scripts/prepare-back-art.mjs` takes nine source sheets (A male/female/marker, B male/female/marker, C male/female/marker) followed by the corrected marker cross-body pair and three aligned warmup pairs (male/female/marker). Reviewed crops avoid neighbouring sprites. Pairs use equal canvases without resampling the marker strokes. The corrected v3 pair shows two separate, near-straight arms beside the torso, reaching forward during the curl. It replaces the ambiguous crossed-arm and hand-behind-head variants. Keep shoulder-to-hand silhouettes distinct; do not reintroduce crossed forearms. The final compression report is written beside the archived originals.

Generation brief: white background, entire person visible, purple clothes, simple existing marker style or matching male/female photo style; fixed camera, body size, pelvis and grounded limb positions across paired states. No text or embedded arrows. Effort arrows are SVG overlays in the app. They describe the displayed pose rather than the next transition: raised curls, arms and hips point up; lowered poses point down; the folded hinge points down and its upright pose points up. This convention applies to both levels, all styles and both mirrored sides.

Both neural voices have setup narration and sparse active cues, including side changes. The shared speech scheduler reserves the Start cue, prevents overlapping speech and caps speed at 1.5x. Generated audio is already normalized using the existing script.

The warmup pair was regenerated with arms resting overhead in both states. Only the legs bend towards the chest and extend back down; the head, shoulders and hips remain grounded. Matching 1254×480 crops register head, shoulder and hand anchors without resizing. Setup text and both voices match this revised demonstration.
