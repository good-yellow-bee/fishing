import type { CatchEntry } from "@stillwater/shared";
import { pieceTally } from "./pieceTally";

/** The lure that took the most of these fish, once it took two and no other took as many; else null. */
export function bestLure(catches: readonly CatchEntry[]): string | null {
  const [top, next] = pieceTally(catches, 2);
  return top && top.count >= 2 && (!next || next.count < top.count) ? top.lure : null;
}

/** The lure that took the most fish on a water, by `bestLure`'s rule. */
export function bestLureAt(catches: readonly CatchEntry[], spotId: string): string | null {
  return bestLure(catches.filter((entry) => entry.spotId === spotId));
}
