# Working agreements

- Build with React and TypeScript; keep the interface and workout guidance in English.
- Use GPT-6.1 for implementation and Astra for planning when models are explicitly selected.
- Maintain three illustration styles: male, female, and simple marker drawings matching the existing collection. Align pose anchors for smooth transitions. Exercises using mirrored poses keep a static initial image during preparation; active side changes remain enabled.
- Compress photographic illustrations at quality 85; compress marker images losslessly. Preserve approved drawings during compression; do not redraw them.
- Maintain both English neural voices. Keep speech at or below 1.5x, avoid overlapping cues, and preserve the preparation countdown and Start cue.
- Keep durations and movement intervals configurable in core configuration. Preserve wake lock support, local storage, and backward-compatible JSON export/import.
- Complete and verify the feature before committing and pushing. Follow the user's current authorization for publishing.

- Eye Gym is marker-only regardless of the selected illustration style. Level 1 has 180 active seconds (30 blinking + 60 distance/rest + 30 circles + 60 palming); Level 2 has 300 active seconds with 180 seconds of palming. Preparation is additional. Gentle eye circles use closed eyes in art, text and both voices. Blinking cues run all five cycles, omitting only the initial Open cue. Keep research limitations in docs/eye-gym.md.
- Night Stretch has a deep-violet theme, three illustration styles and two levels: Level 1 is 300 active seconds; Level 2 is 450 active seconds with all eleven reference movements in their original order. Preparation is additional. Keep both levels in one swipe family; see docs/night-stretch.md for timing and source review.
- Back Care uses muted blue-violet and three styles. Level 1 is 300 active seconds / 10 XP without a roll or block; Level 2 is 720 seconds / 30 XP with all twelve brochure movements. Preparation is additional. Preserve the corrected marker cross-body pair when rebuilding artwork; see docs/back-care.md.
