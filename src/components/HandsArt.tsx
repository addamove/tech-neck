import { useId } from 'react';
import type { IllustrationStyle } from '../core/types';
import { publicAssetUrl } from '../core/assets';
import atlasLayouts from './handsArtLayout.json';

interface AtlasLayout { width: number; height: number; rows: number[]; rightOffsets: number[] }
interface Arrow { path: string; head: string }
const columns: Record<string, [number, number]> = {
  'hands-spread': [0, 1],
  'hands-bends': [1, 1],
  'hands-wrist-bends': [2, 1],
  'hands-palm-turns': [3, 0],
  'hands-wrist-sides': [4, 0],
};
const arrows: Record<string, Arrow[]> = {
  'hands-spread-a': [
    { path: 'M95 70H130', head: 'M146 70L130 61V79Z' },
    { path: 'M417 70H382', head: 'M366 70L382 61V79Z' },
  ],
  'hands-spread-b': [
    { path: 'M145 70H110', head: 'M94 70L110 61V79Z' },
    { path: 'M367 70H402', head: 'M418 70L402 61V79Z' },
  ],
  'hands-wrist-bends-a': [{ path: 'M478 245V112', head: 'M478 95L468 112H488Z' }],
  'hands-wrist-bends-b': [{ path: 'M478 85V218', head: 'M478 235L468 218H488Z' }],
  'hands-palm-turns-a': [{ path: 'M82 158C42 116 48 68 91 56', head: 'M108 52L89 46L94 65Z' }],
  'hands-palm-turns-b': [{ path: 'M105 52C47 64 42 111 73 145', head: 'M85 158L81 138L66 151Z' }],
  'hands-wrist-sides-a': [{ path: 'M365 80H405', head: 'M422 80L405 70V90Z' }],
  'hands-wrist-sides-b': [{ path: 'M147 80H107', head: 'M90 80L107 70V90Z' }],
};

export default function HandsArt({ poseId, title, illustrationStyle, isRest }: {
  poseId: string;
  title: string;
  illustrationStyle: IllustrationStyle;
  isRest: boolean;
}) {
  const clipId = useId();
  const exerciseId = poseId.slice(0, -2);
  const position = columns[exerciseId];
  const layout = (atlasLayouts as Partial<Record<IllustrationStyle, AtlasLayout>>)[illustrationStyle];
  if (!position || !layout) return null;
  const [row, aColumn] = position;
  const column = poseId.endsWith('-a') ? aColumn : 1 - aColumn;
  const cellWidth = layout.width / 2;
  const rowHeight = layout.rows[row + 1] - layout.rows[row];
  const stageHeight = cellWidth * 336 / 512;
  const top = (stageHeight - rowHeight) / 2;
  const movementArrows = isRest ? [] : arrows[poseId] ?? [];
  return (
    <div className="exercise-art hands-art">
      <svg className="hands-atlas" viewBox={`0 0 ${cellWidth} ${stageHeight}`} role="img" aria-label={`${title} — ${poseId.endsWith('-a') ? 'first' : 'second'} position`}>
        <defs><clipPath id={clipId}><rect x={0} y={top} width={cellWidth} height={rowHeight} /></clipPath></defs>
        {/* Clip the source cell first, then align it inside the fixed stage. */}
        <g transform={`translate(${column === 1 ? layout.rightOffsets[row] : 0} 0)`}>
        <g clipPath={`url(#${clipId})`}>
          <image href={publicAssetUrl(`art/hands-${illustrationStyle}.webp`)} x={-column * cellWidth} y={top - layout.rows[row]} width={layout.width} height={layout.height} />
        </g>
        </g>
        <g transform={`scale(${cellWidth / 512})`} aria-hidden="true">
          {movementArrows.map((arrow, index) => (
            <g key={index}>
              <path d={arrow.path} fill="none" stroke="white" strokeOpacity=".9" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
              <path d={arrow.head} fill="white" fillOpacity=".9" stroke="white" strokeOpacity=".9" strokeWidth={3} strokeLinejoin="round" />
              <path d={arrow.path} fill="none" stroke="#25bfae" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
              <path d={arrow.head} fill="#25bfae" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
