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
