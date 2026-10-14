import { useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { lookDrag, lookZoom } from "./scene/photoLook";

/** Pixels a press may wander and still count as a tap, which brings the panels back. */
export const TAP_SLOP = 6;
/** Arrow keys turn the view as a drag of this many pixels would. */
const KEY_STEP = 14;

export const PHOTO_KEY_TURNS: Record<string, readonly [number, number] | undefined> = {
  ArrowLeft: [-KEY_STEP, 0],
  ArrowRight: [KEY_STEP, 0],
  ArrowUp: [0, -KEY_STEP],
  ArrowDown: [0, KEY_STEP],
};

/** How far apart two touches are. */
function spread(points: Map<number, { x: number; y: number }>) {
  const [a, b] = [...points.values()];
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
}

/**
 * Photo mode's overlay: one finger or the mouse drags the view around, two fingers pinch to zoom, the wheel
 * zooms, and only a press that barely moved counts as the tap that brings the panels back.
 */
export function usePhotoDrag() {
  const points = useRef(new Map<number, { x: number; y: number }>());
  const travel = useRef(0);
  const pinched = useRef(false);
  return useMemo(() => {
    const handlers = {
      onPointerDown(event: ReactPointerEvent<HTMLElement>) {
        if (points.current.size === 0) {
          travel.current = 0;
          pinched.current = false;
        }
        points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (points.current.size > 1) pinched.current = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      },
      onPointerMove(event: ReactPointerEvent<HTMLElement>) {
        const before = points.current.get(event.pointerId);
        if (!before) return;
        const dx = event.clientX - before.x;
        const dy = event.clientY - before.y;
        if (points.current.size > 1) {
          const was = spread(points.current);
          points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          const now = spread(points.current);
          if (was > 0 && now > 0) lookZoom(was / now);
          return;
        }
        points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        travel.current += Math.hypot(dx, dy);
        lookDrag(dx, dy);
      },
      onPointerUp(event: ReactPointerEvent<HTMLElement>) {
        points.current.delete(event.pointerId);
      },
      onPointerCancel(event: ReactPointerEvent<HTMLElement>) {
        points.current.delete(event.pointerId);
        pinched.current = true;
      },
      onWheel(event: ReactWheelEvent<HTMLElement>) {
        lookZoom(Math.exp(Math.max(-1, Math.min(1, event.deltaY * 0.0015))));
      },
    };
    /** Whether the click that just landed was a tap, not the end of a drag or a pinch. */
    const tapped = () => {
      const tap = travel.current <= TAP_SLOP && !pinched.current;
      travel.current = 0;
      pinched.current = false;
      return tap;
    };
    return { handlers, tapped };
  }, []);
}
