import type { IllustrationStyle } from '../core/types';
import { publicAssetUrl } from '../core/assets';

export const NIGHT_PICTURES: Record<string, { file: string; mirror?: boolean }> = {
  'night-side-left': { file: 'side', mirror: true }, 'night-side-right': { file: 'side' },
  'night-child': { file: 'child' },
  'night-quad-right': { file: 'quad' }, 'night-quad-left': { file: 'quad', mirror: true },
  'night-knees': { file: 'knees' },
  'night-twist-left': { file: 'twist' }, 'night-twist-right': { file: 'twist', mirror: true },
  'night-butterfly': { file: 'butterfly' },
  'night-bridge': { file: 'bridge' },
  'night-cat': { file: 'cat' }, 'night-cow': { file: 'cow' },
  'night-mountain': { file: 'mountain' }, 'night-fold': { file: 'fold' },
  'night-neck-left': { file: 'neck' }, 'night-neck-right': { file: 'neck', mirror: true },
};

// Mirror the same illustration for the opposite side, preserving scale and anchors.
export default function NightArt({ poseId, title, illustrationStyle }: { poseId: string; title: string; illustrationStyle: IllustrationStyle }) {
  const picture = NIGHT_PICTURES[poseId];
  if (!picture) return null;
  return <div className="exercise-art night-art" data-pose={poseId} data-style={illustrationStyle}>
    <div className="night-art-pose" style={picture.mirror ? { transform: 'scaleX(-1)' } : undefined}>
      <img src={publicAssetUrl(`art/night/${illustrationStyle}/${picture.file}.webp`)} alt={`${title} — ${poseId.replace('night-', '').replaceAll('-', ' ')}`} draggable={false} />
    </div>
  </div>;
}
