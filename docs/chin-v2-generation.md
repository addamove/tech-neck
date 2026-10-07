# Chin tuck image regeneration

Generated with the built-in image_gen tool (transparent background enabled).

Project asset: `public/art/chin-v2.png`.

The app renders a separate fixed wall. The active sprite crop is shifted by 65 source pixels to align the generated torso with the initial frame; the sprite is not re-encoded and retains its alpha channel.

## Exact generation prompt

Use case: precise-object-edit / identity-preserve.
Asset type: two-frame exercise sprite sheet for the existing mobile Tech Neck app.
Input image: public/art/chin.png is the edit target and appearance reference.
Regenerate this chin-tuck exercise as a precisely aligned TWO-FRAME sprite sheet, landscape 1536 by 1024, equal left/right panels 768 by 1024. True TRANSPARENT background. Remove BOTH walls completely, no background, no floor, no shadow, no dividing line, no arrows, no text. A separate stationary wall will be drawn by the app at the exact same x coordinate in both frames.
Keep the same adult man, same face and black hair, same turquoise tank top and shorts, same realistic clean exercise illustration, side profile facing RIGHT, crop at upper thighs. Exactly one man per panel, no additional body parts.
CRITICAL POSITIONAL INVARIANTS: the camera, zoom, vertical position, torso, shoulder, arms, hands, shorts and pelvis must be IDENTICAL between both frames, translated horizontally only by exactly 768 pixels. Copy the same lower body/torso/arms into the second panel. Within EACH panel the back of the upper torso is at x=305, shoulder and relaxed arm at x=355, front of torso at x=520; top of hair about y=38, waistband about y=742. Keep anatomy realistic, each hand has exactly four fingers and one thumb.
LEFT PANEL = initial relaxed head position: head slightly forward relative to shoulders, eyes level, chin neutral. RIGHT PANEL = active gentle chin tuck: move ONLY head and upper neck straight backward roughly 28 pixels toward the imagined wall, slight double chin and lengthened back of neck, eyes remain level, no upward/downward head tilt. The back of the head in the active frame should meet the vertical plane x=305. Do not move torso, shoulders or body backward to accomplish the tuck.
The two frames must read as the SAME stationary person changing ONLY head/neck position. Preserve generous transparent space in front of the face for a small arrow. Keep every rendered pixel inside its own panel.
