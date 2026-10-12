import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Routine } from '../core/types';
import { adjacentRoutineId, carouselDestination, carouselDragOffset, routineCarouselDirection } from './routineSwipe';
import { familyRoutineIds, routineFamily } from '../core/routineFamilies';
import SelectControl from './SelectControl';

const SNAP_MS = 350;
type Gesture = { id: number; x: number; y: number; startedAt: number; width: number; axis: 'horizontal' | 'vertical' | null };

export default function RoutinePicker({ routines, selectedId, rememberedRoutineIds, onChange, renderCard }: {
  routines: Routine[];
  selectedId: string;
  rememberedRoutineIds?: Record<string, string>;
  onChange: (id: string) => void;
  renderCard: (routine: Routine, disabled: boolean, selector: ReactNode) => ReactNode;
}) {
  const [displayedId, setDisplayedId] = useState(selectedId);
  const [incoming, setIncoming] = useState<{ id: string; direction: -1 | 1 } | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [settling, setSettling] = useState(false);
  const [pressed, setPressed] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const animation = useRef<{ target: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const displayedIdRef = useRef(displayedId);
  displayedIdRef.current = displayedId;
  const ids = familyRoutineIds(routines, displayedId, rememberedRoutineIds);

  const cancelMotion = () => {
    if (animation.current) clearTimeout(animation.current.timer);
    animation.current = null;
    setIncoming(null);
    gesture.current = null;
    setOffset(0);
    setDragging(false);
    setSettling(false);
    setPressed(false);
  };
  useEffect(() => {
    cancelMotion();
    setDisplayedId(selectedId);
  }, [selectedId]);
  useEffect(() => {
    let previousWidth = viewport.current?.getBoundingClientRect().width ?? 0;
    const observer = new ResizeObserver(([entry]) => {
      if (Math.abs(entry.contentRect.width - previousWidth) < 1) return;
      previousWidth = entry.contentRect.width;
      cancelMotion();
    });
    if (viewport.current) observer.observe(viewport.current);
    return () => {
      observer.disconnect();
      if (animation.current) clearTimeout(animation.current.timer);
    };
  }, []);

  const finishSlide = () => {
    const pending = animation.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    animation.current = null;
    setSettling(false);
    setIncoming(null);
    setOffset(0);
    setDisplayedId(pending.target);
    if (pending.target !== displayedIdRef.current) onChangeRef.current(pending.target);
  };
  const slide = (direction: -1 | 0 | 1, explicitTarget?: string) => {
    if (animation.current) return;
    const width = viewport.current?.getBoundingClientRect().width ?? 0;
    const destination = carouselDestination(ids, displayedIdRef.current, direction, width, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const target = explicitTarget ?? destination.targetId;
    setDragging(false);
    if (!destination.animate) {
      setOffset(0);
      setDisplayedId(target);
      if (target !== displayedIdRef.current) onChangeRef.current(target);
      return;
    }
    if (explicitTarget && direction) setIncoming({ id: explicitTarget, direction });
    setSettling(true);
    setOffset(destination.offset);
    animation.current = { target, timer: setTimeout(finishSlide, SNAP_MS + 60) };
  };
  const selectRoutine = (target: string) => {
    if (target === displayedIdRef.current) return;
    const current = routines.find(item => item.id === displayedIdRef.current)!;
    const next = routines.find(item => item.id === target)!;
    // Level changes replace the same family card without a misleading slide.
    if (routineFamily(current) === routineFamily(next)) {
      cancelMotion();
      setDisplayedId(target);
      onChangeRef.current(target);
      return;
    }
    const adjacent = routines.find(item => item.id === adjacentRoutineId(ids, displayedIdRef.current, 1))!;
    const direction = routineFamily(adjacent) === routineFamily(next) ? 1 : -1;
    slide(direction, target);
  };
  const releaseCapture = (id: number) => {
    if (viewport.current?.hasPointerCapture(id)) viewport.current.releasePointerCapture(id);
  };
  const panelIds = [incoming?.direction === -1 ? incoming.id : adjacentRoutineId(ids, displayedId, -1), displayedId, incoming?.direction === 1 ? incoming.id : adjacentRoutineId(ids, displayedId, 1)];
  const progress = offset / (viewport.current?.getBoundingClientRect().width || 1);
  const glowVisibility = [Math.max(0, progress), 1 - Math.abs(progress), Math.max(0, -progress)];
  const trackTransform = `translate3d(calc(-100% + ${offset}px), 0, 0)`;
  return (
    <div className="routine-choice">
      <div className="routine-carousel">
        <div className={`routine-backlights${settling ? ' settling' : ''}${pressed ? ' pressed' : ''}`} style={{ transform: trackTransform }} aria-hidden="true">
          {panelIds.map((id, index) => (
            <div className="routine-backlight-card" data-routine={id} key={index} style={{ opacity: glowVisibility[index] }}>
              <span className="play-backlight" />
            </div>
          ))}
        </div>
        <div
          ref={viewport}
          className="routine-viewport"
          onPointerDown={(event) => {
            suppressClick.current = false;
            if (animation.current || !event.isPrimary || event.button !== 0 || (event.target as Element).closest('select')) return;
            setPressed(Boolean((event.target as Element).closest('.start-play')));
            gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startedAt: performance.now(), width: event.currentTarget.getBoundingClientRect().width, axis: null };
          }}
          onPointerMove={(event) => {
            const start = gesture.current;
            if (!start || start.id !== event.pointerId || start.axis === 'vertical') return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (!start.axis) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
              if (Math.abs(dx) < Math.abs(dy) * 1.4) { start.axis = 'vertical'; setPressed(false); return; }
              start.axis = 'horizontal';
              suppressClick.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging(true);
              setPressed(false);
            }
            setOffset(carouselDragOffset(dx, start.width));
          }}
          onPointerUp={(event) => {
            setPressed(false);
            const start = gesture.current;
            gesture.current = null;
            if (!start || start.id !== event.pointerId || start.axis !== 'horizontal') return;
            suppressClick.current = true;
            releaseCapture(event.pointerId);
            slide(routineCarouselDirection(start, { x: event.clientX, y: event.clientY }, start.width, performance.now() - start.startedAt));
          }}
          onPointerCancel={(event) => {
            setPressed(false);
            const wasDragging = gesture.current?.axis === 'horizontal';
            gesture.current = null;
            releaseCapture(event.pointerId);
            if (wasDragging) { suppressClick.current = true; slide(0); }
          }}
          onLostPointerCapture={(event) => {
            // Implicit capture on a touched child is released when the viewport
            // takes capture. Its bubbling event must not cancel our swipe.
            if (event.target !== event.currentTarget) return;
            setPressed(false);
            if (gesture.current?.id !== event.pointerId || gesture.current.axis !== 'horizontal') return;
            gesture.current = null;
            suppressClick.current = true;
            slide(0);
          }}
          onPointerLeave={() => { if (gesture.current?.axis !== 'horizontal') setPressed(false); }}
          onKeyDownCapture={(event) => {
            if ((event.key === ' ' || event.key === 'Enter') && (event.target as Element).closest('.start-play')) setPressed(true);
          }}
          onKeyUpCapture={(event) => { if (event.key === ' ' || event.key === 'Enter') setPressed(false); }}
          onBlurCapture={() => setPressed(false)}
          onClickCapture={(event) => {
            if (!animation.current && (!suppressClick.current || event.detail === 0)) return;
            suppressClick.current = false;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <div
            className={`routine-track${settling ? ' settling' : ''}`}
            style={{ transform: trackTransform }}
            onTransitionEnd={(event) => { if (event.target === event.currentTarget && event.propertyName === 'transform') finishSlide(); }}
          >
            {panelIds.map((id, index) => {
              const routine = routines.find((item) => item.id === id)!;
              const inactive = index !== 1;
              return (
                <div className="routine-card" key={index} data-routine={id} inert={inactive} aria-hidden={inactive} role="group" aria-label={routine.title}>
                  {renderCard(routine, inactive || dragging || settling,
                    <SelectControl aria-label="Choose a routine" value={id} disabled={inactive || settling || dragging} onChange={(event) => selectRoutine(event.target.value)}>
                      {routines.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                    </SelectControl>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <button type="button" className="routine-step previous" aria-label="Previous routine" disabled={settling || dragging} onClick={() => slide(-1)}><ChevronLeft size={20} /></button>
        <button type="button" className="routine-step next" aria-label="Next routine" disabled={settling || dragging} onClick={() => slide(1)}><ChevronRight size={20} /></button>
      </div>
      <span className="routine-dots" aria-hidden="true">{ids.map((id) => <i key={id} className={id === displayedId ? 'current' : ''} />)}</span>
    </div>
  );
}
