import { useEffect, useRef } from "react";
import { releaseStick, stickPush, walkStick } from "../game/scene/walkStick";

/** How far, in pixels, the knob travels from the center at a full push. */
const REACH = 38;

/** A thumb stick for walking on a touch screen: drag the knob the way to go; let go to stop. Tap-to-walk still works beside it. */
export function WalkStick() {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLSpanElement>(null);
  const finger = useRef<number | null>(null);

  // Leaving the screen (phase change, settings) must never leave the angler walking.
  useEffect(() => releaseStick, []);

  const move = (clientX: number, clientY: number) => {
    const box = base.current?.getBoundingClientRect();
    if (!box) return;
    const dx = clientX - (box.left + box.width / 2);
    const dy = clientY - (box.top + box.height / 2);
    const push = stickPush(dx, dy, REACH);
    walkStick.x = push.x;
    walkStick.y = push.y;
    const length = Math.hypot(dx, dy);
    const shown = length > REACH ? REACH / length : 1;
    if (knob.current) knob.current.style.transform = `translate(${dx * shown}px, ${dy * shown}px)`;
  };
  const end = () => {
    finger.current = null;
    releaseStick();
    if (knob.current) knob.current.style.transform = "";
  };

  return (
    <div
      ref={base}
      className="walk-stick"
      data-camera-control
      data-walk-stick
      // Keyboards walk with WASD; this is only where a thumb walks.
      aria-hidden
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        finger.current = event.pointerId;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        move(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (finger.current === event.pointerId) move(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => finger.current === event.pointerId && end()}
      onPointerCancel={(event) => finger.current === event.pointerId && end()}
      onLostPointerCapture={(event) => finger.current === event.pointerId && end()}
    >
      <span ref={knob} className="walk-stick-knob" />
    </div>
  );
}
