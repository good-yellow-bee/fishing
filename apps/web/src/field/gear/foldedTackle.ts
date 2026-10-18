import type { TackleItem } from "@stillwater/shared";
import { shownPieceKey } from "./pieceKey";

/**
 * The lists once a merge folds outings into others (outing id to the one it joined): each folded outing's pieces join
 * the list of the one it joined, packed as they were, but for a piece that list already holds. The folded outing's own
 * list stays under its id, so undoing the merge brings it back with its outing. Null when no folded outing had a list.
 */
export function foldedTackle(items: readonly TackleItem[], folds: ReadonlyMap<string, string>, newId: () => string): TackleItem[] | null {
  const joining = items.filter((item) => folds.has(item.tripId));
  if (joining.length === 0) return null;
  const held = new Set(items.map((item) => `${item.tripId}\u0000${shownPieceKey(item.label)}`));
  const added: TackleItem[] = [];
  for (const item of joining) {
    const tripId = folds.get(item.tripId)!;
    const key = `${tripId}\u0000${shownPieceKey(item.label)}`;
    if (held.has(key)) continue;
    held.add(key);
    added.push({ id: newId(), tripId, label: item.label, packed: item.packed });
  }
  return added.length > 0 ? [...items, ...added] : null;
}
