import { useRef, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { Routine } from "../core/types";
import { adjacentRoutineId, routineSwipeDirection } from "./routineSwipe";

export default function RoutinePicker({ routines, selectedId, onChange, children }: {
  routines: Routine[];
  selectedId: string;
  onChange: (id: string) => void;
  children: ReactNode;
}) {
  const gesture = useRef<{ id: number; x: number; y: number; dragged: boolean } | null>(null);
  const suppressClick = useRef(false);
  const selectAdjacent = (direction: -1 | 1) => onChange(adjacentRoutineId(routines.map((routine) => routine.id), selectedId, direction));
  return (
    <div className="routine-choice">
      <div
        className="routine-swipe-zone"
        onPointerDown={(event) => {
          suppressClick.current = false;
          if (!event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest("[data-routine-control]")) return;
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false };
        }}
        onPointerMove={(event) => {
          const start = gesture.current;
          if (!start || start.id !== event.pointerId) return;
          if (Math.abs(event.clientX - start.x) > 12 && Math.abs(event.clientX - start.x) > Math.abs(event.clientY - start.y) * 1.4)
            start.dragged = true;
        }}
        onPointerUp={(event) => {
          const start = gesture.current;
          gesture.current = null;
          if (!start || start.id !== event.pointerId) return;
          const direction = routineSwipeDirection(start, { x: event.clientX, y: event.clientY });
          suppressClick.current = start.dragged || direction !== 0;
          if (direction) selectAdjacent(direction);
        }}
        onPointerCancel={() => { gesture.current = null; suppressClick.current = false; }}
        onClickCapture={(event) => {
          if (!suppressClick.current || event.detail === 0) return;
          suppressClick.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <button type="button" className="routine-step previous" data-routine-control aria-label="Previous routine" onClick={() => selectAdjacent(-1)}><ChevronLeft size={20} /></button>
        {children}
        <button type="button" className="routine-step next" data-routine-control aria-label="Next routine" onClick={() => selectAdjacent(1)}><ChevronRight size={20} /></button>
      </div>
      <label className="routine-picker">
        <span className="sr-only">Choose a routine</span>
        <select aria-label="Choose a routine" value={selectedId} onChange={(event) => onChange(event.target.value)}>
          {routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.title}</option>)}
        </select>
        <ChevronDown size={15} aria-hidden="true" />
      </label>
      <span className="routine-dots" aria-hidden="true">{routines.map((routine) => <i key={routine.id} className={routine.id === selectedId ? "current" : ""} />)}</span>
    </div>
  );
}
