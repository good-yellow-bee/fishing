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

/** A jig's single stout hook drives home on a strike, so it sets solid over a longer share of the window. */
export const JIG_SOLID = 1.25;

/** How quick a strike must be, in ms, to set the hook solid in a window this long, in this wind, on this lure. */
export function solidStrikeMs(windowMs: number, windy?: keyof typeof WIND_STRIKE, lure?: string) {
  const jig = !!lure?.trim() && lureClass(lure).id === "jig";
  return windowMs * SOLID_STRIKE_SHARE * (windy ? WIND_STRIKE[windy] : 1) * (jig ? JIG_SOLID : 1);
}

/** A topwater lure's splash carries on glassy water and drowns in a strong wind's chop, so the wait for a bite shifts. */
export const TOPWATER_WAIT = { calm: 0.8, strong: 1.4 } as const;

/** How the day's wind stretches the wait on a topwater lure: 1 for any other lure or wind. */
export function topwaterWaitMul(topwater: boolean, wind: string | undefined) {
  return topwater && (wind === "calm" || wind === "strong") ? TOPWATER_WAIT[wind] : 1;
}

/** In a summer thunderstorm the fish go down and sulk, so every bite comes slower. */
export const STORM_WAIT = 1.25;

/** How a thunderstorm stretches the wait: slower in a storm (rain, a strong wind, and not winter's snow), else 1. */
export function stormWaitMul(sky: string | undefined, season: string | undefined, wind: string | undefined) {
  return sky === "rain" && wind === "strong" && season !== "winter" ? STORM_WAIT : 1;
}

/** A breeze chops the surface, and under the broken light the fish feed bolder, so any lure but a topwater draws the bite sooner. */
export const CHOP_WAIT = 0.9;

/** How a breezy day stretches the wait under the surface: sooner on a breezy day for any lure but a topwater, else 1. */
export function chopWaitMul(topwater: boolean, wind: string | undefined) {
  return wind === "breezy" && !topwater ? CHOP_WAIT : 1;
}

/** A spinner or spoon flashes in sunlight, so on a clear day a fish sees it from farther and the bite comes sooner. */
export const FLASH_SUN_WAIT = 0.85;

/** A clear night's moon this full (its lit share) is bright enough for a spinner or spoon to flash. */
export const FULL_MOON_FLASH = 0.9;

/** How the light stretches the wait on a flashing lure: sooner under a clear sky from dawn to dusk, or on a clear night under a full moon, else 1. */
export function flashWaitMul(lure: string | undefined, sky: string | undefined, hour: LakeHour, moon = 0) {
  if (!lure?.trim() || sky !== "clear" || (hour === "night" && moon < FULL_MOON_FLASH)) return 1;
  const kind = lureClass(lure).id;
  return kind === "spinner" || kind === "spoon" ? FLASH_SUN_WAIT : 1;
}

/** Worms crawl out after dark, so at night the fish are on the lookout for one and a worm bait draws a bite sooner. */
export const WORM_NIGHT_WAIT = 0.85;

/** How the hour stretches the wait on live bait: sooner at night, else 1. */
export function wormNightWaitMul(lure: string | undefined, hour: LakeHour) {
  return hour === "night" && lure?.trim() && lureClass(lure).id === "worm" ? WORM_NIGHT_WAIT : 1;
}

/** Fish on a rise are sipping insects off the top, so a fly matches the hatch and draws the bite sooner still. */
export const FLY_HATCH_WAIT = 0.75;

/** How a rise stretches the wait on a fly: sooner on a fresh ring of the rise, else 1. */
export function flyHatchWaitMul(lure: string | undefined, rise: boolean) {
  return rise && lure?.trim() && lureClass(lure).id === "fly" ? FLY_HATCH_WAIT : 1;
}

/** A spinner's blade thumps, and in rain or fog, when the fish can barely see, they feel it before anything else, so the bite comes sooner. */
export const SPINNER_THUMP_WAIT = 0.85;

/** How murky light stretches the wait on a spinner: sooner in rain or fog, else 1. */
export function spinnerThumpWaitMul(lure: string | undefined, sky: string | undefined) {
  return (sky === "rain" || sky === "fog") && lure?.trim() && lureClass(lure).id === "spinner" ? SPINNER_THUMP_WAIT : 1;
}

/** After dark the fish hunt by sound and look up at the lit surface, so a topwater lure's gurgle draws the bite sooner. */
export const TOPWATER_NIGHT_WAIT = 0.85;

/** How the hour stretches the wait on a topwater lure: sooner at night, else 1. */
export function topwaterNightWaitMul(topwater: boolean, hour: LakeHour) {
  return topwater && hour === "night" ? TOPWATER_NIGHT_WAIT : 1;
}

/** A jig hops down the drop-off's ledge, right where the fish hold, so the bite comes sooner there. */
export const JIG_LEDGE_WAIT = 0.8;

/** How the bank stretches the wait on a jig: sooner at the drop-off, else 1. */
export function jigWaitMul(lure: string | undefined, spot: string) {
  return spot === "dropoff" && lure?.trim() && lureClass(lure).id === "jig" ? JIG_LEDGE_WAIT : 1;
}

/** A fly or streamer swung on the inlet's current drifts down to the trout holding there, so the bite comes sooner. */
export const FLY_DRIFT_WAIT = 0.8;

/** How the bank stretches the wait on a fly or streamer: sooner at the inlet, else 1. */
export function flyDriftWaitMul(lure: string | undefined, spot: string) {
  if (spot !== "inlet" || !lure?.trim()) return 1;
  const kind = lureClass(lure).id;
  return kind === "fly" || kind === "streamer" ? FLY_DRIFT_WAIT : 1;
}

/** A crankbait dug down the point's rocks bangs and deflects off them, and that erratic bump draws a reaction bite sooner. */
export const CRANK_ROCK_WAIT = 0.8;

/** How the bank stretches the wait on a crankbait: sooner off the point, else 1. */
export function crankRockWaitMul(lure: string | undefined, spot: string) {
  return spot === "point" && lure?.trim() && lureClass(lure).id === "crank" ? CRANK_ROCK_WAIT : 1;
}

/** In winter the cold water slows the fish, and a jig worked slow on the bottom is the one thing they will still chase, so it draws the bite sooner. */
export const JIG_WINTER_WAIT = 0.85;

/** How the season stretches the wait on a jig: sooner in winter, else 1. */
export function jigWinterWaitMul(lure: string | undefined, season: LakeSeason | undefined) {
  return season === "winter" && lure?.trim() && lureClass(lure).id === "jig" ? JIG_WINTER_WAIT : 1;
}

/** In spring the reeds' shallows warm first, and the fish crowd in there, so any cast to the reeds draws the bite sooner. */
export const SPRING_SHALLOWS_WAIT = 0.85;

/** How the season stretches the wait at the reeds: sooner in spring, else 1. */
export function springShallowsWaitMul(spot: string, season: LakeSeason | undefined) {
  return season === "spring" && spot === "reeds" ? SPRING_SHALLOWS_WAIT : 1;
}

/** In rain the inlet's swollen current washes food into the lake, and the fish gather to feed. */
export const RAIN_INLET_WAIT = 0.85;

/** How rain stretches the wait at the inlet: sooner in rain, else 1. */
export function rainInletWaitMul(spot: string, sky: string | undefined) {
  return sky === "rain" && spot === "inlet" ? RAIN_INLET_WAIT : 1;
}

/** In fall the fish fatten up for winter and go after a big meal, so a big lure draws the bite sooner. */
export const FALL_BIG_LURE_WAIT = 0.85;

/** How the season stretches the wait on a big lure: sooner in fall, else 1. */
export function fallBigLureWaitMul(lure: string | undefined, season: LakeSeason | undefined) {
  return season === "fall" && !!lure?.trim() && favorsLargeFish(lure) ? FALL_BIG_LURE_WAIT : 1;
}

/** On a summer day the shallows run warm and the fish drop down to the cool water off the ledge, so a cast to the drop-off draws the bite sooner. */
export const SUMMER_DEEP_WAIT = 0.85;

/** How the season and hour stretch the wait at the drop-off: sooner in the heat of a summer day, else 1. */
export function summerDeepWaitMul(spot: string, season: LakeSeason | undefined, hour: LakeHour) {
  return season === "summer" && hour === "day" && spot === "dropoff" ? SUMMER_DEEP_WAIT : 1;
}

/** On a bright summer day the fish tuck into the shade under the dock's planks, so a cast to the dock draws the bite sooner. */
export const DOCK_SHADE_WAIT = 0.85;

/** How the sun stretches the wait at the dock: sooner under a clear summer sky by day, else 1. */
export function dockShadeWaitMul(spot: string, season: LakeSeason | undefined, hour: LakeHour, sky: string | undefined) {
  return season === "summer" && hour === "day" && sky === "clear" && spot === "dock" ? DOCK_SHADE_WAIT : 1;
}

/** On a clear winter day the sun warms the shallow water by the reeds a little, and the cold fish drift in to soak it up, so a cast there draws the bite sooner. */
export const WINTER_SUN_WAIT = 0.85;

/** How the sun stretches the wait at the reeds: sooner under a clear winter sky by day, else 1. */
export function winterSunWaitMul(spot: string, season: LakeSeason | undefined, hour: LakeHour, sky: string | undefined) {
  return season === "winter" && hour === "day" && sky === "clear" && spot === "reeds" ? WINTER_SUN_WAIT : 1;
}

/** After dark the dock's lanterns light the water under them, minnows gather in the glow, and the fish that hunt them follow, so a cast off the dock draws the bite sooner. */
export const LANTERN_DOCK_WAIT = 0.85;

/** How the lanterns stretch the wait at the dock: sooner at night, when they burn full, else 1. */
export function lanternDockWaitMul(spot: string, hour: LakeHour) {
  return hour === "night" && spot === "dock" ? LANTERN_DOCK_WAIT : 1;
}

/** A strong wind drives the waves and the baitfish onto the point's rocks, and the hunters follow them in, so a cast off the point draws the bite sooner. */
export const WIND_POINT_WAIT = 0.85;

/** How the wind stretches the wait off the point: sooner on a strong wind, else 1. */
export function windPointWaitMul(spot: string, wind: string | undefined) {
  return wind === "strong" && spot === "point" ? WIND_POINT_WAIT : 1;
}

/** Under a clear summer midday sun the open water glares bright and the fish shun it, so out on the boat the bite comes slower. */
export const OPEN_GLARE_WAIT = 1.15;

/** How the glare stretches the wait out on the boat: slower under a clear summer sky by day, else 1. */
export function openGlareWaitMul(spot: string, season: LakeSeason | undefined, hour: LakeHour, sky: string | undefined) {
  return season === "summer" && hour === "day" && sky === "clear" && spot === "open" ? OPEN_GLARE_WAIT : 1;
}

/** On a night with the moon this thin (its lit share) or less, it is too dark for the fish to see to feed. */
export const NEW_MOON = 0.1;

/** On a moonless night the fish can barely see to feed, so the bite comes slower. */
export const DARK_NIGHT_WAIT = 1.1;

/** How a moonless night stretches the wait: slower at night under a new moon, else 1 (and 1 when the moon is unknown). */
export function darkNightWaitMul(hour: LakeHour, moon: number | undefined) {
  return hour === "night" && moon !== undefined && moon <= NEW_MOON ? DARK_NIGHT_WAIT : 1;
}

/** A worm sinks slowly down beside the dock's pilings, right where the fish hide in their shade, so the bite there comes sooner. */
export const WORM_PILING_WAIT = 0.85;

/** How the bank stretches the wait on live bait: sooner at the dock, else 1. */
export function wormPilingWaitMul(lure: string | undefined, spot: string) {
  return spot === "dock" && !!lure?.trim() && lureClass(lure).id === "worm" ? WORM_PILING_WAIT : 1;
}

/** Out on the boat a spoon flutters down through the open water, where the hunters roam after the baitfish, so the bite there comes sooner. */
export const SPOON_OPEN_WAIT = 0.85;

/** How the bank stretches the wait on a spoon: sooner out on the boat, else 1. */
export function spoonOpenWaitMul(lure: string | undefined, spot: string) {
  return spot === "open" && !!lure?.trim() && lureClass(lure).id === "spoon" ? SPOON_OPEN_WAIT : 1;
}

/** A spinner's blade flickers along the reeds' edge, right past the hunters lying in ambush there, so the bite comes sooner. */
export const SPINNER_REED_WAIT = 0.85;

/** How the bank stretches the wait on a spinner: sooner at the reeds, else 1. */
export function spinnerReedWaitMul(lure: string | undefined, spot: string) {
  return spot === "reeds" && !!lure?.trim() && lureClass(lure).id === "spinner" ? SPINNER_REED_WAIT : 1;
}

/** A float rig set at the reeds' edge holds the bait still right over the panfish hiding in the stems, so the bite comes sooner. */
export const FLOAT_REED_WAIT = 0.85;

/** How the bank stretches the wait on a float rig: sooner at the reeds, else 1. */
export function floatReedWaitMul(lure: string | undefined, spot: string) {
  return spot === "reeds" && !!lure?.trim() && lureClass(lure).id === "bobber" ? FLOAT_REED_WAIT : 1;
}

/** A streamer stripped back up the drop-off's edge darts like a fleeing baitfish past the trout holding deep, so the bite comes sooner. */
export const STREAMER_LEDGE_WAIT = 0.85;

/** How the bank stretches the wait on a streamer: sooner off the drop-off, else 1. */
export function streamerLedgeWaitMul(lure: string | undefined, spot: string) {
  return spot === "dropoff" && !!lure?.trim() && lureClass(lure).id === "streamer" ? STREAMER_LEDGE_WAIT : 1;
}

/** The inlet's current tumbles a worm downstream like food washed in from the stream, and the fish waiting there take it sooner. */
export const WORM_INLET_WAIT = 0.85;

/** How the bank stretches the wait on a worm: sooner at the inlet, else 1. */
export function wormInletWaitMul(lure: string | undefined, spot: string) {
  return spot === "inlet" && !!lure?.trim() && lureClass(lure).id === "worm" ? WORM_INLET_WAIT : 1;
}

/** The inlet's current spins a spinner's blade hard even on a slow retrieve, and its flash and thump draw the fish waiting in the flow sooner. */
export const SPINNER_INLET_WAIT = 0.85;

/** How the bank stretches the wait on a spinner: sooner at the inlet, else 1. */
export function spinnerInletWaitMul(lure: string | undefined, spot: string) {
  return spot === "inlet" && !!lure?.trim() && lureClass(lure).id === "spinner" ? SPINNER_INLET_WAIT : 1;
}

/** A crankbait run past the dock's pilings knocks off the wood and darts aside, and the fish hiding underneath strike at it sooner. */
export const CRANK_PILING_WAIT = 0.85;

/** How the bank stretches the wait on a crankbait: sooner at the dock, else 1. */
export function crankPilingWaitMul(lure: string | undefined, spot: string) {
  return spot === "dock" && !!lure?.trim() && lureClass(lure).id === "crank" ? CRANK_PILING_WAIT : 1;
}

/** A strike after this share of the hook window only sets the hook light. */
export const LIGHT_HOOK_SHARE = 0.75;

/** True when the strike came so late in the window that the hook only just caught. */
export function isLightHook(elapsedMs: number, windowMs: number) {
  return elapsedMs > windowMs * LIGHT_HOOK_SHARE;
}

/** True when the strike came quick enough on the bite to set the hook solid. */
export function isSolidStrike(elapsedMs: number, windowMs: number) {
  return elapsedMs <= windowMs * SOLID_STRIKE_SHARE;
}

/** Panfish and baitfish travel in schools: land one and more of its kind are still under the bobber. */
export const SCHOOLERS: ReadonlySet<string> = new Set(["perch", "bluegill", "crappie", "golden-shiner"]);
/** Casts after landing a schooler that the school stays at that bank. */
export const SCHOOL_CASTS = 2;
/** Chance a bite in the school is one of the school's own kind. */
export const SCHOOL_SAME = 0.5;
/** Bites come this much sooner while the school is in. */
export const SCHOOL_WAIT = 0.7;

export type School = { spot: SpotId; id: string; casts: number };

/** The school left by a landed fish, or none when it doesn't school. */
/** At dawn and dusk a school feeds hard in the low light and stays this many casts longer. */
export const TWILIGHT_SCHOOL_CASTS = 1;

/** Winter schoolers: under winter's cold they gather in big schools that stay this many casts longer. */
export const WINTER_SCHOOLERS: ReadonlySet<string> = new Set(["perch"]);
export const WINTER_SCHOOL_CASTS = 1;

/** Whether a landed fish leaves a big winter school. */
export function isWinterSchool(id: string, season?: string) {
  return season === "winter" && WINTER_SCHOOLERS.has(id);
}

/** A school landed over groundbait keeps feeding on it and stays this many casts longer. */
export const GROUNDBAIT_SCHOOL_CASTS = 1;

export function schoolAfterLanding(id: string, spot: SpotId, hour?: LakeHour, season?: string, baited = false): School | null {
  const twilight = hour === "dawn" || hour === "dusk";
  return SCHOOLERS.has(id) ? { spot, id, casts: SCHOOL_CASTS + (twilight ? TWILIGHT_SCHOOL_CASTS : 0) + (isWinterSchool(id, season) ? WINTER_SCHOOL_CASTS : 0) + (baited ? GROUNDBAIT_SCHOOL_CASTS : 0) } : null;
}

/** Whether a cast at this bank lands in the school, and what the school is after the cast. */
export function castIntoSchool(school: School | null, spot: SpotId): { schoolId: string | null; next: School | null } {
  if (!school || school.spot !== spot || school.casts <= 0) return { schoolId: null, next: null };
  return { schoolId: school.id, next: school.casts > 1 ? { ...school, casts: school.casts - 1 } : null };
}

/** A handful of groundbait tossed off a bank keeps the fish feeding there for this many casts. */
export const GROUNDBAIT_CASTS = 5;
/** Bites come this much sooner over the groundbait. */
export const GROUNDBAIT_WAIT = 0.8;
/** Handfuls of groundbait in the bag each visit. */
export const GROUNDBAIT_HANDFULS = 1;

export type Groundbait = { spot: SpotId; casts: number };

/** Whether a cast at this bank lands over the groundbait, and what is left of it after the cast. */
export function castOverGroundbait(bait: Groundbait | null, spot: SpotId): { baited: boolean; next: Groundbait | null } {
  if (!bait || bait.spot !== spot || bait.casts <= 0) return { baited: false, next: bait };
  return { baited: true, next: bait.casts > 1 ? { ...bait, casts: bait.casts - 1 } : null };
}

/** Fish that crowd in to feed on groundbait: the panfish, baitfish and bottom feeders. */
export const GROUNDBAIT_FEEDERS: ReadonlySet<string> = new Set(["golden-shiner", "bluegill", "crappie", "carp", "catfish", "lake-whitefish"]);
/** Chance a bite over the groundbait is one of the feeders gathered there. */
export const GROUNDBAIT_FEEDER_SHARE = 0.35;

/** A feeder drawn to the groundbait for this bite, from the bank's own lure split, or none. */
export function groundbaitFeeder(spot: SpotId, lure: string | undefined, shortCast: boolean, random = Math.random): FishSpecies | null {
  if (random() >= GROUNDBAIT_FEEDER_SHARE) return null;
  const home = FISH.filter((fish) => fish.spots.includes(spot) && (!shortCast || fish.rarity === "common"));
  const feeders = poolForLure(home, lure).filter((fish) => GROUNDBAIT_FEEDERS.has(fish.id));
  return feeders[Math.floor(random() * feeders.length)] ?? null;
}

/** A fish lost in a fight spooks its bank: the next cast there waits this much longer for a bite. */
export const SPOOK_WAIT = 1.4;

/** Whether this cast lands on water a lost fish just spooked. */
export function castIntoSpooked(spooked: SpotId | null, spot: SpotId) {
  return spooked === spot;
}

/** The shortest wait for a bite, so there is always room for a nibble before it. */
export const WAIT_FLOOR_MS = 1100;

/** The wait after the cast's own multipliers (lure, school, spooked water), never under the floor however many bonuses stack. */
export function stackWaitMs(wait: number, ...muls: number[]) {
  return Math.max(WAIT_FLOOR_MS, muls.reduce((ms, mul) => ms * mul, wait));
}

export function waitMs(patience: number, hour: LakeHour = lakeHour(), hotspot = false, level = 1, mercy = false, hotBank = false, rise = false, perfect = false) {
  const base = 2200 + Math.random() * 3800;
  const wait = Math.max(
    WAIT_FLOOR_MS,
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
