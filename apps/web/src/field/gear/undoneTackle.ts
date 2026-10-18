import type { TackleItem } from "@stillwater/shared";

/**
 * The lists as they are now (`current`) with one change to every list (`before` to `after`, a lure renamed or outings
 * folded by a merge) taken back, and nothing else: a piece the change renamed reads as it did, one it dropped comes
 * back and one it added goes, while what was packed, added or ticked since stays as it is.
 */
export function undoneTackle(current: readonly TackleItem[], before: readonly TackleItem[], after: readonly TackleItem[]): TackleItem[] {
  const was = new Map(before.map((item) => [item.id, item]));
  const made = new Set(after.map((item) => item.id));
  const renamed = new Map(after.filter((item) => was.has(item.id) && was.get(item.id)!.label !== item.label).map((item) => [item.id, was.get(item.id)!.label]));
  const kept = current.flatMap((item) => {
    // Added by the change: it goes with the Undo.
    if (!was.has(item.id) && made.has(item.id)) return [];
    const label = renamed.get(item.id);
    return [label === undefined ? item : { ...item, label }];
  });
  // Dropped by the change (a list that already held the merged name): back as it was, unless it has come back since.
  const here = new Set(kept.map((item) => item.id));
  const dropped = before.filter((item) => !made.has(item.id) && !here.has(item.id));
  return [...kept, ...dropped];
}
