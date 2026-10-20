import { useEffect, useRef, useState } from "react";
import type { TagReturn } from "@stillwater/shared";
import { fx } from "./fx";

export const TAG_NEWS_TOAST_MS = 5200;
export const TAG_NEWS_KEY = "stillwater.tagnews.v1";

function readSeen(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(TAG_NEWS_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function markSeen(id: string) {
  try {
    // The server only tells of a week's returns, so the newest few ids are all worth keeping.
    localStorage.setItem(TAG_NEWS_KEY, JSON.stringify([id, ...readSeen().filter((one) => one !== id)].slice(0, 20)));
  } catch {
    // A blocked store only means the news may show again next visit.
  }
}

/** One of the angler's let-go fish another angler landed, not yet told of in this browser, shown once the bank is clear, one at a time;
 * it steps aside while the bank is busy and is remembered as told once it has had its full time on screen. */
export function useTagNewsToast(returns: readonly TagReturn[] | undefined, bankClear: boolean): TagReturn | null {
  // Told this visit, whether or not the browser could store it.
  const told = useRef<Set<string> | null>(null);
  told.current ??= new Set(readSeen());
  const [shown, setShown] = useState<TagReturn | null>(null);
  const next = shown ?? (bankClear ? (returns?.find((one) => !told.current!.has(one.catchId)) ?? null) : null);

  useEffect(() => {
    if (!next || shown) return;
    told.current!.add(next.catchId);
    setShown(next);
    fx.land();
  }, [next, shown]);

  useEffect(() => {
    if (!shown || !bankClear) return;
    const timer = window.setTimeout(() => {
      markSeen(shown.catchId);
      setShown(null);
    }, TAG_NEWS_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [shown, bankClear]);

  return bankClear ? shown : null;
}
