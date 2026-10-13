import { publicAssetUrl } from '../core/assets';

const pictures: Record<string, string> = {
  'eyes-open': 'open', 'eyes-closed': 'closed', 'eyes-squeeze': 'closed',
  'eyes-distance': 'distance', 'eyes-palming': 'palming',
  'eyes-circle-clockwise': 'circles', 'eyes-circle-counterclockwise': 'circles',
};

export default function EyeArt({ poseId, title }: { poseId: string; title: string }) {
  const picture = pictures[poseId];
  if (!picture) return null;
  const counterclockwise = poseId === 'eyes-circle-counterclockwise';
  return <div className="exercise-art eye-art">
    <img style={picture === 'closed' ? { transform: 'translateX(2.23%)' } : undefined} src={publicAssetUrl(`art/eye-gym/${picture}.webp`)} alt={`${title} — ${poseId.replace('eyes-', '').replaceAll('-', ' ')}`} draggable={false} />
    {picture === 'circles' && <svg className="eye-direction" viewBox="0 0 100 100" aria-hidden="true">
      {/* Only the guide reverses; the head stays still. Paths and arrowhead meet exactly. */}
      <g transform={counterclockwise ? 'translate(100 0) scale(-1 1)' : undefined}>
        <path d="M14 58A40 40 0 1 1 87 62" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M14 58A40 40 0 1 1 87 62" fill="none" stroke="var(--eye-arrow, #3eabc9)" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M85 66L84 58L92 61Z" fill="var(--eye-arrow, #3eabc9)" stroke="white" strokeWidth=".5" />
      </g>
    </svg>}
  </div>;
}
