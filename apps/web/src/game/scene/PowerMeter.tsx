import { useEffect, useRef, type MutableRefObject } from "react";
import { useT } from "../../i18n";
import { perfectCastBand, sweetBand } from "../logic";
import type { ScenePhase } from "./types";

type Props = {
  phase: ScenePhase;
  powerRef: MutableRefObject<number>;
  accuracy: number;
};

/** The cast meter. The marker follows the charge each frame on its own, so charging never re-renders the page. */
export function PowerMeter({ phase, powerRef, accuracy }: Props) {
  const t = useT();
  const marker = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  /** Where the last cast stopped, left on the bar as a faint mark to aim the next one by. */
  const lastCast = useRef<number | null>(null);
  const shown = phase === "idle" || phase === "casting";
  useEffect(() => {
    if (!shown) return;
    let frame = 0;
    let last = -1;
    const follow = () => {
      frame = requestAnimationFrame(follow);
      const power = powerRef.current;
      if (phaseRef.current === "casting" && power > 0) lastCast.current = power;
      if (power === last || !marker.current) return;
      last = power;
      marker.current.style.left = `${power * 100}%`;
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [shown, powerRef]);
  if (!shown) return null;
  const band = sweetBand(accuracy);
  const perfect = perfectCastBand(accuracy);
  return (
    <div className="power-meter" aria-hidden>
      <span>{t("Cast")}</span>
      <div className="bar">
        <div className="zone" style={{ left: `${band.min * 100}%`, width: `${(band.max - band.min) * 100}%` }} />
        <div className="perfect" style={{ left: `${perfect.min * 100}%`, width: `${(perfect.max - perfect.min) * 100}%` }} />
        {lastCast.current !== null && <div className="last-cast" style={{ left: `${lastCast.current * 100}%` }} />}
        <div className="marker" ref={marker} style={{ left: "0%" }} />
      </div>
    </div>
  );
}
