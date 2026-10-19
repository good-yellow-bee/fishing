import { GROUNDBAIT_CARRY } from "@stillwater/shared";

/** The handfuls of groundbait in the bag, kept so ones bought at the shack outlast a reload. */
export const BAG_KEY = "stillwater.groundbait.v1";

/** What the bag held when last seen, 0 to GROUNDBAIT_CARRY; 0 when nothing was kept or storage is blocked. */
export function loadBag(): number {
  try {
    const n = Number(localStorage.getItem(BAG_KEY));
    return Number.isFinite(n) ? Math.min(GROUNDBAIT_CARRY, Math.max(0, Math.floor(n))) : 0;
  } catch {
    return 0;
  }
}

export function saveBag(handfuls: number) {
  try {
    localStorage.setItem(BAG_KEY, String(handfuls));
  } catch {
    // A full or blocked store only loses bought handfuls on a reload.
  }
}

/** The live shiner on the hook, kept so one bought at the shack outlasts a reload: "lively" for one landed clean. */
export const SHINER_KEY = "stillwater.shiner.v1";
export type HookedShiner = "live" | "lively" | null;

export function loadShiner(): HookedShiner {
  try {
    const kept = localStorage.getItem(SHINER_KEY);
    return kept === "live" || kept === "lively" ? kept : null;
  } catch {
    return null;
  }
}

export function saveShiner(shiner: HookedShiner) {
  try {
    if (shiner) localStorage.setItem(SHINER_KEY, shiner);
    else localStorage.removeItem(SHINER_KEY);
  } catch {
    // A blocked store only loses the shiner on a reload.
  }
}
