import type { TackleItem } from "@stillwater/shared";
import { shownPieceKey } from "./pieceKey";

/**
 * The lists once a lure is renamed or merged on every fish: each piece that is `from` takes the new name, so the lure
 * record and an outing's caught marks keep finding its fish. A list that already holds `into` keeps that one only.
 * Null when no list has the piece.
 */
export function renamedTackle(items: readonly TackleItem[], from: string, into: string): TackleItem[] | null {
  const fromKey = shownPieceKey(from);
  const intoKey = shownPieceKey(into);
  if (fromKey === intoKey || !items.some((item) => shownPieceKey(item.label) === fromKey)) return null;
  const holding = new Set(items.filter((item) => shownPieceKey(item.label) === intoKey).map((item) => item.tripId));
  // A ticked row dropped into one already on its list leaves its tick on that one: the piece was in the bag.
  const packedOff = new Set(items.filter((item) => shownPieceKey(item.label) === fromKey && item.packed && holding.has(item.tripId)).map((item) => item.tripId));
  return items.flatMap((item) => {
    if (shownPieceKey(item.label) === intoKey && packedOff.has(item.tripId)) return [{ ...item, packed: true }];
    if (shownPieceKey(item.label) !== fromKey) return [item];
    return holding.has(item.tripId) ? [] : [{ ...item, label: into }];
  });
}
