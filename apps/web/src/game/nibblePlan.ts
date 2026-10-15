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

/**
 * How a kind of fish takes the bait: predators hit from nowhere with no nibble first,
 * bottom feeders mouth it over and over, and the rest nibble a time or three.
 */
export type BiteStyle = "ambush" | "mouth" | "usual";

const BITE_STYLES: Readonly<Record<string, BiteStyle>> = {
  pike: "ambush",
  "tiger-muskie": "ambush",
  "ghost-pike": "ambush",
  "largemouth-bass": "ambush",
  carp: "mouth",
  catfish: "mouth",
  sturgeon: "mouth",
  burbot: "mouth",
};

export function biteStyle(speciesId: string): BiteStyle {
  return BITE_STYLES[speciesId] ?? "usual";
}

export function nibblePlan(wait: number, rand: () => number = Math.random, style: BiteStyle = "usual"): Nibble[] {
  if (wait < MIN_WAIT || style === "ambush") return [];
  // A mouther tries the bait two to four times; the rest one to three.
  const count = (style === "mouth" ? 2 : 1) + Math.floor(rand() * 3);
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
