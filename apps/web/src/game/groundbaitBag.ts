import { GROUNDBAIT_CARRY } from "@stillwater/shared";

/** Kept per angler, as the bucket and the night line are, so another angler on the same browser starts with their own. */
export function bagKey(userId: string) {
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

/** What the bag held when last seen, 0 to GROUNDBAIT_CARRY; 0 when nothing was kept or storage is blocked. */
export function loadBag(userId: string): number {
  try {
    const n = Number(readOwn(bagKey(userId), LEGACY_BAG_KEY));
    return Number.isFinite(n) ? Math.min(GROUNDBAIT_CARRY, Math.max(0, Math.floor(n))) : 0;
  } catch {
    return 0;
  }
}

export function saveBag(userId: string, handfuls: number) {
  try {
    localStorage.setItem(bagKey(userId), String(handfuls));
  } catch {
    // A full or blocked store only loses bought handfuls on a reload.
  }
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
