import type { CatchEntry } from "@stillwater/shared";
import { pieceTally } from "./pieceTally";

/** The lure that took the most fish on a water, once it took two and no other took as many; else null. */
export function bestLureAt(catches: readonly CatchEntry[], spotId: string): string | null {
  const [top, next] = pieceTally(catches.filter((entry) => entry.spotId === spotId), 2);
  return top && top.count >= 2 && (!next || next.count < top.count) ? top.lure : null;
}
