import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { floeSpot, iceFloes, type Floe } from "./iceFloes";

/**
 * Black-headed gulls in winter, each standing on a floe of pancake ice out on the far side of the
 * lake and riding it as it drifts, facing into the wind. Now and then one lifts off, wheels once
 * low over the water and drops back onto its floe. Pure in time.
 */

type Point = { x: number; y: number; z: number };

export const GULL_COUNT = 3;
/** The floe's top above the water it floats on. */
export const FLOE_TOP = 0.037;
/** How often each takes a turn in the air, how long it lasts, and how wide and high it wheels. */
export const FLIGHT_EVERY_SEC = 46;
const FLIGHT_SEC = 8;
const LOOP_RADIUS = 2.6;
const LOOP_HEIGHT = 1.5;
/** Each gull's turn comes at its own point in the round. */
const FLIGHT_AT = [9, 24, 37] as const;

/** Out at dawn and by day in winter, unless it is foggy. */
export function gullsOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return season === "winter" && (hour === "dawn" || hour === "day") && sky !== "fog";
}

/** The floes they stand on: the broadest out on the far side of the lake, where the dock can see them. */
export function gullFloes(floes: readonly Floe[] = iceFloes()): Floe[] {
  return floes
    .filter((floe) => floe.z < -4 && Math.abs(floe.x) < 14 && floe.radius > 0.35)
    .sort((a, b) => b.radius - a.radius)
    .slice(0, GULL_COUNT);
}

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

export type GullPose = Point & {
  /** Which way it faces, as a yaw for a model facing +z. */
  yaw: number;
  /** In the air, wings beating, 0 to 1. */
  flying: number;
};

/** Gull `index` on `floe` `time` seconds in, `y` above the floe's top. `still` keeps it standing. */
export function gullAt(index: number, floe: Floe, wind: { x: number; z: number }, time: number, still = false): GullPose {
  const at = floeSpot(floe, wind, time, still);
  const speed = Math.hypot(wind.x, wind.z);
  // Standing, it faces into the wind; on a calm day it turns with its floe.
  const standYaw = speed < 1e-3 ? at.yaw : Math.atan2(-wind.x, -wind.z);
  const into = still ? -1 : (((time - FLIGHT_AT[index % FLIGHT_AT.length]) % FLIGHT_EVERY_SEC) + FLIGHT_EVERY_SEC) % FLIGHT_EVERY_SEC;
  if (into < 0 || into >= FLIGHT_SEC || time < FLIGHT_AT[index % FLIGHT_AT.length]) return { x: at.x, y: 0, z: at.z, yaw: standYaw, flying: 0 };
  // Once round a low loop out over the water, starting and ending on the floe, swinging out toward the lake's middle.
  const p = smooth(into / FLIGHT_SEC);
  const a = p * Math.PI * 2;
  const out = Math.atan2(0 - at.x, -2 - at.z);
  const cx = at.x + Math.sin(out) * LOOP_RADIUS;
  const cz = at.z + Math.cos(out) * LOOP_RADIUS;
  const x = cx - Math.sin(out + a) * LOOP_RADIUS;
  const z = cz - Math.cos(out + a) * LOOP_RADIUS;
  // Heading along the loop: the circle's tangent, the way round it goes.
  const yaw = Math.atan2(-Math.cos(out + a), Math.sin(out + a));
  const lift = Math.sin(Math.PI * p);
  return { x, y: LOOP_HEIGHT * Math.sqrt(lift), z, yaw, flying: into < 0.15 || into > FLIGHT_SEC - 0.15 ? 0.5 : 1 };
}
