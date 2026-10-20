import { useEffect, useRef, useState } from "react";
import type { TagReturn } from "@stillwater/shared";
import { fx } from "./fx";

export const TAG_NEWS_TOAST_MS = 5200;
export const TAG_NEWS_KEY = "stillwater.tagnews.v1";

function readSeen(key: string): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function markSeen(key: string, id: string) {
  try {
    // The server only tells of a week's news, so the newest few ids are all worth keeping.
    localStorage.setItem(key, JSON.stringify([id, ...readSeen(key).filter((one) => one !== id)].slice(0, 20)));
  } catch {
    // A blocked store only means the news may show again next visit.
  }
}

/** One piece of news not yet told of in this browser (under `key`), shown once the bank is clear, one at a time;
 * it steps aside while the bank is busy and is remembered as told once it has had its full time on screen. */
export function useNewsToast<T>(items: readonly T[] | undefined, bankClear: boolean, idOf: (item: T) => string, key: string): T | null {
  // Told this visit, whether or not the browser could store it; read again when the key changes, as when the angler signs in.
  const told = useRef<{ key: string; ids: Set<string> } | null>(null);
  if (told.current?.key !== key) told.current = { key, ids: new Set(readSeen(key)) };
  const [shown, setShown] = useState<T | null>(null);
  const next = shown ?? (bankClear ? (items?.find((one) => !told.current!.ids.has(idOf(one))) ?? null) : null);

  // Another angler's news on screen is not this one's.
  useEffect(() => setShown(null), [key]);

  useEffect(() => {
    if (!next || shown) return;
    told.current!.ids.add(idOf(next));
    setShown(next);
    fx.land();
  }, [next, shown]);

  useEffect(() => {
    if (!shown || !bankClear) return;
    const timer = window.setTimeout(() => {
      markSeen(key, idOf(shown));
      setShown(null);
    }, TAG_NEWS_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [shown, bankClear]);

  return bankClear ? shown : null;
}

/** One of the angler's let-go fish another angler landed, told once. */
export function useTagNewsToast(returns: readonly TagReturn[] | undefined, bankClear: boolean): TagReturn | null {
  return useNewsToast(returns, bankClear, (one) => one.catchId, TAG_NEWS_KEY);
}

/** Kept per angler: which of their lost trophies they have been told someone landed. */
export function lostNewsKey(userId: string) {
  return `stillwater.lostnews.${userId}.v1`;
}
