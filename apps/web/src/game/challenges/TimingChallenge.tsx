import { useEffect, useRef, useState } from "react";

type Props = {
  hits: number;
  zone: number;
  onSuccess: () => void;
  onFail: () => void;
};

function timingBand(zone: number) {
  const low = 0.5 - zone / 2;
  return { low, high: low + zone };
}

export function TimingChallenge({ hits, zone, onSuccess, onFail }: Props) {
  const pos = useRef(0);
  const dir = useRef(1);
  const neededRef = useRef(hits);
  const done = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const onFailRef = useRef(onFail);
  onSuccessRef.current = onSuccess;
  onFailRef.current = onFail;
  const [, setTick] = useState(0);
  const [needed, setNeeded] = useState(hits);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      pos.current += dir.current * dt * 0.0009;
      if (pos.current >= 1) {
        pos.current = 1;
        dir.current = -1;
      }
      if (pos.current <= 0) {
        pos.current = 0;
        dir.current = 1;
      }
      setTick((n) => n + 1);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const hit = () => {
    if (done.current) return;
    const { low, high } = timingBand(zone);
    if (pos.current >= low && pos.current <= high) {
      neededRef.current -= 1;
      setNeeded(neededRef.current);
      if (neededRef.current <= 0) {
        done.current = true;
        onSuccessRef.current();
      }
    } else {
      done.current = true;
      onFailRef.current();
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.code !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
      hit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zone]);

  const { low } = timingBand(zone);
  return (
    <div>
      <p>Space or click when the marker is in the moss. {needed} left.</p>
      <div className="bar" style={{ marginTop: 16, cursor: "pointer" }} onClick={hit}>
        <div className="zone" style={{ left: `${low * 100}%`, width: `${zone * 100}%` }} />
        <div className="marker" style={{ left: `${pos.current * 100}%` }} />
      </div>
      <button className="panel-btn" style={{ marginTop: 12, width: "100%" }} type="button" onClick={hit}>
        Hook on moss!
      </button>
    </div>
  );
}
