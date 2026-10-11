import { useEffect, useRef, useState } from "react";
import { newlyEarned, type BadgeId, type BadgeProgress } from "@stillwater/shared";
import { fx } from "./fx";

export const BADGE_TOAST_MS = 4200;

/** Badges earned since the page opened, held until the bank is clear, then shown for a few seconds. */
export function useBadgeToast(badges: readonly BadgeProgress[] | undefined, bankClear: boolean): BadgeId[] | null {
  const seen = useRef<readonly BadgeProgress[] | null>(null);
  const [fresh, setFresh] = useState<BadgeId[]>([]);

  useEffect(() => {
    if (!badges) return;
    const gained = newlyEarned(seen.current, badges);
    seen.current = badges;
    if (gained.length) setFresh((pending) => [...pending, ...gained.filter((id) => !pending.includes(id))]);
  }, [badges]);

  const showing = bankClear && fresh.length > 0;
  useEffect(() => {
    if (!showing) return;
    fx.land();
    const timer = window.setTimeout(() => setFresh([]), BADGE_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [showing]);

  return showing ? fresh : null;
}
