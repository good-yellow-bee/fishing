import { GROUNDBAIT_CARRY, localDate } from "@stillwater/shared";
import { readAngler, writeAngler } from "./anglerStore";
import { GROUNDBAIT_HANDFULS } from "./logic";

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

/** The bag as kept: its handfuls, and the day it was last topped up. */
type Bag = { handfuls: number; day: string };

function readBag(userId: string): Bag | null {
  return readAngler(bagKey(userId), (raw) => {
    const bag = raw as { handfuls?: unknown; day?: unknown } | null;
    const handfuls = handfulsIn(bag?.handfuls);
    return handfuls === null ? null : { handfuls, day: typeof bag?.day === "string" ? bag.day : "" };
  });
}

/** A bag from before kept no day, so its next visit counts as a new day; read only when the angler has no bag of the new kind. */
function readOlderBag(userId: string): Bag | null {
  try {
    if (localStorage.getItem(bagKey(userId)) !== null) return null;
    const old = readOwn(countBagKey(userId), LEGACY_BAG_KEY);
    if (old === null) return null;
    localStorage.removeItem(countBagKey(userId));
    const handfuls = handfulsIn(Number(old));
    return handfuls === null ? null : { handfuls, day: "" };
  } catch {
    return null;
  }
}

/** What the bag holds now: as last seen, topped up to the day's free handful on the first visit of a day. */
export function loadBag(userId: string, now = new Date()): number {
  const today = localDate(now);
  const bag = readBag(userId) ?? readOlderBag(userId);
  if (bag && bag.day === today) return bag.handfuls;
  const handfuls = Math.max(GROUNDBAIT_HANDFULS, bag?.handfuls ?? 0);
  writeAngler(bagKey(userId), { handfuls, day: today });
  return handfuls;
}

/** Keeps what the bag holds, under the day it was last topped up, so a visit running past midnight doesn't spend the next day's free handful. */
export function saveBag(userId: string, handfuls: number, now = new Date()) {
  writeAngler(bagKey(userId), { handfuls, day: readBag(userId)?.day ?? localDate(now) });
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
