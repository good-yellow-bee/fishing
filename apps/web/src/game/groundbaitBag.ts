import { GROUNDBAIT_CARRY, localDate } from "@stillwater/shared";
import { readAngler, writeAngler } from "./anglerStore";

/** The free handful each angler finds in the bag, once a day. */
export const DAILY_HANDFULS = 1;

/** Kept per angler, as the bucket and the night line are, so another angler on the same browser starts with their own. */
export function bagKey(userId: string) {
  return `stillwater.groundbait.${userId}.v2`;
}
/** The count-only bag from before the free handful came once a day. */
function countBagKey(userId: string) {
  return `stillwater.groundbait.${userId}.v1`;
}
export function shinerKey(userId: string) {
  return `stillwater.shiner.${userId}.v1`;
}
/** The browser-wide keys from before the bag and the hook were kept per angler: the first angler to load reads them in. */
export const LEGACY_BAG_KEY = "stillwater.groundbait.v1";
export const LEGACY_SHINER_KEY = "stillwater.shiner.v1";

function readOwn(key: string, legacy: string): string | null {
  const own = localStorage.getItem(key);
  if (own !== null) return own;
  const old = localStorage.getItem(legacy);
  if (old !== null) {
    localStorage.setItem(key, old);
    localStorage.removeItem(legacy);
  }
  return old;
}

const handfulsIn = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.min(GROUNDBAIT_CARRY, Math.max(0, Math.floor(n))) : null);

/** What the bag holds now: as last seen, topped up to the day's free handful on the first visit of a day. */
export function loadBag(userId: string, now = new Date()): number {
  const today = localDate(now);
  const kept = readAngler(bagKey(userId), (raw) => {
    const bag = raw as { handfuls?: unknown; day?: unknown } | null;
    const handfuls = handfulsIn(bag?.handfuls);
    return handfuls === null ? null : { handfuls, day: typeof bag?.day === "string" ? bag.day : "" };
  });
  // A bag from before kept no day, so its next visit counts as a new day.
  let bag = kept;
  if (!bag) {
    try {
      const old = readOwn(countBagKey(userId), LEGACY_BAG_KEY);
      const handfuls = old === null ? null : handfulsIn(Number(old));
      if (old !== null) localStorage.removeItem(countBagKey(userId));
      bag = handfuls === null ? null : { handfuls, day: "" };
    } catch {
      bag = null;
    }
  }
  const handfuls = !bag ? DAILY_HANDFULS : bag.day === today ? bag.handfuls : Math.max(DAILY_HANDFULS, bag.handfuls);
  saveBag(userId, handfuls, now);
  return handfuls;
}

export function saveBag(userId: string, handfuls: number, now = new Date()) {
  writeAngler(bagKey(userId), { handfuls, day: localDate(now) });
}

/** The live shiner on the hook, kept so one bought at the shack outlasts a reload: "lively" for one landed clean. */
export type HookedShiner = "live" | "lively" | null;

export function loadShiner(userId: string): HookedShiner {
  try {
    const kept = readOwn(shinerKey(userId), LEGACY_SHINER_KEY);
    return kept === "live" || kept === "lively" ? kept : null;
  } catch {
    return null;
  }
}

export function saveShiner(userId: string, shiner: HookedShiner) {
  try {
    if (shiner) localStorage.setItem(shinerKey(userId), shiner);
    else localStorage.removeItem(shinerKey(userId));
  } catch {
    // A blocked store only loses the shiner on a reload.
  }
}
