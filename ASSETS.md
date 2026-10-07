# Generated artwork

The exercise artwork was generated with the built-in image generation tool. No screenshot crops are shipped as app artwork. The supplied screenshots were used as exercise and layout references.

Files are in `public/art/`. The app uses the first side-neck pose with a horizontal reflection for the opposite direction because the generated sheet duplicated the same direction. `back-v3.png` is the corrected single portrait used for the back-of-neck stretch. Rejected `back.png` and `back-v2.png` are preserved in `work/rejected-art/` and are excluded from the offline app cache.

## Chin tuck: fixed wall revision

The user requested a correction to the wall jumping between chin-tuck poses. The built-in image generation tool produced `chin-v2.png`: a 1536×1024 PNG with two 768×1024 frames and a transparent background. The generated file is copied without re-encoding; the original `chin.png` remains preserved.

The revision brief requested the same adult male character in turquoise tank top and shorts, the same shoulder, arms, waist, legs, camera, scale, and crop in both frames, and true transparency with no background, wall, floor, shadow, text, or arrows. The left frame shows the initial side profile with eyes level; the right moves only the head and neck backward by about 28 pixels, with a slight double chin. The wall is rendered separately by the app.

The second generated torso is offset by 65 source pixels. `ExerciseArt.tsx` corrects that measured shoulder, torso, and waist displacement with a fixed source offset; it does not resize or center each pose independently. Both poses use the same SVG wall bounds, ending at source x287. The transparent character uses normal alpha compositing over the wall.

## Female and marker sets

`public/art/female/` contains a matching female guide in turquoise exercise clothes. `public/art/marker/` contains a male guide drawn with simple felt-marker outlines and colored-pencil texture. The built-in image generation tool generated each set's chin, snow, bent-elbow, back-neck, side-neck, and chest poses; files are copied unchanged from its output. Both sets use the same exercise order, movement directions, and speech as the original male guide.

Their chin sheets contain transparent people and no wall. One deterministic SVG wall is shared by both poses in each style; the marker wall uses a thin dark outline. Measured active-frame offsets align the bodies: female 103 source pixels (crop x665), marker 160 pixels (crop x608). The initial crop isx0; both retain the same 768×1024 coordinate frame. Minor raster shape differences remain, while the wall never moves.

The new snow sheets extend the T pose into the previous panel. The raster layer alone is clipped to exclude neighboring fingers. Female snow uses a constant 896×1024 frame with initial crop x−80 and active crop x640; marker uses 836×1024 with initial crop x−50 and active crop x700. This preserves body scale and centered anchors across the pair. Side-neck poses use the first tile and its reflection to preserve matching body geometry.

## Movement arrows

Original SVG arrows overlay the existing raster frames in the same crop coordinates. They indicate the upcoming arm movement, chin tuck or return, gentle neck stretch, and small forward step at the doorway. Side-neck arrows mirror with their frame. The back-neck rest interval keeps the same image and hides its stretch arrow. Image files, timings, and speech are unaffected by these overlays.

## Original generation prompt

Use case: scientific-educational. Asset type: two-frame exercise illustration sprite for a mobile posture workout app. Make a clean LANDSCAPE 1536x1024 sprite sheet with TWO EQUAL 768x1024 vertical panels side by side, seamless pure white #FFFFFF background, absolutely no dividing lines or typography. Each frame contains exactly one same adult male fitness demonstrator, warm medium tan skin, short neat black hair, clean shaven, athletic average build, teal/turquoise sleeveless tank top and matching teal shorts, barefoot. Style: polished softly shaded 3D instructional mannequin, simplified handsome facial features, natural anatomy, realistic proportions, gentle studio lighting. Consistent character at same scale in both frames, centered within each half, 8% blank margin around entire figure. No props except required wall/door jamb. No arrows, text, labels, logos, watermarks, floor, scene background. Pure white pixels around isolated person.

### chin

TWO PANELS side view facing right, cropped mid-thigh up, identical vertical pale gray wall behind back at left of each frame. LEFT PANEL starting relaxed head slightly forward separated from wall, chin level. RIGHT PANEL chin gently tucked straight backward, elongated back of neck, back of head touches wall. Torso stays upright same position. Clearly different head positions, no tilting up. Arms resting at sides.

### snow

TWO PANELS front full body view. LEFT PANEL arms straight down beside hips slightly away from body, palms forward. RIGHT PANEL arms straight extended horizontally sideways into a T, palms forward, shoulders relaxed. Head upright neutral identical in both. All fingertips must be comfortably inside own panel, no cropped limbs.

### bent

TWO PANELS front full body view. LEFT PANEL arms in goalpost: upper arms horizontal at shoulders, elbows bent 90 degrees with forearms and palms pointing up. RIGHT PANEL both arms reaching overhead, elbows mostly straight, palms facing forward. Head upright neutral identical in both. All fingertips inside own panel, no cropped limbs.

### back

TWO PANELS side profile facing left, waist up crop. BOTH PANELS SAME POSE: gently lower chin toward upper chest, hands interlaced resting on back of head, elbows angled forward/down. Neck flexed naturally, torso upright, no extreme bending. Arms simply rest with gravity. Fingers natural accurate. Same exact pose and framing both panels.

### sides

TWO PANELS front full body view. LEFT PANEL stretches HIS LEFT neck side/leftward tilt: person's head tilted toward HIS LEFT shoulder (viewer right), HIS LEFT hand gently rests on right/top of head, HIS RIGHT arm hangs down. RIGHT PANEL opposite: head tilted toward HIS RIGHT shoulder (viewer left), HIS RIGHT hand gently rests on left/top of head, HIS LEFT arm hangs down. Shoulders level and relaxed, modest tilt, no pulling. Clearly mirrored left and right stretches, feet fixed.

### chest

TWO PANELS full body seen from rear three-quarter view. LEFT PANEL doorway chest stretch using HIS LEFT arm: vertical pale gray door jamb next to left shoulder; LEFT upper arm to side at shoulder height, elbow bent90, entire forearm and open palm upright against jamb; slight forward step body turned gently away from supporting arm, other arm relaxed. RIGHT PANEL mirrored setup using HIS RIGHT arm and door jamb on right. Plain isolated jamb only. Barefoot stance stable. Hands on wall not overhead.

## Back-of-neck revision

A targeted built-in image edit used the original generated image as a character reference and IMG_2303.PNG as the pose reference. The revised brief requested one portrait, upright torso, chin gently lowered, two hands interlaced behind the skull, relaxed shoulders, neutral wrists, elbows forward and down, correct occlusion and proportions, white background, teal clothing, no text or arrows.

The final `back-v3.png` revision corrects the hand anatomy in that portrait after review.

## Voice

The Female option uses the unchanged English `en-US-JennyNeural` recordings in `public/audio/manifest.json`. The Male option uses `en-US-AndrewNeural`, with its separate manifest in `public/audio/male/manifest.json`. Both sets contain the same 17 English transcripts. Male clips were generated at the same +5% default speech rate and verified to fit the configured preparation and cue deadlines; the short rest cue is 1.56 seconds and the longest instruction is 13.56 seconds.

`scripts/generate-neural-audio.py --gender female|male` regenerates only the selected set, publishing its manifest after all clips have been synthesized and verified. `--voice`, `--rate`, and an optional `--target` inside `public/audio` support explicit generation changes. The female root audio files and manifest were checked to remain byte-identical when the male set was added. The MP3s are portable static assets and need no API key, network synthesis service, or macOS at runtime. The original Samantha voice drafts are preserved in the project's working files.
