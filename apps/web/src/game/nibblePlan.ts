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
 * bottom feeders mouth it over and over, a walleye takes it so lightly the float only slides under,
 * and the rest nibble a time or three.
 */
export type BiteStyle = "ambush" | "mouth" | "light" | "usual";

const BITE_STYLES: Readonly<Record<string, BiteStyle>> = {
  pike: "ambush",
  "tiger-muskie": "ambush",
  "ghost-pike": "ambush",
  "largemouth-bass": "ambush",
  carp: "mouth",
  catfish: "mouth",
  sturgeon: "mouth",
  burbot: "mouth",
  walleye: "light",
};

/** A light biter's take pulls the float only this share as deep as a usual bite. */
export const LIGHT_PLUNGE = 0.45;
/** A light biter holds on to the bait this much longer, so the faint take can still be struck. */
export const LIGHT_HOLD = 1.3;

/** A tiger muskie that misses the strike follows the bait and hits it once more, with no nibble first. */
export const FOLLOWERS: ReadonlySet<string> = new Set(["tiger-muskie"]);

/** Little fish that nibble the bait away now and then instead of taking the hook. */
export const BAIT_THIEVES: ReadonlySet<string> = new Set(["golden-shiner"]);
/** How often a bait thief strips the hook rather than biting. */
export const STEAL_CHANCE = 0.25;

/** Whether this wait ends with the bait stolen; only a thief that nibbles first can steal it. */
export function stealsBait(speciesId: string, nibbles: number, rand: () => number = Math.random) {
  return BAIT_THIEVES.has(speciesId) && nibbles > 0 && rand() < STEAL_CHANCE;
}

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
