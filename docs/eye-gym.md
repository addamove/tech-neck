# Eye Gym · Levels 1 and 2

Level 1 has 180 active seconds; Level 2 has 300 active seconds. Both use the global 5/10/20-second preparation setting before each enabled exercise, four exercises, 5 workout XP, and the same Activity totals and charts as other routines. All illustration preferences use the marker assets for Eye Gym; selecting it does not change the user's Neck/Hands artwork preference.

| Exercise | Active time | Sequence |
|---|---:|---|
| Soft blinking | 30 seconds | Five cycles: 2 seconds open, 2 seconds closed, 2 seconds gentle squeeze without wrinkling the outer corners |
| Look away & rest | 60 seconds | Twice: 20 seconds looking about 6 metres away, blinking naturally, then 10 seconds eyes closed |
| Gentle eye circles | 30 seconds | 15 seconds clockwise, then 15 counterclockwise; small comfortable range, head still, no straining |
| Palming | 60 seconds in Level 1; 180 seconds in Level 2 | Supported elbows, clean cupped hands shading closed eyes without touching/pressing the eyeballs; relaxed breathing; closing eyes with hands down is an alternative |

Follow the voice rather than watching the phone. Stop for discomfort or dizziness. This is a screen-break routine, not treatment for an eye condition or a promise to improve eyesight. Persistent symptoms need an eye-care assessment. The final five seconds of palming contain the gentle release instruction in both levels.

## Evidence and limits

- [AAO: Digital Devices and Your Eyes](https://aao.org/eye-health/tips-prevention/blue-light-digital-eye-strain) recommends blinking and looking away from screens for digital discomfort.
- [AAO EyeWiki: Computer Vision Syndrome](https://eyewiki.aao.org/Computer_Vision_Syndrome_%28Digital_Eye_Strain%29) discusses reduced/incomplete blinking and blink training, including brief eye closure and squeezing. The precise open/closed/gentle-squeeze 2/2/2 cycle here is the user's requested version; it is not represented as a validated treatment protocol.
- [Moorfields: 10 steps for digital eye strain relief](https://www.moorfields.nhs.uk/private/about-moorfields-private/blog-articles/10-steps-for-digital-eye-strain-relief) suggests 20 seconds looking into the distance followed by 10 seconds of eye closure, plus slow blinking.
- [Hanford occupational-health handout](https://www.hanford.gov/health/files.cfm/Eye_Strain_Handout.pdf) describes palming as a short break. This educational handout is not clinical-trial evidence.
- [AAO: Common Eye and Vision Myths](https://aao.org/eye-health/tips-prevention/five-vision-myths) distinguishes exercises for particular diagnosed conditions from unsupported general eyesight-improvement claims.

The exact three- and five-minute sequences are product choices. Eye circles and palming have weaker evidence for screen-related symptoms than breaks/blinking and were included at the user's explicit request. Avoid extreme gaze and pressure on the eyes.

## Artwork and voice

Built-in image generation produced a four-cell marker sheet (`exec-34e03842-6441-4bfa-8d42-7e30693de229.png`) and one circle illustration (`exec-5d45c842-2916-423f-83d0-9fac7b2fa592.png`). Original copies and SHA-256 compression records are in ignored `work/eye-gym/originals/`.

Prompt summary: match the existing simple childlike marker man with thick irregular black contours, sparse peach skin and cyan tank-top strokes, pure white background; front eyes open / same face eyes gently closed / look toward a distant tree / hands loosely cupped over closed eyes. The second image uses the same character with visible eye whites and upward gaze, still head, ample white space for an SVG direction arrow. No text, photo detail, shadows or gradients. Circle direction reverses only the SVG guide, never the head. Closed and gentle-squeeze phases share the relaxed closed-eye drawing intentionally: the squeeze should not create wrinkles or a dramatic facial change.

`node scripts/prepare-eye-art.mjs SHEET_SOURCE CIRCLES_SOURCE` crops at native size and encodes lossless WebP. Every output is checked against its PNG crop for exact decoded RGBA equality. Shipped files are in `public/art/eye-gym/`. Total is approximately 2.05 MiB, 35% smaller than equivalent PNG crops; no raster resampling or redrawing during compression.

Both English neural voice sets are generated with `scripts/generate-neural-audio.py --gender female|male --missing-only`. Open/Close/Gently squeeze cues follow the two-second pose boundaries, with the initial Open cue following the reserved Start slot. The blink cues play only for the first three cycles (18 seconds); the last two cycles are visual-only. Other transitions have spoken cues; playback remains capped at 1.5x and cancels at the next cue/phase.
