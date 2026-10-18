import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * A child skimming stones from the water's edge on the west of the far bank. They stoop to pick a
 * flat stone, wind back and sling it sidearm; it skips out across the water in shorter and
 * shorter hops, a ring spreading where it touches each time, and sinks. Pure in time.
 */

type Spot = { x: number; z: number };

/** Where round the shore rings they stand (the shape's +y is the world's -z) and how far back from the water. */
const STAND_ANGLE = 1.93;
const STAND_OUT = 0.35;
/** Too choppy above this drift for stones to skip. */
const CHOPPY = 0.1;

/** One throw: stooping for a stone, winding back, the stone's flight, and a pause to watch. */
const STOOP_SEC = 2.2;
const WIND_SEC = 0.55;
const WATCH_SEC = 2.4;
/** The stone's first flight out to its first touch, and how each hop shrinks after it. */
const FIRST_REACH = 2.4;
const FIRST_HOP_SEC = 0.42;
const HOP_HEIGHT = 0.32;
const SHRINK = 0.74;
/** How high the hand lets go, and how far ahead of the child. */
const RELEASE_Y = 0.75;
const RELEASE_AHEAD = 0.45;
/** How long a ring takes to spread and fade, and the most a throw can have spreading at once. */
export const RING_SEC = 1.8;
export const MAX_SKIPS = 7;
/** Each throw's number of skips and its aim off straight out, so no two in a row look alike. */
const THROWS = [
  { skips: 5, aim: 0.1 },
  { skips: 7, aim: -0.25 },
  { skips: 3, aim: 0.3 },
  { skips: 6, aim: -0.05 },
] as const;

/** Out by day from spring to fall when the water is calm enough to skip on and it is neither raining nor foggy. */
export function skimOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return hour === "day" && season !== "winter" && sky !== "rain" && sky !== "fog" && Math.hypot(wind.x, wind.z) < CHOPPY;
}

function shorePoint(angle: number, out: number): Spot {
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + out), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + out) };
}

/** Where the child stands, facing out over the lake toward its middle. */
export const SKIMMER_AT = shorePoint(STAND_ANGLE, STAND_OUT);
export const SKIMMER_YAW = Math.atan2(0 - SKIMMER_AT.x, LAKE_CENTER_Z - SKIMMER_AT.z);

/** The time each hop of a throw takes, and the touches in the order the stone makes them. */
function flightOf(index: number) {
  const plan = THROWS[index % THROWS.length]!;
  const yaw = SKIMMER_YAW + plan.aim;
  const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
  const start = { x: SKIMMER_AT.x + dir.x * RELEASE_AHEAD, z: SKIMMER_AT.z + dir.z * RELEASE_AHEAD };
  const hops: { from: number; to: number; sec: number; height: number; at: number }[] = [];
  let reach = 0;
  let at = 0;
  for (let k = 0; k <= plan.skips; k += 1) {
    const length = FIRST_REACH * SHRINK ** k;
    const sec = FIRST_HOP_SEC * SHRINK ** (k * 0.6);
    hops.push({ from: reach, to: reach + length, sec, height: k === 0 ? 0.12 : HOP_HEIGHT * SHRINK ** k, at });
    reach += length;
    at += sec;
  }
  return { dir, start, hops, flight: at };
}

const LONGEST = Math.max(...THROWS.map((_, i) => flightOf(i).flight));
const THROW_SEC = STOOP_SEC + WIND_SEC + LONGEST + WATCH_SEC;
export const SKIM_ROUND_SEC = THROW_SEC * THROWS.length;

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function throwAt(time: number, still: boolean) {
  const t = still ? STOOP_SEC * 0.2 : ((time % SKIM_ROUND_SEC) + SKIM_ROUND_SEC) % SKIM_ROUND_SEC;
  const index = Math.floor(t / THROW_SEC);
  return { index, u: t - index * THROW_SEC };
}

const RELEASE = STOOP_SEC + WIND_SEC;

export type StonePoint = { x: number; y: number; z: number };

/** The stone in flight `time` seconds in (its height above the water), or null before the throw and once it has sunk. */
export function stoneAt(time: number, still = false): StonePoint | null {
  const { index, u } = throwAt(time, still);
  const s = u - RELEASE;
  const { dir, start, hops, flight } = flightOf(index);
  if (s < 0 || s >= flight) return null;
  const hop = hops.find((h) => s < h.at + h.sec) ?? hops[hops.length - 1]!;
  const p = (s - hop.at) / hop.sec;
  const along = hop.from + (hop.to - hop.from) * p;
  // The first flight drops from the hand to the water; each skip after it is a little arc.
  const y = hop.at === 0 ? RELEASE_Y * (1 - p) + Math.sin(p * Math.PI) * hop.height : Math.sin(p * Math.PI) * hop.height;
  return { x: start.x + dir.x * along, y, z: start.z + dir.z * along };
}

export type SkimRing = { x: number; z: number; age: number };

/** The rings spreading where the stone has touched the water, each with its `age` 0 to 1. */
export function skimRings(time: number, still = false): SkimRing[] {
  if (still) return [];
  const rings: SkimRing[] = [];
  // Each throw's rings have all faded before the next stone is thrown, so only this throw's can show.
  const { index, u } = throwAt(time, false);
  const { dir, start, hops } = flightOf(index);
  for (const hop of hops) {
    const age = (u - RELEASE - (hop.at + hop.sec)) / RING_SEC;
    if (age < 0 || age > 1) continue;
    rings.push({ x: start.x + dir.x * hop.to, z: start.z + dir.z * hop.to, age });
  }
  return rings;
}

export type SkimmerPose = {
  /** How far they stoop for a stone, 0 standing to 1 bent. */
  stoop: number;
  /** The throwing arm's sweep: below 0 wound back, up to 1 slung out across in front, 0 at rest. */
  sling: number;
  /** How far that arm is lifted out to the side for the throw, 0 hanging to 1 level. */
  lift: number;
};

/** The child `time` seconds in. */
export function skimmerAt(time: number, still = false): SkimmerPose {
  const { u } = throwAt(time, still);
  const stoop = u < STOOP_SEC ? smooth(u / 0.6) * (1 - smooth((u - (STOOP_SEC - 0.7)) / 0.7)) : 0;
  const w = u - STOOP_SEC;
  const sling = w < 0 ? 0 : w < WIND_SEC ? -smooth(w / (WIND_SEC * 0.7)) + 2 * smooth((w - WIND_SEC * 0.7) / (WIND_SEC * 0.3)) : 1 - smooth((w - WIND_SEC) / 0.7);
  const lift = w < 0 ? 0 : w < WIND_SEC ? smooth(w / (WIND_SEC * 0.3)) : 1 - smooth((w - WIND_SEC) / 0.7);
  return { stoop, sling, lift };
}
