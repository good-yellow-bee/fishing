import type { SpotId } from "./types.ts";

/** Banks that can run hot; the open water from the boat is left out, it is a trip rather than a bank. */
export const HOT_BANKS: readonly SpotId[] = ["dock", "reeds", "dropoff", "point", "inlet"];

/** Waits at the day's hot bank are this share of the usual. */
export const HOT_BANK_WAIT = 0.8;

/** Local days since 1 January 1970, counted on the calendar so clock changes never skip or repeat a day. */
function dayNumber(date: Date) {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/** mulberry32 over a run of days. */
function seeded(seed: number) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every run of five days takes each bank once, in its own shuffled order. */
function runOrder(run: number): SpotId[] {
  const random = seeded(run * 7919 + 17);
  const order = [...HOT_BANKS];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

/** The bank where fish bite best on this local day: the same for everyone that day, never the same two days running, every bank once in five days. */
export function hotBankForDay(date: Date): SpotId {
  const day = dayNumber(date);
  const run = Math.floor(day / HOT_BANKS.length);
  const order = runOrder(run);
  // Where a run would open on the bank the last one closed on, its first two days swap.
  if (order[0] === runOrder(run - 1)[HOT_BANKS.length - 1]) [order[0], order[1]] = [order[1]!, order[0]!];
  return order[day - run * HOT_BANKS.length]!;
}
