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
