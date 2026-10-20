import { giantWeek, type SpotId } from "@stillwater/shared";

/** Kept per angler, as the banks' memory is, so another angler on the same browser meets giants that know nothing of them. */
export function giantShyKey(userId: string) {
  return `stillwater.giantshy.${userId}.v1`;
}

/** The lures each bank's giant, by name, broke free of this week, and so will not take again till the giants change on Monday. */
export type GiantShy = { week: string; lures: Partial<Record<SpotId, { giant: string; lures: string[] }>> };

/** The stored shyness as of `now`: a new week's giants have never seen a lure. */
export function rollGiantShy(stored: unknown, now: Date): GiantShy {
  const week = giantWeek(now);
  const shy = stored as Partial<GiantShy> | null;
  return shy && shy.week === week && typeof shy.lures === "object" && shy.lures ? { week, lures: shy.lures } : { week, lures: {} };
}

export function loadGiantShy(userId: string, now = new Date()): GiantShy {
  try {
    return rollGiantShy(JSON.parse(localStorage.getItem(giantShyKey(userId)) ?? "null"), now);
  } catch {
    return rollGiantShy(null, now);
  }
}

export function saveGiantShy(userId: string, shy: GiantShy) {
  try {
    localStorage.setItem(giantShyKey(userId), JSON.stringify(shy));
  } catch {
    // A blocked store only means the giant forgets the lure.
  }
}

export function shyOf(shy: GiantShy, spot: SpotId, giant: string, lure: string | undefined): boolean {
  const known = shy.lures[spot];
  return !!lure && known?.giant === giant && known.lures.includes(lure);
}

/** The shyness after the bank's giant broke free of `lure`. */
export function markShy(shy: GiantShy, spot: SpotId, giant: string, lure: string): GiantShy {
  if (shyOf(shy, spot, giant, lure)) return shy;
  const known = shy.lures[spot]?.giant === giant ? shy.lures[spot]!.lures : [];
  return { ...shy, lures: { ...shy.lures, [spot]: { giant, lures: [...known, lure] } } };
}
