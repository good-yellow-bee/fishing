import type { CatchEntry, LureTally } from "@stillwater/shared";
import { shownPieceKey } from "./gear/pieceKey";

/**
 * The lures that took the most fish, most first, grouped as the exact lure search and Gear group them: "Spinnerbait"
 * and "Spinnerbaits" are one row, under the spelling most of its fish were logged with, so a row's count is what its
 * link opens.
 */
export function pieceTally(catches: readonly CatchEntry[], limit = 5): LureTally[] {
  const groups = new Map<string, { count: number; spellings: Map<string, number> }>();
  for (const entry of catches) {
    const name = entry.lure.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = shownPieceKey(name);
    const group = groups.get(key) ?? { count: 0, spellings: new Map<string, number>() };
    group.count += 1;
    group.spellings.set(name, (group.spellings.get(name) ?? 0) + 1);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({ lure: [...group.spellings].reduce((best, row) => (row[1] > best[1] ? row : best))[0], count: group.count }))
    .sort((a, b) => b.count - a.count || a.lure.localeCompare(b.lure))
    .slice(0, limit);
}

/** Whether a fish was taken on the piece `lure` names, however it was spelled. */
export function onPiece(entry: CatchEntry, lure: string): boolean {
  return entry.lure.trim() !== "" && shownPieceKey(entry.lure.trim()) === shownPieceKey(lure.trim());
}
