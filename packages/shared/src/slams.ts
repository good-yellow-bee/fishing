/** A slam: every kind of a family landed on one day. */
export type SlamId = "bass-slam" | "trout-slam";
export type Slam = { id: SlamId; kinds: readonly string[] };

export const SLAMS: readonly Slam[] = [
  { id: "bass-slam", kinds: ["smallmouth-bass", "largemouth-bass"] },
  { id: "trout-slam", kinds: ["brook-trout", "rainbow-trout", "salmon"] },
];

/** For each slam, the most of its kinds landed on any one day, from the (day, kind) pairs of the angler's catches. */
export function slamBest(days: readonly { day: string; speciesId: string }[]): Record<SlamId, number> {
  const byDay = new Map<string, Set<string>>();
  for (const { day, speciesId } of days) byDay.set(day, (byDay.get(day) ?? new Set()).add(speciesId));
  const best = Object.fromEntries(SLAMS.map((slam) => [slam.id, 0])) as Record<SlamId, number>;
  for (const kinds of byDay.values()) {
    for (const slam of SLAMS) best[slam.id] = Math.max(best[slam.id], slam.kinds.filter((kind) => kinds.has(kind)).length);
  }
  return best;
}

/** The slam this kind completes, landed on a day that already holds `today`'s kinds, if it is the last one missing. */
export function slamCompletedBy(today: Iterable<string>, speciesId: string): SlamId | null {
  const had = new Set(today);
  if (had.has(speciesId)) return null;
  return SLAMS.find((slam) => slam.kinds.includes(speciesId) && slam.kinds.every((kind) => kind === speciesId || had.has(kind)))?.id ?? null;
}
