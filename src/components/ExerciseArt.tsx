import BackArt from './BackArt';
import NightArt from './NightArt';
import EyeArt from './EyeArt';
import type { IllustrationStyle } from "../core/types";
import { publicAssetUrl } from "../core/assets";
import HandsArt from './HandsArt';

interface PoseArt {
  sheet: string;
  x: number;
  width?: number;
  height?: number;
  sheetWidth?: number;
  mirror?: boolean;
  visibleWidth?: number;
  wall?: boolean;
  wallEdge?: number;
  wallVariant?: "solid" | "sketch";
  arrowTransform?: string;
  alignment?: { scale: number; x: number; y: number; stageWidth: number };
}
const MALE_POSES: Record<string, PoseArt> = {
  "chin-tuck-initial": { sheet: "chin-v2", x: 0, wall: true },
  // The generated second body is 65 source pixels left of the first. Align the
  // measured shoulder/torso/waist anchors without rescaling or moving the wall.
  "chin-tuck-active": { sheet: "chin-v2", x: 703, wall: true },
  "snow-angel-down": { sheet: "snow", x: 0, visibleWidth: 690 },
  "snow-angel-up": { sheet: "snow", x: 700, width: 836 },
  "bent-angel-down": { sheet: "bent", x: 0 },
  "bent-angel-up": { sheet: "bent", x: 768 },
  "arm-lift-down": { sheet: "snow", x: 0, visibleWidth: 690 },
  "arm-lift-up": { sheet: "bent", x: 768 },
  "back-neck-stretch": {
    sheet: "back-v3",
    x: 0,
    width: 1024,
    height: 1536,
    sheetWidth: 1024,
  },
  "side-neck-left": { sheet: "sides", x: 0 },
  "side-neck-right": { sheet: "sides", x: 0, mirror: true },
  "chest-left": { sheet: "chest", x: 0 },
  "chest-right": { sheet: "chest", x: 768 },
};

function standardPoses(
  folder: string,
  wallEdge: number,
  sketch = false,
): Record<string, PoseArt> {
  const chinWall = {
    wall: true,
    wallEdge,
    wallVariant: sketch ? ("sketch" as const) : ("solid" as const),
  };
  return {
    "chin-tuck-initial": { sheet: `${folder}/chin`, x: 0, ...chinWall },
    "chin-tuck-active": { sheet: `${folder}/chin`, x: 768, ...chinWall },
    "snow-angel-down": { sheet: `${folder}/snow`, x: 0 },
    "snow-angel-up": { sheet: `${folder}/snow`, x: 768 },
    "bent-angel-down": { sheet: `${folder}/bent`, x: 0 },
    "bent-angel-up": { sheet: `${folder}/bent`, x: 768 },
    "arm-lift-down": { sheet: `${folder}/snow`, x: 0 },
    "arm-lift-up": { sheet: `${folder}/bent`, x: 768 },
    "back-neck-stretch": {
      sheet: `${folder}/back`,
      x: 0,
      width: 1024,
      height: 1536,
      sheetWidth: 1024,
    },
    "side-neck-left": { sheet: `${folder}/sides`, x: 0 },
    "side-neck-right": { sheet: `${folder}/sides`, x: 0, mirror: true },
    "chest-left": { sheet: `${folder}/chest`, x: 0 },
    "chest-right": { sheet: `${folder}/chest`, x: 768 },
  };
}
const FEMALE_POSES = standardPoses("female", 287);
FEMALE_POSES["chin-tuck-active"].x = 665;
FEMALE_POSES["snow-angel-down"] = {
  sheet: "female/snow",
  x: -80,
  width: 896,
  visibleWidth: 720,
  arrowTransform: "translate(60 0)",
};
FEMALE_POSES["snow-angel-up"] = {
  sheet: "female/snow",
  x: 640,
  width: 896,
  arrowTransform: "translate(30 0)",
};
FEMALE_POSES["arm-lift-down"] = FEMALE_POSES["snow-angel-down"];
const MARKER_POSES = standardPoses("marker", 280, true);
MARKER_POSES["chin-tuck-active"].x = 608;
MARKER_POSES["snow-angel-down"] = {
  sheet: "marker/snow",
  x: -50,
  width: 836,
  visibleWidth: 740,
  arrowTransform: "translate(16 0)",
};
MARKER_POSES["snow-angel-up"] = { sheet: "marker/snow", x: 700, width: 836 };
MARKER_POSES["arm-lift-down"] = MARKER_POSES["snow-angel-down"];

// Keep the existing neutral side-neck rest framing independent of arm demos.
const SIDE_REST_ART: Record<IllustrationStyle, PoseArt> = {
  male: { ...MALE_POSES["snow-angel-down"] },
  female: { ...FEMALE_POSES["snow-angel-down"] },
  marker: { ...MARKER_POSES["snow-angel-down"] },
};

// The photos have different framing despite equal sheet dimensions. Register
// feet midpoints and head/foot height to one stage, with room for raised hands.
// Uniform scaling preserves anatomy; the source crop still clips nearby hands.
function alignArmPhotos(
  poses: Record<string, PoseArt>,
  anchors: Record<string, { scale: number; centerX: number; footY: number }>,
  footBaseline: number,
) {
  for (const [poseId, anchor] of Object.entries(anchors)) {
    poses[poseId] = {
      ...poses[poseId],
      alignment: {
        scale: anchor.scale,
        x: 448 - anchor.centerX * anchor.scale,
        y: footBaseline - anchor.footY * anchor.scale,
        stageWidth: 896,
      },
    };
  }
}
alignArmPhotos(MALE_POSES, {
  "snow-angel-down": { scale: .92, centerX: 362, footY: 934 },
  "snow-angel-up": { scale: 828 / 901, centerX: 428, footY: 935 },
  "bent-angel-down": { scale: 1, centerX: 383, footY: 985 },
  "bent-angel-up": { scale: 1, centerX: 382, footY: 985 },
  "arm-lift-down": { scale: .92, centerX: 362, footY: 934 },
  "arm-lift-up": { scale: 1, centerX: 382, footY: 985 },
}, 985);
alignArmPhotos(FEMALE_POSES, {
  "snow-angel-down": { scale: 826 / 911, centerX: 439, footY: 942 },
  "snow-angel-up": { scale: 826 / 911, centerX: 449.5, footY: 942 },
  "bent-angel-down": { scale: 1, centerX: 382.5, footY: 986 },
  "bent-angel-up": { scale: 1, centerX: 381.5, footY: 986 },
  "arm-lift-down": { scale: 826 / 911, centerX: 439, footY: 942 },
  "arm-lift-up": { scale: 1, centerX: 381.5, footY: 986 },
}, 986);
const STYLE_POSES: Record<IllustrationStyle, Record<string, PoseArt>> = {
  male: MALE_POSES,
  female: FEMALE_POSES,
  marker: MARKER_POSES,
};

// Level-two frames are individual native-resolution crops from one atlas.
// Body registration is expressed by CSS transforms; source pixels stay intact.
for (const [style, poses] of Object.entries(STYLE_POSES)) {
  for (const state of ["left", "center", "right"]) {
    poses[`head-turn-${state}`] = {
      sheet: `neck-level2/${style}/head-turn-${state}`,
      x: 0, width: 512, height: 700 * 512 / 418, sheetWidth: 512,
    };
  }
  poses["head-turn-right"] = { ...poses["head-turn-left"], mirror: true };
  for (const direction of ["front", "back"]) {
    for (const phase of [1, 2, 3]) {
      poses[`arm-circles-${direction}-${phase}`] = {
        sheet: `neck-level2/${style}/arm-circle-${phase}`,
        x: 0, width: 527, height: 887, sheetWidth: [443, 527, 360][phase - 1],
      };
    }
    poses[`arm-circles-${direction}`] = poses[`arm-circles-${direction}-1`];
  }
  // Measured torso centers on the three native 418px arm cells. Translate
  // the fixed trunk only; the artwork pixels and character scale stay intact.
  const offsets = { male: [8, 12, 70], female: [0, 17, 78], marker: [0, 52, 78] }[style as IllustrationStyle];
  for (const direction of ["front", "back"]) {
    for (const phase of [1, 2, 3]) {
      poses[`arm-circles-${direction}-${phase}`].alignment = {
        scale: 1, x: offsets[phase - 1], y: 0, stageWidth: 527,
      };
      poses[`arm-circles-${direction}-${phase}`].arrowTransform = `translate(${-offsets[phase - 1]} 0)`;
    }
  }
  // Register the front-facing torso to the turned view; the mirrored turn
  // already shares the same center and framing as its source.
  const headOffsets = { male: [-5.5, 2], female: [-13.5, 1.5], marker: [-1.5, 0] }[style as IllustrationStyle];
  for (const state of ["left", "center", "right"]) {
    poses[`head-turn-${state}`].alignment = { scale: 1, x: headOffsets[state === "center" ? 1 : 0] * 512 / 418, y: 0, stageWidth: 512 };
  }
}

interface MovementArrow {
  path: string;
  head: string;
}
interface Movement {
  label: string;
  arrows: MovementArrow[];
}
const raiseArms: Movement = {
  label: "Lift your arms. Inhale as you lift.",
  arrows: [
    {
      path: "M125 470C90 440 78 390 82.5 345",
      head: "M85 315L64 342L101 348Z",
    },
    {
      path: "M625 470C655 440 664 390 658.5 345",
      head: "M658 315L641 348L676 342Z",
    },
  ],
};
const lowerFromOverhead: Movement = {
  label: "Lower your arms. Exhale as you lower.",
  arrows: [
    { path: "M145 125V253", head: "M145 285L125 253H165Z" },
    { path: "M625 125V253", head: "M625 285L605 253H645Z" },
  ],
};
const MOVEMENTS: Record<string, Movement> = {
  "chin-tuck-initial": {
    label: "Gently tuck your chin toward the wall.",
    arrows: [{ path: "M685 225H607", head: "M575 225L607 205V245Z" }],
  },
  "chin-tuck-active": {
    label: "Keep your chin tucked toward the wall.",
    arrows: [{ path: "M615 225H537", head: "M505 225L537 205V245Z" }],
  },
  "snow-angel-down": raiseArms,
  "snow-angel-up": {
    label: "Lower your arms. Exhale as you lower.",
    arrows: [
      { path: "M125 310Q125 400 190 443.5", head: "M215 465L179 454L201 433Z" },
      { path: "M710 310Q710 400 645 443.5", head: "M620 465L634 433L656 454Z" },
    ],
  },
  "bent-angel-down": {
    label: "Extend your arms upward. Inhale as you lift.",
    arrows: [
      { path: "M90 295V187", head: "M90 155L70 187H110Z" },
      { path: "M680 295V187", head: "M680 155L660 187H700Z" },
    ],
  },
  "bent-angel-up": lowerFromOverhead,
  "arm-lift-down": {
    label: "Lift your arms straight up. Inhale as you lift.",
    arrows: [
      { path: "M125 470V347", head: "M125 315L105 347H145Z" },
      { path: "M625 470V347", head: "M625 315L605 347H645Z" },
    ],
  },
  "arm-lift-up": lowerFromOverhead,
  "back-neck-stretch": {
    label:
      "Gently nod your chin toward your chest. Let your arms rest; do not press down.",
    arrows: [
      {
        path: "M145 285C75 335 70 425 100.5 465",
        head: "M125 485L88 478L113 452Z",
      },
    ],
  },
  // The right-side frame mirrors the entire crop, including this arrow, once.
  "side-neck-left": {
    label: "Gently bring your ear toward your left shoulder.",
    arrows: [
      { path: "M255 145C235 80 275 31 310 33", head: "M345 35L313 14L307 52Z" },
    ],
  },
  "side-neck-right": {
    label: "Gently bring your ear toward your right shoulder.",
    arrows: [
      { path: "M255 145C235 80 275 31 310 33", head: "M345 35L313 14L307 52Z" },
    ],
  },
  "chest-left": {
    label: "Take a small step forward. Keep your forearm against the doorway.",
    arrows: [
      { path: "M565 855L627.5 795.5", head: "M650 775L615 783L640 808Z" },
    ],
  },
  "chest-right": {
    label: "Take a small step forward. Keep your forearm against the doorway.",
    arrows: [
      { path: "M215 855L152.5 795.5", head: "M130 775L140 808L165 783Z" },
    ],
  },
};

// Head turns use a short horizontal curve, never a rotation ring around the head.
MOVEMENTS["head-turn-left"] = {
  label: "Gently turn your head to your left. Keep your shoulders still.",
  arrows: [{ path: "M212 155Q256 174 300 155", head: "M320 149L298 145L304 165Z" }],
};
MOVEMENTS["head-turn-right"] = {
  label: "Gently turn your head to your right. Keep your shoulders still.",
  arrows: [{ path: "M300 155Q256 174 212 155", head: "M192 149L208 165L214 145Z" }],
};
MOVEMENTS["head-turn-center"] = { label: "Return your head to center.", arrows: [] };
for (const direction of ["front", "back"]) {
  const forward = direction === "front";
  const movement = {
    label: `Make large controlled arm swings ${forward ? "forward" : "backward"}. Keep your torso still and move through a comfortable range.`,
    arrows: forward ? [{
      path: "M305 500C490 470 480 160 330 105",
      head: "M302 96L325 123L337 90Z",
    }] : [{
      path: "M330 105C480 160 490 470 305 500",
      head: "M275 502L308 516L309 484Z",
    }],
  };
  MOVEMENTS[`arm-circles-${direction}`] = movement;
  for (const phase of [1, 2, 3]) MOVEMENTS[`arm-circles-${direction}-${phase}`] = movement;
}

export default function ExerciseArt({
  poseId,
  title,
  isRest = false,
  illustrationStyle = "male",
}: {
  poseId: string;
  title: string;
  isRest?: boolean;
  illustrationStyle?: IllustrationStyle;
}) {
  if (poseId.startsWith('back-') && !poseId.startsWith('back-neck-')) return <BackArt poseId={poseId} title={title} illustrationStyle={illustrationStyle} />;
  if (poseId.startsWith('night-')) return <NightArt poseId={poseId} title={title} illustrationStyle={illustrationStyle} />;
  if (poseId.startsWith('eyes-')) return <EyeArt poseId={poseId} title={title} />;
  if (poseId.startsWith('hands-')) {
    return <HandsArt poseId={poseId} title={title} isRest={isRest} illustrationStyle={illustrationStyle} />;
  }
  const neutralSideRest =
    isRest && (poseId === "side-neck-left" || poseId === "side-neck-right");
  const art =
    neutralSideRest
      ? SIDE_REST_ART[illustrationStyle]
      : STYLE_POSES[illustrationStyle][poseId];
  if (!art) return null;
  const width = art.width ?? 768;
  const stageWidth = art.alignment?.stageWidth ?? width;
  const movement =
    isRest && poseId === "chin-tuck-initial"
      ? {
          label: "Relax and let your head return to the starting position.",
          arrows: [{ path: "M575 225H653", head: "M685 225L653 205V245Z" }],
        }
      : isRest && (poseId === "back-neck-stretch" || neutralSideRest)
        ? { label: "Rest for two seconds.", arrows: [] }
        : MOVEMENTS[poseId];
  return (
    <div className="exercise-art" key={`${illustrationStyle}:${poseId}`}>
      <div
        className="pose-crop"
        style={{
          aspectRatio: `${stageWidth} / ${art.height ?? 1024}`,
          transform: art.mirror ? "scaleX(-1)" : undefined,
        }}
      >
        <div
          className="pose-content"
          style={art.alignment ? {
            width: `${width / stageWidth * 100}%`,
            left: `${art.alignment.x / stageWidth * 100}%`,
            top: `${art.alignment.y / (art.height ?? 1024) * 100}%`,
            transform: `scale(${art.alignment.scale})`,
          } : undefined}
        >
        {art.wall && (
          <svg className="chin-wall" viewBox="0 0 768 1024" aria-hidden="true">
            <rect
              x={(art.wallEdge ?? 287) - 82}
              y={0}
              width={82}
              height={1024}
              fill={art.wallVariant === "sketch" ? "#ffffff" : "#e8eff3"}
              stroke={art.wallVariant === "sketch" ? "#566461" : "none"}
              strokeWidth={art.wallVariant === "sketch" ? 3 : 0}
            />
            <path
              d={`M${(art.wallEdge ?? 287) - 2} 0V1024`}
              fill="none"
              stroke={art.wallVariant === "sketch" ? "#566461" : "#c4cfd5"}
              strokeWidth={art.wallVariant === "sketch" ? 2 : 4}
            />
          </svg>
        )}
        <div
          className="pose-image"
          style={{
            clipPath: art.visibleWidth
              ? `inset(0 ${((width - art.visibleWidth) / width) * 100}% 0 0)`
              : undefined,
          }}
        >
          <img
            src={publicAssetUrl(`art/${art.sheet}.webp`)}
            alt={`${title} — ${neutralSideRest ? "neutral resting" : poseId.split("-").slice(-1)[0]} position. ${movement?.label ?? ""}`}
            style={{
              width: `${((art.sheetWidth ?? 1536) / width) * 100}%`,
              left: `${(-art.x / width) * 100}%`,
              mixBlendMode: art.wall ? "normal" : undefined,
            }}
            draggable={false}
          />
        </div>
        {movement && movement.arrows.length > 0 && (
          <svg
            className="movement-arrows"
            viewBox={`0 0 ${width} ${art.height ?? 1024}`}
            aria-hidden="true"
          >
            <g transform={art.arrowTransform}>
              {(poseId === "head-turn-right" && art.mirror ? MOVEMENTS["head-turn-left"].arrows : movement.arrows).map((arrow, index) => (
                <g key={index}>
                  {/* Both outline parts sit behind the entire cyan silhouette. */}
                  <path
                    d={arrow.path}
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity=".85"
                    strokeWidth={22}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={arrow.head}
                    fill="#ffffff"
                    fillOpacity=".85"
                    stroke="#ffffff"
                    strokeOpacity=".85"
                    strokeWidth={5}
                    strokeLinejoin="round"
                  />
                  <path
                    d={arrow.path}
                    fill="none"
                    stroke="#25bfae"
                    strokeWidth={15}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d={arrow.head} fill="#25bfae" />
                </g>
              ))}
            </g>
          </svg>
        )}
        </div>
      </div>
    </div>
  );
}
