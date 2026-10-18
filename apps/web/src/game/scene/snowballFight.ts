import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * Two children having a snowball fight on the east end of the far bank on winter days. In turn
 * each crouches to scoop up snow, packs it, stands and throws; the snowball flies across in an
 * arc and bursts in a puff of snow, on the other child's coat or, when they duck, in the snow
 * behind them. Pure in time.
 */

type Spot = { x: number; z: number };

/** Where round the shore rings each child stands (the shape's +y is the world's -z) and how far back from the water. */
const SPOTS = [
  { angle: 0.96, out: 2.6 },
  { angle: 1.13, out: 2.3 },
] as const;

/** One throw, start to finish: scoop, pack, throw, flight, burst. */
const SCOOP_SEC = 1.2;
const PACK_SEC = 0.6;
const THROW_SEC = 0.4;
export const FLIGHT_SEC = 0.85;
const PUFF_SEC = 0.7;
const TURN_SEC = SCOOP_SEC + PACK_SEC + THROW_SEC + FLIGHT_SEC + PUFF_SEC;
/** Four throws a round: A hits, B misses, A misses, B hits. */
const THROWS = [
  { by: 0, hit: true },
  { by: 1, hit: false },
  { by: 0, hit: false },
  { by: 1, hit: true },
] as const;
export const FIGHT_ROUND_SEC = TURN_SEC * THROWS.length;
/** The hand's height at the throw, the coat's where a hit lands, and how high the arc climbs above the hand. */
export const HAND_Y = 0.95;
const COAT_Y = 0.75;
const LOFT = 0.7;
/** Where a miss lands: past the ducking child and off to the side. */
const MISS_PAST = 0.9;
const MISS_SIDE = 0.6;

/** Out by day in winter unless it is foggy. */
export function snowballOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && season === "winter" && sky !== "fog";
}

function shorePoint(angle: number, out: number): Spot {
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + out), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + out) };
}

/** The two children, each facing the other. */
export const KIDS: readonly (Spot & { yaw: number })[] = SPOTS.map((spot, i) => {
  const self = shorePoint(spot.angle, spot.out);
  const other = shorePoint(SPOTS[1 - i]!.angle, SPOTS[1 - i]!.out);
  return { ...self, yaw: Math.atan2(other.x - self.x, other.z - self.z) };
});

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** Which throw `time` falls in, and how far into it. */
function turnAt(time: number, still: boolean) {
  const t = still ? SCOOP_SEC + PACK_SEC * 0.5 : ((time % FIGHT_ROUND_SEC) + FIGHT_ROUND_SEC) % FIGHT_ROUND_SEC;
  const index = Math.floor(t / TURN_SEC);
  return { ...THROWS[index]!, u: t - index * TURN_SEC };
}

const RELEASE = SCOOP_SEC + PACK_SEC + THROW_SEC;
/** The throwing arm wound back behind the head, and flung out level. */
const WOUND = 3.5;
const FLUNG = 1.4;

/** Where the snowball leaves the thrower's hand, and where it lands. */
function flightOf(by: number, hit: boolean) {
  const from = KIDS[by]!;
  const to = KIDS[1 - by]!;
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  const ux = dx / length;
  const uz = dz / length;
  const start = { x: from.x + ux * 0.3, y: HAND_Y, z: from.z + uz * 0.3 };
  const end = hit
    ? { x: to.x - ux * 0.15, y: COAT_Y, z: to.z - uz * 0.15 }
    : { x: to.x + ux * MISS_PAST + uz * MISS_SIDE, y: 0, z: to.z + uz * MISS_PAST - ux * MISS_SIDE };
  return { start, end };
}

export type BallPoint = { x: number; y: number; z: number };

/** The snowball in flight `time` seconds in, or null while it is being made or has burst. */
export function snowballAt(time: number, still = false): BallPoint | null {
  const { by, hit, u } = turnAt(time, still);
  const s = (u - RELEASE) / FLIGHT_SEC;
  if (s < 0 || s > 1) return null;
  const { start, end } = flightOf(by, hit);
  return { x: start.x + (end.x - start.x) * s, y: start.y + (end.y - start.y) * s + Math.sin(s * Math.PI) * LOFT, z: start.z + (end.z - start.z) * s };
}

export type Puff = BallPoint & { age: number };

/** The burst of snow where the last snowball landed, `age` running 0 to 1, or null. */
export function puffAt(time: number, still = false): Puff | null {
  const { by, hit, u } = turnAt(time, still);
  const age = (u - RELEASE - FLIGHT_SEC) / PUFF_SEC;
  if (age < 0 || age > 1) return null;
  return { ...flightOf(by, hit).end, age };
}

export type KidPose = {
  /** How far down they crouch, to scoop snow or to duck, 0 standing to 1 down. */
  crouch: number;
  /** How far the throwing arm is lifted forward from hanging at the side, in radians: past straight up when wound back, level when flung. */
  arm: number;
  /** Both hands together in front, packing the snowball, 0 to 1. */
  pack: number;
};

/** Child `i` `time` seconds in. */
export function kidAt(i: number, time: number, still = false): KidPose {
  const { by, hit, u } = turnAt(time, still);
  if (i === by) {
    const down = u < SCOOP_SEC ? smooth(u / 0.4) : 1 - smooth((u - SCOOP_SEC) / PACK_SEC);
    const pack = u < SCOOP_SEC - 0.3 ? 0 : u < RELEASE - THROW_SEC ? smooth((u - (SCOOP_SEC - 0.3)) / 0.3) : 1 - smooth((u - (RELEASE - THROW_SEC)) / 0.15);
    const w = u - (RELEASE - THROW_SEC);
    // Wind back up over the shoulder, fling forward over the top at the release, then let the arm fall back.
    const arm =
      w < 0 ? 0 : w < THROW_SEC ? WOUND * smooth(w / (THROW_SEC * 0.6)) - (WOUND - FLUNG) * smooth((w - THROW_SEC * 0.6) / (THROW_SEC * 0.4)) : FLUNG * (1 - smooth((w - THROW_SEC) / 0.6));
    return { crouch: down, arm, pack };
  }
  // The target ducks a missed throw just before it arrives, and comes back up after.
  if (hit) return { crouch: 0, arm: 0, pack: 0 };
  const d = u - (RELEASE + FLIGHT_SEC * 0.35);
  return { crouch: d < 0 ? 0 : smooth(d / 0.25) * (1 - smooth((d - 0.8) / 0.4)), arm: 0, pack: 0 };
}
