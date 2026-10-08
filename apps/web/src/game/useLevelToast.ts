import { useEffect, useRef, useState } from "react";
import { fx } from "./fx";
import { levelUp, mergeLevelUp, type LevelUp } from "./levelUp";

export const LEVEL_TOAST_MS = 4000;

/** The level-up toast to show: held while the bank is busy, four visible seconds and one chime per rise. */
export function useLevelToast(level: number | undefined, bankClear: boolean): LevelUp | null {
  const seenLevel = useRef<number | null>(null);
  const [toast, setToast] = useState<LevelUp | null>(null);
  // Visible time left belongs to one toast; a newer rise starts its own budget.
  const toastId = useRef(0);
  const toastLeft = useRef(0);
  const chimedLevel = useRef<number | null>(null);

  useEffect(() => {
    if (level === undefined) return;
    const rise = levelUp(seenLevel.current, level);
    seenLevel.current = level;
    if (!rise) return;
    toastId.current += 1;
    toastLeft.current = LEVEL_TOAST_MS;
    setToast((pending) => mergeLevelUp(pending, rise));
  }, [level]);

  const shown = bankClear ? toast : null;
  useEffect(() => {
    if (!shown) return;
    if (chimedLevel.current !== shown.level) {
      chimedLevel.current = shown.level;
      fx.land();
    }
    const id = toastId.current;
    const shownAt = performance.now();
    const timer = window.setTimeout(() => setToast(null), toastLeft.current);
    return () => {
      window.clearTimeout(timer);
      if (id === toastId.current) toastLeft.current = Math.max(0, toastLeft.current - (performance.now() - shownAt));
    };
  }, [shown]);

  return shown;
}
