import { useEffect, useRef, useState } from "react";

/**
 * Whether to show the "effects set to Lite" notice for a step-down at `steppedDownAt` (0 for none). Effects step down
 * when a fight strains the phone, and the notice landed over the fight card's tension bar and let-go cue: it waits
 * while `busy` (a bite, a fight, the catch card, a level or badge card), and steps aside if one comes while it shows.
 * Each step-down shows once.
 */
export function useEffectsNotice(steppedDownAt: number, busy: boolean, ms: number) {
  const [shown, setShown] = useState(false);
  const shownFor = useRef(0);
  useEffect(() => {
    if (!steppedDownAt || busy || shownFor.current === steppedDownAt) return;
    shownFor.current = steppedDownAt;
    setShown(true);
    const timer = window.setTimeout(() => setShown(false), ms);
    return () => {
      window.clearTimeout(timer);
      setShown(false);
    };
  }, [steppedDownAt, busy, ms]);
  return shown;
}
