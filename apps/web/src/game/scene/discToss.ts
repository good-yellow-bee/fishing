import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * Two people tossing a flying disc back and forth on the east end of the far bank on summer days.
 * Each throw winds up, flicks the disc off on a curving arc and the other catches it high, holds
 * it a moment, then winds up and throws it back. Pure in time.
 */

type Spot = { x: number; z: number };

/** Where round the shore rings each player stands (the shape's +y is the world's -z) and how far back from the water. */
const SPOTS = [
  { angle: 0.93, out: 2.7 },
  { angle: 1.1, out: 2.4 },
] as const;
/** Too windy above this drift for a disc to fly true. */
const GUSTY = 0.1;

/** The seconds a throw spends in the air, and the catcher holds it before throwing back. */
export const FLIGHT_SEC = 1.5;
export const HOLD_SEC = 2.3;
/** The wind-up before the release, at the end of the hold. */
const WIND_UP_SEC = 0.7;
/** How long the catcher reaches up before the disc arrives. */
const REACH_SEC = 0.45;
export const TOSS_ROUND_SEC = (FLIGHT_SEC + HOLD_SEC) * 2;
/** The hand's height, how high the arc climbs above it and how far it bows out to the side. */
export const HAND_Y = 1.0;
const LOFT = 0.9;
const CURVE = 0.7;

/** Out by day in summer, when it is neither raining nor foggy nor too windy. */
export function discOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return hour === "day" && season === "summer" && sky !== "rain" && sky !== "fog" && Math.hypot(wind.x, wind.z) < GUSTY;
}

function shorePoint(angle: number, out: number): Spot {
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + out), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + out) };
}

/** The two players, each facing the other. */
export const PLAYERS: readonly (Spot & { yaw: number })[] = SPOTS.map((spot, i) => {
  const self = shorePoint(spot.angle, spot.out);
  const other = shorePoint(SPOTS[1 - i]!.angle, SPOTS[1 - i]!.out);
  return { ...self, yaw: Math.atan2(other.x - self.x, other.z - self.z) };
});

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** Where in the round `time` falls: who threw last, and how far into the flight or the hold. */
function stage(time: number, still: boolean) {
  const t = still ? FLIGHT_SEC + HOLD_SEC * 0.4 : ((time % TOSS_ROUND_SEC) + TOSS_ROUND_SEC) % TOSS_ROUND_SEC;
  const half = FLIGHT_SEC + HOLD_SEC;
  const thrower = t < half ? 0 : 1;
  const u = t - thrower * half;
  return { thrower, flying: u < FLIGHT_SEC, u };
}

/** A player's hand, a little in front and to the right of them, where they catch and throw. */
function handOf(i: number): { x: number; y: number; z: number } {
  const p = PLAYERS[i]!;
  // Facing +z, the right hand is on -x; in the world that is -(cos yaw, -sin yaw).
  return { x: p.x + Math.sin(p.yaw) * 0.35 - Math.cos(p.yaw) * 0.25, y: HAND_Y, z: p.z + Math.cos(p.yaw) * 0.35 + Math.sin(p.yaw) * 0.25 };
}

export type DiscPoint = { x: number; y: number; z: number; spin: number; flying: boolean };

/** The disc `time` seconds in: on its arc between them, or held in the catcher's hand. */
export function discAt(time: number, still = false): DiscPoint {
  const { thrower, flying, u } = stage(time, still);
  const from = handOf(thrower);
  const to = handOf(1 - thrower);
  if (!flying) return { ...to, spin: 0, flying: false };
  const s = u / FLIGHT_SEC;
  // It bows out to the thrower's left as it flies, the way a backhand throw curves.
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  const bow = Math.sin(s * Math.PI) * CURVE;
  return {
    x: from.x + dx * s + (dz / length) * bow,
    y: from.y + Math.sin(s * Math.PI) * LOFT,
    z: from.z + dz * s - (dx / length) * bow,
    spin: u * 18,
    flying: true,
  };
}

export type TosserPose = {
  /** The throwing arm's swing: below 0 wound back across the body, up to 1 flung out toward the other player. */
  swing: number;
  /** How far the throwing arm is lifted out level for the throw, 0 hanging to 1 level. */
  raise: number;
  /** The catching reach, 0 at rest to 1 with the arm raised to take the disc. */
  reach: number;
};

/** Player `i` `time` seconds in. */
export function tosserAt(i: number, time: number, still = false): TosserPose {
  const { thrower, flying, u } = stage(time, still);
  if (i === thrower) {
    // Just thrown: the arm follows through, then drops back to rest.
    const follow = flying ? 1 - smooth(u / (FLIGHT_SEC * 0.8)) : 0;
    return { swing: follow, raise: follow, reach: 0 };
  }
  if (flying) return { swing: 0, raise: 0, reach: smooth((u - (FLIGHT_SEC - REACH_SEC)) / REACH_SEC) };
  // Holding it: the arm lowers after the catch, then winds back and flicks out for the throw.
  const hold = u - FLIGHT_SEC;
  const lowered = 1 - smooth(hold / 0.5);
  const windUp = hold - (HOLD_SEC - WIND_UP_SEC);
  const swing = windUp < 0 ? 0 : -smooth(windUp / (WIND_UP_SEC * 0.65)) + smooth((windUp - WIND_UP_SEC * 0.65) / (WIND_UP_SEC * 0.35)) * 2;
  return { swing, raise: windUp < 0 ? 0 : smooth(windUp / (WIND_UP_SEC * 0.3)), reach: lowered };
}
