import { useId } from 'react';
import type { IllustrationStyle } from '../core/types';
import { publicAssetUrl } from '../core/assets';
import NightArt from './NightArt';

type BackPicture = { file: string; mirror?: boolean; direction?: 'lift' | 'lower' | 'fold' | 'extend' };
export const BACK_PICTURES: Record<string, BackPicture> = {
  'back-reach': { file: 'reach' }, 'back-knees': { file: 'knees' },
  'back-figure-left': { file: 'figure' }, 'back-figure-right': { file: 'figure', mirror: true },
  'back-twist-left': { file: 'twist' }, 'back-twist-right': { file: 'twist', mirror: true },
  'back-prone-down': { file: 'prone-down', direction: 'lift' }, 'back-prone-up': { file: 'prone-up', direction: 'lower' },
  'back-roller-curl-down': { file: 'roller-curl-down', direction: 'lift' }, 'back-roller-curl-up': { file: 'roller-curl-up', direction: 'lower' },
  'back-block-curl-down': { file: 'block-curl-down', direction: 'lift' }, 'back-block-curl-up': { file: 'block-curl-up', direction: 'lower' },
  'back-roller-fold': { file: 'roller-fold', direction: 'extend' }, 'back-roller-upright': { file: 'roller-upright', direction: 'fold' },
  'back-cross-left-down': { file: 'cross-down', direction: 'lift' }, 'back-cross-left-up': { file: 'cross-up', direction: 'lower' },
  'back-cross-right-down': { file: 'cross-down', mirror: true, direction: 'lift' }, 'back-cross-right-up': { file: 'cross-up', mirror: true, direction: 'lower' },
  'back-side-left-down': { file: 'side-down', direction: 'lift' }, 'back-side-left-up': { file: 'side-up', direction: 'lower' },
  'back-side-right-down': { file: 'side-down', mirror: true, direction: 'lift' }, 'back-side-right-up': { file: 'side-up', mirror: true, direction: 'lower' },
  'back-supported-rest': { file: 'supported-rest' }, 'back-seated-release': { file: 'seated-release' },
};

export default function BackArt({ poseId, title, illustrationStyle }: { poseId: string; title: string; illustrationStyle: IllustrationStyle }) {
  const marker = useId().replaceAll(':', '');
  if (poseId === 'back-cat' || poseId === 'back-cow') return <NightArt poseId={poseId.replace('back-', 'night-')} title={title} illustrationStyle={illustrationStyle} />;
  const picture = BACK_PICTURES[poseId];
  if (!picture) return null;
  const down = picture.direction === 'lower' || picture.direction === 'fold';
  // The arrow stays in the clear space above the movement, outside the body.
  // Use a joined SVG marker rather than a separate triangular overlay.
  return <div className="exercise-art back-art" data-pose={poseId} data-style={illustrationStyle}>
    <div className="back-art-pose" style={picture.mirror ? { transform: 'scaleX(-1)' } : undefined}>
      <img src={publicAssetUrl(`art/back/${illustrationStyle}/${picture.file}.webp`)} alt={`${title} — ${poseId.replace('back-', '').replaceAll('-', ' ')}`} draggable={false} />
      {picture.direction && <svg className="back-direction" viewBox="0 0 400 300" aria-hidden="true">
        <defs><marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3" markerHeight="3" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor" /></marker></defs>
        <path d={down ? 'M72 44 L72 82' : 'M72 82 L72 44'} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" markerEnd={`url(#${marker})`} />
      </svg>}
    </div>
  </div>;
}
