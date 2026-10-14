/**
 * When the fish nibbles before it bites. One to three nibbles land at varied
 * times through the wait, each a little different in length, so the bite's
 * timing can't be learned from the first nibble. The last one always ends
 * well before the bite.
 */
export type Nibble = { at: number; ms: number };

/** Waits shorter than this have no room for a nibble. */
const MIN_WAIT = 980;
/** The quiet gap left before the bite, and between nibbles. */
const BEFORE_BITE = 350;
const GAP_MIN = 420;
const GAP_SPREAD = 700;
const MS_MIN = 220;
const MS_SPREAD = 220;

export function nibblePlan(wait: number, rand: () => number = Math.random): Nibble[] {
  if (wait < MIN_WAIT) return [];
  const count = 1 + Math.floor(rand() * 3);
  const plan: Nibble[] = [];
  const ms = () => Math.round(MS_MIN + rand() * MS_SPREAD);
  const firstMs = ms();
  // The first lands anywhere from a quarter to about two thirds of the way in, with room left for it.
  let at = Math.round(Math.min(wait * (0.25 + rand() * 0.4), wait - BEFORE_BITE - firstMs));
  plan.push({ at, ms: firstMs });
  for (let k = 1; k < count; k += 1) {
    const next = ms();
    at = Math.round(at + plan[k - 1]!.ms + GAP_MIN + rand() * GAP_SPREAD);
    if (at + next > wait - BEFORE_BITE) break;
    plan.push({ at, ms: next });
  }
  return plan;
}
