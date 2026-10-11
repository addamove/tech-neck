export interface SwipePoint { x: number; y: number }

export function routineSwipeDirection(start: SwipePoint, end: SwipePoint): -1 | 0 | 1 {
  const horizontal = end.x - start.x;
  const vertical = end.y - start.y;
  if (Math.abs(horizontal) < 42 || Math.abs(horizontal) < Math.abs(vertical) * 1.4) return 0;
  return horizontal < 0 ? 1 : -1;
}

export function adjacentRoutineId(ids: string[], selectedId: string, direction: -1 | 1): string {
  if (!ids.length) return selectedId;
  const index = Math.max(0, ids.indexOf(selectedId));
  return ids[(index + direction + ids.length) % ids.length];
}

export function carouselDragOffset(horizontal: number, width: number): number {
  return Math.max(-width, Math.min(width, horizontal));
}

export function routineCarouselDirection(start: SwipePoint, end: SwipePoint, width: number, elapsedMs: number): -1 | 0 | 1 {
  if (width <= 0) return 0;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) < Math.abs(dy) * 1.4) return 0;
  const enoughTravel = Math.abs(dx) >= width * .25;
  const flick = Math.abs(dx) >= 38 && Math.abs(dx) / Math.max(elapsedMs, 1) >= .45;
  return enoughTravel || flick ? (dx < 0 ? 1 : -1) : 0;
}

export function carouselDestination(ids: string[], currentId: string, direction: -1 | 0 | 1, width: number, reducedMotion: boolean) {
  return {
    targetId: direction ? adjacentRoutineId(ids, currentId, direction) : currentId,
    offset: reducedMotion ? 0 : -direction * width,
    animate: width > 0 && !reducedMotion,
  };
}
