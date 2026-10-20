import type { Angler } from "./robinHop";

/**
 * A small creature's visits behind an angler fishing ashore (the bank toad, the winter mouse): kept off while
 * they move about or stand off the bank, the first a little while after they settle, then one every so often,
 * each along a way laid out behind them when it comes. Stepped each frame.
 */
export type BehindVisit<W> = { mode: "away"; nextAt: number } | { mode: "visiting"; since: number; way: W };

/** When the first comes after the angler settles, how long one lasts, and the wait after it before the next. */
export type BehindTiming = { firstSec: number; visitSec: number; gapSec: number };

export function behindStart<W>(time: number, timing: BehindTiming): BehindVisit<W> {
  return { mode: "away", nextAt: time + timing.firstSec };
}

/** Moves the visits on to `time`. `settled` while the angler stands ashore; `wayFor` lays out a way behind them, or null where there is none. Once out, it carries on whatever they do. */
export function behindStep<W>(state: BehindVisit<W>, time: number, angler: Angler, settled: boolean, timing: BehindTiming, wayFor: () => W | null): BehindVisit<W> {
  if (state.mode === "visiting") return time - state.since >= timing.visitSec ? { mode: "away", nextAt: time + timing.gapSec } : state;
  // Kept off while they are unsettled; the wait is put back about once a second, not every frame.
  if (!settled || angler.moving) return state.nextAt >= time + timing.firstSec - 1 ? state : { mode: "away", nextAt: time + timing.firstSec };
  if (time < state.nextAt) return state;
  const way = wayFor();
  return way ? { mode: "visiting", since: time, way } : { mode: "away", nextAt: time + timing.gapSec };
}
