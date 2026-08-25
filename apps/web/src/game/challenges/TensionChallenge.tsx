import { useEffect, useRef, useState } from "react";

type Props = {
  failMs: number;
  onSuccess: () => void;
  onFail: () => void;
};

const HALF_BAND = 0.12;

function targetCenter(now: number) {
  return 0.5 + Math.sin(now / 700) * 0.22;
}

export function TensionChallenge({ failMs, onSuccess, onFail }: Props) {
  const needle = useRef(0.5);
  const holding = useRef(false);
  const outside = useRef(0);
  const survived = useRef(0);
  const done = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const onFailRef = useRef(onFail);
  onSuccessRef.current = onSuccess;
  onFailRef.current = onFail;
  const [, setTick] = useState(0);

  useEffect(() => {
    const down = (event: PointerEvent | KeyboardEvent) => {
      if ("code" in event && event.code !== "Space") return;
      holding.current = true;
    };
    const up = () => {
      holding.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      const center = targetCenter(now);
      if (holding.current) needle.current = Math.min(1, needle.current + dt / 900);
      else needle.current = Math.max(0, needle.current - dt / 800);
      const inGreen = needle.current >= center - HALF_BAND && needle.current <= center + HALF_BAND;
      if (inGreen) {
        outside.current = Math.max(0, outside.current - dt);
        survived.current += dt;
      } else {
        outside.current += dt;
      }
      if (done.current) return;
      if (outside.current > failMs) {
        done.current = true;
        onFailRef.current();
        return;
      }
      if (survived.current > 3200) {
        done.current = true;
        onSuccessRef.current();
        return;
      }
      setTick((n) => n + 1);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [failMs]);

  const center = targetCenter(performance.now());
  return (
    <div
      className="tension"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        needle.current = 1 - (event.clientY - rect.top) / rect.height;
      }}
    >
      <div className="tension-meter">
        <div
          className="tension-green"
          style={{ bottom: `${(center - HALF_BAND) * 100}%`, height: `${HALF_BAND * 2 * 100}%` }}
        />
        <div className="tension-needle" style={{ bottom: `${needle.current * 100}%` }} />
      </div>
      <div>
        <p>Hold Space or press/hold screen to raise drag. Ease to drop. Stay in the moss band.</p>
        <p>Or drag/move mouse up and down inside this area.</p>
      </div>
    </div>
  );
}
