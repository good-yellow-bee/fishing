import {
  FISH,
  anglerLevel,
  biteWaitMulForLevel,
  canLand,
  legendaryCanBite,
  rollWeight,
  biteHourMul,
  biteMoonMul,
  biteWeatherMul,
  biteSeasonMul,
  LAKE_HOURS,
  lakeHour,
  lakeHourWaitMul,
  lureClass,
  lurePull,
  type FishSpecies,
  type LakeHour,
  type LakeSeason,
  type Profile,
  type Sky,
  type SpotId,
  HOT_BANK_WAIT,
  rareBiteMulForLevel,
  hookWindowMulForLevel,
  perfectCastHalfForLevel,
} from "@stillwater/shared";
import { locale, t } from "../i18n";

/** A weight with one decimal in the player's number style: 3.0 / 3,0. */
export function oneDecimal(value: number): string {
  return value.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });
}

/** The rarity tag on a card, in the player's language. */
export function rarityLabel(rarity: FishSpecies["rarity"]): string {
  switch (rarity) {
    case "common":
      return t("common");
    case "uncommon":
      return t("uncommon");
    case "rare":
      return t("rare");
    case "legendary":
      return t("legendary");
  }
}

const rarityWeight: Record<FishSpecies["rarity"], number> = {
  common: 1,
  uncommon: 0.42,
  rare: 0.16,
  legendary: 0.05,
};

/** Fish the angler cannot land yet still bite now and then, as a glimpse of what upgrades unlock. */
const OUT_OF_REACH_BITE = 0.35;

function appeal(fish: FishSpecies, hour: LakeHour): number {
  return rarityWeight[fish.rarity] * biteHourMul(fish, hour);
}

/** The bubbles stir the bank's rarer fish; a legendary is never drawn less than a rare. */
const HOTSPOT_BITE: Record<FishSpecies["rarity"], number> = {
  common: 1,
  uncommon: 1.5,
  rare: 2.5,
  legendary: 3,
};

/** Casting into the bubbles cuts the wait. The floor still leaves room for the nibble. */
const HOTSPOT_WAIT = 0.6;
/** Waits on a fresh ring of the evening rise are this share of the usual. */
export const RISE_WAIT = 0.7;

/** Weather and the bubbles reshuffle fish within what the angler can land and within what they cannot, so neither moves the landable share. */
function reshuffle(pool: FishSpecies[], weights: number[], profile: Profile, lift: (fish: FishSpecies) => number): number[] {
  const landable = pool.map((fish) => canLand(profile, fish));
  const shifted = weights.map((weight, i) => weight * lift(pool[i]!));
  const total = (list: number[], group: boolean) => list.reduce((sum, weight, i) => (landable[i] === group ? sum + weight : sum), 0);
  const scale = [false, true].map((group) => {
    const after = total(shifted, group);
    return after > 0 ? total(weights, group) / after : 1;
  });
  return shifted.map((weight, i) => weight * scale[Number(landable[i])]!);
}

/** Bobber, worm, and the sample's small lures. Spinners, spoons, and larger lures take the other half. */
export function favorsLargeFish(lure: string): boolean {
  return lureClass(lure).size === "large";
}

function sizedPool(pool: FishSpecies[], large: boolean): FishSpecies[] {
  if (pool.length < 2) return pool;
  const ordered = [...pool].sort(
    (a, b) => a.minWeight - b.minWeight || a.maxWeight - b.maxWeight || a.id.localeCompare(b.id),
  );
  const count = Math.ceil(ordered.length / 2);
  return large ? ordered.slice(ordered.length - count) : ordered.slice(0, count);
}

function poolForLure(pool: FishSpecies[], lure: string | undefined): FishSpecies[] {
  const tied = lure?.trim();
  return tied ? sizedPool(pool, favorsLargeFish(tied)) : pool;
}

export type LureSize = "small" | "large" | "either";

/** The field guide's lure answer, read from the same per-bank split pickBite draws from on a full cast. */
export function lureSizeFor(species: FishSpecies, spot: SpotId): LureSize {
  const home = FISH.filter((fish) => fish.spots.includes(spot));
  const small = sizedPool(home, false).some((fish) => fish.id === species.id);
  const large = sizedPool(home, true).some((fish) => fish.id === species.id);
  if (!small && !large) throw new Error(`${species.id} does not live at ${spot}`);
  return small && large ? "either" : small ? "small" : "large";
}

/** The top Strength among fish this lure draws at a bank. Legendaries only bite once landable, so they never count. */
export function lureStrengthAt(spot: SpotId, lure: string): number {
  const home = FISH.filter((fish) => fish.spots.includes(spot));
  const kind = lureClass(lure);
  // Fish the lure's class reaches across the size line bite too, at some hour.
  const reached = home.filter((fish) => LAKE_HOURS.some((hour) => lurePull(kind, fish.id, hour) > 0));
  return Math.max(
    ...[...poolForLure(home, lure), ...reached].filter((fish) => fish.rarity !== "legendary").map((fish) => fish.minStrength),
  );
}

/** The field guide's hour for a bank: when a full cast with the right lure most often draws this fish, for an angler who can land the whole bank. */
export function bestHourFor(species: FishSpecies, spot: SpotId): LakeHour {
  const home = FISH.filter((fish) => fish.spots.includes(spot));
  const pools = [sizedPool(home, false), sizedPool(home, true)].filter((pool) => pool.some((fish) => fish.id === species.id));
  if (pools.length === 0) throw new Error(`${species.id} does not live at ${spot}`);
  // Rivals in the pool get their own hour boosts, so only the per-cast share says when this fish bites most.
  const share = (hour: LakeHour) =>
    pools.reduce((sum, pool) => sum + appeal(species, hour) / pool.reduce((all, fish) => all + appeal(fish, hour), 0), 0);
  // Exact ties (carp at the dock is a third of the big-lure pool at dawn, day, and night) go to the fish's own boost.
  return LAKE_HOURS.reduce((best, hour) => {
    const gap = share(hour) - share(best);
    return gap > 1e-9 || (gap > -1e-9 && biteHourMul(species, hour) > biteHourMul(species, best)) ? hour : best;
  });
}

/** Below this the lure slaps the dock; above the other, the reel backlashes. */
export const SLAP_POWER = 0.22;
export const BACKLASH_POWER = 0.94;

export function sweetBand(accuracy: number) {
  const width = 0.16 + accuracy * 0.03;
  const center = 0.62;
  return {
    min: Math.max(0.28, center - width / 2),
    max: Math.min(0.9, center + width / 2),
  };
}

/** A cast this close to the middle of the sweet band is a perfect cast, and the bite comes sooner. */
export const PERFECT_CAST_HALF = 0.035;
export const PERFECT_CAST_WAIT = 0.8;

/** The perfect-cast mark on the cast meter: the middle of the sweet band, PERFECT_CAST_HALF either side (wider from level 12). */
export function perfectCastBand(accuracy: number, level = 1) {
  const band = sweetBand(accuracy);
  const center = (band.min + band.max) / 2;
  const half = Math.max(PERFECT_CAST_HALF, perfectCastHalfForLevel(level));
  return { min: center - half, max: center + half };
}

export function isPerfectCast(power: number, accuracy: number, level = 1) {
  const band = perfectCastBand(accuracy, level);
  return power >= band.min && power <= band.max;
}

/** A new angler's first fish come easy: this many landed fish keep the mercy on. */
export const MERCY_CATCHES = 3;
/** Mercy bites come quickly and give a little longer to strike. */
export const MERCY_WAIT_MAX_MS = 2600;
export const MERCY_HOOK_BONUS_MS = 400;

export function isMercy(caughtTotal: number) {
  return caughtTotal < MERCY_CATCHES;
}

/** Long enough to react to the real dip rather than guess it; Accuracy still widens it. */
export function hookWindowMs(accuracy: number, mercy = false, level = 1) {
  return Math.round((1000 + accuracy * 100) * hookWindowMulForLevel(level)) + (mercy ? MERCY_HOOK_BONUS_MS : 0);
}

/** A strike in this first share of the hook window sets the hook solid. */
export const SOLID_STRIKE_SHARE = 0.4;

/** On a breezy or strong day the wind's bow in the line soaks up the strike, so a solid hook needs a quicker one. */
export const WIND_STRIKE = { breezy: 0.85, strong: 0.7 } as const;

/** How quick a strike must be, in ms, to set the hook solid in a window this long, in this wind. */
export function solidStrikeMs(windowMs: number, windy?: keyof typeof WIND_STRIKE) {
  return windowMs * SOLID_STRIKE_SHARE * (windy ? WIND_STRIKE[windy] : 1);
}

/** True when the strike came quick enough on the bite to set the hook solid. */
export function isSolidStrike(elapsedMs: number, windowMs: number) {
  return elapsedMs <= windowMs * SOLID_STRIKE_SHARE;
}

export function waitMs(patience: number, hour: LakeHour = lakeHour(), hotspot = false, level = 1, mercy = false, hotBank = false, rise = false, perfect = false) {
  const base = 2200 + Math.random() * 3800;
  const wait = Math.max(
    1100,
    base * (1 - patience * 0.07) * lakeHourWaitMul(hour) * (hotspot ? HOTSPOT_WAIT : 1) * biteWaitMulForLevel(level) * (hotBank ? HOT_BANK_WAIT : 1) * (rise ? RISE_WAIT : 1) * (perfect ? PERFECT_CAST_WAIT : 1),
  );
  return mercy ? Math.min(wait, MERCY_WAIT_MAX_MS) : wait;
}

export function pickBite(
  spot: SpotId,
  profile: Profile,
  shortCast: boolean,
  random = Math.random,
  hour: LakeHour = lakeHour(),
  lure?: string,
  sky?: Sky,
  hotspot = false,
  mercy = false,
  season?: LakeSeason,
  /** The moon's lit share; a bright night brings rare fish up a little. */
  moon?: number,
): FishSpecies {
  let home = FISH.filter((fish) => fish.spots.includes(spot));
  if (mercy) {
    // Only commons the angler can land, so the first fish is never a lost fight.
    const easy = home.filter((fish) => fish.rarity === "common" && canLand(profile, fish));
    const byLure = poolForLure(easy, lure);
    const pool = byLure.length > 0 ? byLure : easy;
    if (pool.length > 0) {
      let roll = random() * pool.reduce((sum, fish) => sum + appeal(fish, hour), 0);
      for (const fish of pool) {
        roll -= appeal(fish, hour);
        if (roll <= 0) return fish;
      }
      return pool[0]!;
    }
  }
  if (shortCast) home = home.filter((fish) => fish.rarity === "common");
  // Split before the legendary check so a fish that becomes legal does not move the cut.
  let pool = poolForLure(home, lure);
  pool = pool.filter((fish) => fish.rarity !== "legendary" || legendaryCanBite(profile, fish, spot));
  if (pool.length === 0) {
    pool = poolForLure(
      FISH.filter((fish) => fish.spots.includes(spot) && fish.rarity === "common"),
      lure,
    );
  }
  // The lure's class leans on the fish it suits: harder on its own half, and on a full cast a little across the size line.
  const kind = lure?.trim() ? lureClass(lure) : null;
  const pull = (fish: FishSpecies) => (kind ? lurePull(kind, fish.id, hour) : 0);
  const crossers = shortCast
    ? []
    : home.filter((fish) => !pool.includes(fish) && fish.rarity !== "legendary" && pull(fish) > 0);
  const lean = (fish: FishSpecies) => appeal(fish, hour) * (pool.includes(fish) ? 1 + pull(fish) : pull(fish));
  const drawing = [...pool, ...crossers];
  const drawn = drawing.reduce((sum, fish) => sum + lean(fish), 0);
  const plainDrawn = pool.reduce((sum, fish) => sum + appeal(fish, hour), 0);
  const inReach = drawing.filter((fish) => canLand(profile, fish)).reduce((sum, fish) => sum + lean(fish), 0);
  // A big lure must not lock a weak angler out: the bank's lighter landable fish fill in for the share of its
  // draw still out of reach. A small lure already draws the light half, so it never pulls in big fish.
  const fillIn = lure && favorsLargeFish(lure) && drawn > 0 ? 1 - inReach / drawn : 0;
  const fillers = fillIn > 0
    ? home.filter((fish) => !drawing.includes(fish) && fish.rarity !== "legendary" && canLand(profile, fish))
    : [];
  const weights = [
    ...drawing.map((fish) => lean(fish) * (canLand(profile, fish) ? 1 : OUT_OF_REACH_BITE)),
    // Fillers keep their share when the class leans the draw harder.
    ...fillers.map((fish) => appeal(fish, hour) * fillIn * (drawn / plainDrawn)),
  ];
  pool = [...drawing, ...fillers];
  const level = anglerLevel(profile.lifetimePoints);
  const legendaryBonus = level >= 6 && (hour === "night" || sky === "rain");
  const rareLift = rareBiteMulForLevel(level);
  // Like the sky, the season reshuffles within what the angler can land, so it never moves the landable share.
  const lift = (fish: FishSpecies) =>
    (sky ? biteWeatherMul(fish, sky) : 1) *
    (season ? biteSeasonMul(fish, season) : 1) *
    (hotspot ? HOTSPOT_BITE[fish.rarity] : 1) *
    (legendaryBonus && fish.rarity === "legendary" ? 2 : 1) *
    (fish.rarity === "rare" || fish.rarity === "legendary" ? rareLift : 1) *
    (moon !== undefined ? biteMoonMul(fish, hour, moon) : 1);
  const drawWeights = sky || season || hotspot || legendaryBonus || rareLift > 1 || moon !== undefined ? reshuffle(pool, weights, profile, lift) : weights;
  let roll = random() * drawWeights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < pool.length; i++) {
    roll -= drawWeights[i]!;
    if (roll <= 0) return pool[i]!;
  }
  return pool[0]!;
}

export function makeCatch(species: FishSpecies, patience: number, level = 1) {
  return { species, weight: rollWeight(species, patience, Math.random, level) };
}

export function difficulty01(species: FishSpecies, weight: number) {
  const span = species.maxWeight - species.minWeight;
  if (span <= 0) return 0.5;
  return Math.min(1, Math.max(0, (weight - species.minWeight) / span));
}
