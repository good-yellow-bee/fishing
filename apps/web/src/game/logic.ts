import {
  FISH,
  canLand,
  legendaryCanBite,
  rollWeight,
  biteHourMul,
  biteWeatherMul,
  LAKE_HOURS,
  lakeHour,
  lakeHourWaitMul,
  type FishSpecies,
  type LakeHour,
  type Profile,
  type Sky,
  type SpotId,
} from "@stillwater/shared";

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
  const text = lure.toLowerCase();
  if (/bobber|worm|crawler|popper|pheasant|caddis|size\s*8/.test(text)) return false;
  return /spinner|spoon|mepps|crank|tube|bugger/.test(text);
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
  return Math.max(...poolForLure(home, lure).filter((fish) => fish.rarity !== "legendary").map((fish) => fish.minStrength));
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

export function sweetBand(accuracy: number) {
  const width = 0.16 + accuracy * 0.03;
  const center = 0.62;
  return {
    min: Math.max(0.28, center - width / 2),
    max: Math.min(0.9, center + width / 2),
  };
}

/** Long enough to react to the real dip rather than guess it; Accuracy still widens it. */
export function hookWindowMs(accuracy: number) {
  return 1000 + accuracy * 100;
}

export function waitMs(patience: number, hour: LakeHour = lakeHour(), hotspot = false) {
  const base = 2200 + Math.random() * 3800;
  return Math.max(1100, base * (1 - patience * 0.07) * lakeHourWaitMul(hour) * (hotspot ? HOTSPOT_WAIT : 1));
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
): FishSpecies {
  let home = FISH.filter((fish) => fish.spots.includes(spot));
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
  const drawn = pool.reduce((sum, fish) => sum + appeal(fish, hour), 0);
  const inReach = pool.filter((fish) => canLand(profile, fish)).reduce((sum, fish) => sum + appeal(fish, hour), 0);
  // A big lure must not lock a weak angler out: the bank's lighter landable fish fill in for the share of its
  // draw still out of reach. A small lure already draws the light half, so it never pulls in big fish.
  const fillIn = lure && favorsLargeFish(lure) && drawn > 0 ? 1 - inReach / drawn : 0;
  const fillers = fillIn > 0
    ? home.filter((fish) => !pool.includes(fish) && fish.rarity !== "legendary" && canLand(profile, fish))
    : [];
  const weights = [
    ...pool.map((fish) => appeal(fish, hour) * (canLand(profile, fish) ? 1 : OUT_OF_REACH_BITE)),
    ...fillers.map((fish) => appeal(fish, hour) * fillIn),
  ];
  pool = [...pool, ...fillers];
  const lift = (fish: FishSpecies) => (sky ? biteWeatherMul(fish, sky) : 1) * (hotspot ? HOTSPOT_BITE[fish.rarity] : 1);
  const drawWeights = sky || hotspot ? reshuffle(pool, weights, profile, lift) : weights;
  let roll = random() * drawWeights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < pool.length; i++) {
    roll -= drawWeights[i]!;
    if (roll <= 0) return pool[i]!;
  }
  return pool[0]!;
}

export function makeCatch(species: FishSpecies, patience: number) {
  return { species, weight: rollWeight(species, patience) };
}

export function difficulty01(species: FishSpecies, weight: number) {
  const span = species.maxWeight - species.minWeight;
  if (span <= 0) return 0.5;
  return Math.min(1, Math.max(0, (weight - species.minWeight) / span));
}
