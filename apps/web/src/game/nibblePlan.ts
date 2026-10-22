import { FISH } from "@stillwater/shared";
import { poolForLure, TOPUP_MAX, type Groundbait } from "./logic";

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
/** A pecker's nibbles are quicker taps, closer together. */
const PECK_MS_MIN = 110;
const PECK_MS_SPREAD = 90;
const PECK_GAP_MIN = 160;
const PECK_GAP_SPREAD = 260;

/**
 * How a kind of fish takes the bait: predators hit from nowhere with no nibble first,
 * bottom feeders mouth it over and over, a walleye or a whitefish takes it so lightly the float only slides under,
 * a crappie takes it rising so the float lifts and lies flat, a bluegill pecks at it in quick taps
 * before it pulls, a smallmouth bass runs off with it so the float slides away before it goes under,
 * a perch gulps it down and holds on, a trout snatches it and lets go fast, a salmon rolls on it in a big splash, and the rest nibble a time or three.
 */
export type BiteStyle = "ambush" | "mouth" | "light" | "lift" | "peck" | "run" | "gulp" | "snatch" | "roll" | "usual";

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
  "lake-whitefish": "light",
  crappie: "lift",
  bluegill: "peck",
  "smallmouth-bass": "run",
  perch: "gulp",
  "brook-trout": "snatch",
  "rainbow-trout": "snatch",
  salmon: "roll",
};

/** A light biter's take pulls the float only this share as deep as a usual bite. */
export const LIGHT_PLUNGE = 0.45;
/** A light biter holds on to the bait this much longer, so the faint take can still be struck. */
export const LIGHT_HOLD = 1.3;
/** A perch gulps the bait down and holds on this much longer before it lets go. */
export const GULP_HOLD = 1.5;
/** A trout snatches the bait and spits it this much sooner, so the strike has to be quick. */
export const SNATCH_HOLD = 0.8;
/** A salmon rolls on the bait, so its strike splash opens this much wider and throws its spray this much higher. */
export const ROLL_SPLASH = 1.6;
/** A lift bite raises the float this share of a usual bite's pull, instead of pulling it under. */
export const LIFT_RISE = 0.3;
/** A running bite pulls the float under this share as deep as a usual bite, as it slides it away. */
export const RUN_PLUNGE = 0.6;
/** How far, in meters, a running bite slides the float along the top. */
export const RUN_SLIDE = 0.55;
/** How far a running bite has slid the float at this (already scaled) plunge. */
export function runSlide(plunge: number) {
  return Math.min(1, Math.max(0, plunge / (0.36 * RUN_PLUNGE))) * RUN_SLIDE;
}
/** How far a lifted float has tipped over towards lying flat (0 upright, 1 flat) at this plunge. */
export function liftTilt(plunge: number) {
  return Math.min(1, Math.max(0, -plunge / (0.3 * LIFT_RISE)));
}

/** A tiger muskie that misses the strike follows the bait and hits it once more, with no nibble first. */
export const FOLLOWERS: ReadonlySet<string> = new Set(["tiger-muskie"]);

/** Little fish that nibble the bait away now and then instead of taking the hook. */
export const BAIT_THIEVES: ReadonlySet<string> = new Set(["golden-shiner"]);
/** How often a bait thief strips the hook rather than biting. */
export const STEAL_CHANCE = 0.25;
/** Over a swim not yet topped up the thieves crowd the groundbait and strip the hook this often. */
export const FRESH_SWIM_STEAL_CHANCE = 0.5;
/** Over a swim topped up all the way the big feeders shoulder the thieves off, so they strip it only this often. */
export const BUILT_SWIM_STEAL_CHANCE = 0.125;

/** How often a bait thief strips the hook, by how often the swim under it was topped up (null when the cast is not over groundbait). */
export function stealChance(built: number | null) {
  if (built === null) return STEAL_CHANCE;
  if (built === 0) return FRESH_SWIM_STEAL_CHANCE;
  return built >= TOPUP_MAX ? BUILT_SWIM_STEAL_CHANCE : STEAL_CHANCE;
}

/** Whether bait thieves crowd this swim: ones at its bank that would take this lure, while it is not built all the way and its feeders are not scattered. */
export function baitThievesOver(bait: Groundbait, lure: string | undefined) {
  return !bait.spooked && (bait.built ?? 0) < TOPUP_MAX && poolForLure(FISH.filter((fish) => fish.spots.includes(bait.spot)), lure).some((fish) => BAIT_THIEVES.has(fish.id));
}

/** Whether this wait ends with the bait stolen; only a thief that nibbles first can steal it. */
export function stealsBait(speciesId: string, nibbles: number, rand: () => number = Math.random, chance = STEAL_CHANCE) {
  return BAIT_THIEVES.has(speciesId) && nibbles > 0 && rand() < chance;
}

/** A topwater lure is hit at the top: any fish takes it like an ambush, with no nibble first. */
export function takeStyle(speciesId: string, topwater: boolean): BiteStyle {
  return topwater ? "ambush" : biteStyle(speciesId);
}

export function biteStyle(speciesId: string): BiteStyle {
  return BITE_STYLES[speciesId] ?? "usual";
}

export function nibblePlan(wait: number, rand: () => number = Math.random, style: BiteStyle = "usual"): Nibble[] {
  if (wait < MIN_WAIT || style === "ambush") return [];
  // A pecker taps three to five times, a mouther tries the bait two to four times; the rest one to three.
  const peck = style === "peck";
  const count = (peck ? 3 : style === "mouth" ? 2 : 1) + Math.floor(rand() * 3);
  const plan: Nibble[] = [];
  const ms = () => Math.round(peck ? PECK_MS_MIN + rand() * PECK_MS_SPREAD : MS_MIN + rand() * MS_SPREAD);
  const firstMs = ms();
  // The first lands anywhere from a quarter to about two thirds of the way in, with room left for it.
  let at = Math.round(Math.min(wait * (0.25 + rand() * 0.4), wait - BEFORE_BITE - firstMs));
  plan.push({ at, ms: firstMs });
  for (let k = 1; k < count; k += 1) {
    const next = ms();
    at = Math.round(at + plan[k - 1]!.ms + (peck ? PECK_GAP_MIN + rand() * PECK_GAP_SPREAD : GAP_MIN + rand() * GAP_SPREAD));
    if (at + next > wait - BEFORE_BITE) break;
    plan.push({ at, ms: next });
  }
  return plan;
}
