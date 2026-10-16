import type { CatchEntry, Logbook } from "@stillwater/shared";

/** Minutes within which the same kind at the same water reads as the same fish logged twice. */
const SAME_FISH_MINUTES = 10;

/**
 * A fish already in the book that the one being logged may repeat: the same kind and size, at the same water, within a
 * few minutes (a school of perch logged one by one differs in size). `shown` turns a stored name into the words on
 * screen; `sameSize` says whether a fish measured what was typed; `caughtAt` is the form's local "YYYY-MM-DDTHH:mm".
 */
export function likelyDuplicate(
  book: Logbook,
  fish: { species: string; spotId: string; caughtAt: string },
  shown: (name: string) => string = (name) => name,
  sameSize: (entry: CatchEntry) => boolean = () => true,
): CatchEntry | null {
  const want = fish.species.trim().toLowerCase();
  const at = new Date(fish.caughtAt).getTime();
  if (!want || Number.isNaN(at)) return null;
  return (
    book.catches.find(
      (entry) =>
        entry.spotId === fish.spotId &&
        (entry.species.toLowerCase() === want || shown(entry.species).toLowerCase() === want) &&
        Math.abs(new Date(entry.caughtAt).getTime() - at) <= SAME_FISH_MINUTES * 60 * 1000 &&
        sameSize(entry),
    ) ?? null
  );
}
