import {
  FISH,
  canLand,
  legendaryCanBite,
  rollWeight,
  biteHourMul,
  lakeHour,
  lakeHourWaitMul,
  type FishSpecies,
  type LakeHour,
  type Profile,
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

/** Bobber, worm, and the sample's small lures. Spinners, spoons, and larger lures take the other half. */
function favorsLargeFish(lure: string): boolean {
  const text = lure.toLowerCase();
  if (/bobber|worm|crawler|popper|pheasant|caddis|size\s*8/.test(text)) return false;
  return /spinner|spoon|mepps|crank|tube|bugger/.test(text);
}

function poolForLure(pool: FishSpecies[], lure: string | undefined): FishSpecies[] {
  const tied = lure?.trim();
  if (!tied || pool.length < 2) return pool;
  const ordered = [...pool].sort(
    (a, b) => a.minWeight - b.minWeight || a.maxWeight - b.maxWeight || a.id.localeCompare(b.id),
  );
  const count = Math.ceil(ordered.length / 2);
  return favorsLargeFish(tied) ? ordered.slice(ordered.length - count) : ordered.slice(0, count);
}

export function sweetBand(accuracy: number) {
  const width = 0.16 + accuracy * 0.03;
  const center = 0.62;
  return {
    min: Math.max(0.28, center - width / 2),
    max: Math.min(0.9, center + width / 2),
  };
}

export function hookWindowMs(accuracy: number) {
  return 720 + accuracy * 90;
}

export function waitMs(patience: number, hour: LakeHour = lakeHour()) {
  const base = 2200 + Math.random() * 3800;
  return Math.max(1100, base * (1 - patience * 0.07) * lakeHourWaitMul(hour));
}

export function pickBite(
  spot: SpotId,
  profile: Profile,
  shortCast: boolean,
  random = Math.random,
  hour: LakeHour = lakeHour(),
  lure?: string,
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
  const appeal = (fish: FishSpecies) => rarityWeight[fish.rarity] * biteHourMul(fish, hour);
  const drawn = pool.reduce((sum, fish) => sum + appeal(fish), 0);
  const inReach = pool.filter((fish) => canLand(profile, fish)).reduce((sum, fish) => sum + appeal(fish), 0);
  // A big lure must not lock a weak angler out: the bank's lighter landable fish fill in for the share of its
  // draw still out of reach. A small lure already draws the light half, so it never pulls in big fish.
  const fillIn = lure && favorsLargeFish(lure) && drawn > 0 ? 1 - inReach / drawn : 0;
  const fillers = fillIn > 0
    ? home.filter((fish) => !pool.includes(fish) && fish.rarity !== "legendary" && canLand(profile, fish))
    : [];
  const weights = [
    ...pool.map((fish) => appeal(fish) * (canLand(profile, fish) ? 1 : OUT_OF_REACH_BITE)),
    ...fillers.map((fish) => appeal(fish) * fillIn),
  ];
  pool = [...pool, ...fillers];
  let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i]!;
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
