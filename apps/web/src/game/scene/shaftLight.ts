import { LAKE_CENTER_Z, inLake, type LakeHour, type Sky as WeatherSky } from "@stillwater/shared";

type Vec3 = [number, number, number];

/** Shafts across the lake. */
export const SHAFT_COUNT = 6;
/** How high above the water a shaft comes in over the bank, in meters. */
export const SHAFT_TOP = 6;
/** Half the lake's breadth the shafts spread across, square to the light. */
const SHAFT_SPREAD = 13;

/**
 * How strong the morning's shafts of light are: they need the low dawn sun out and the dawn mist on
 * the water to show in, so only a clear or partly cloudy dawn gets them. Later the mist has burned
 * off; overcast, rain and fog hide the sun.
 */
export function shaftStrength(hour: LakeHour, sky: WeatherSky) {
  if (hour !== "dawn") return 0;
  return sky === "clear" ? 1 : sky === "partly-cloudy" ? 0.8 : 0;
}

/** Which way the light runs: from the sun's disc down across the lake, as a unit vector. */
export function shaftDirection(discPos: Vec3): Vec3 {
  const [x, y, z] = discPos;
  const to = { x: -x, y: -y, z: LAKE_CENTER_Z - z };
  const length = Math.hypot(to.x, to.y, to.z);
  return [to.x / length, to.y / length, to.z / length];
}

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export type Shaft = { from: Vec3; to: Vec3; width: number };

/**
 * Where the shafts fall: each one lands on open water, spread across the lake square to the light,
 * and reaches back up toward the sun until it is SHAFT_TOP over the water.
 */
export function shaftLayout(discPos: Vec3, count = SHAFT_COUNT): Shaft[] {
  const dir = shaftDirection(discPos);
  const flat = Math.hypot(dir[0], dir[2]);
  const across = { x: -dir[2] / flat, z: dir[0] / flat };
  const along = { x: dir[0] / flat, z: dir[2] / flat };
  const reach = SHAFT_TOP / -dir[1];
  const shafts: Shaft[] = [];
  for (let i = 0; i < count; i += 1) {
    const k = count === 1 ? 0 : -SHAFT_SPREAD + (2 * SHAFT_SPREAD * i) / (count - 1);
    let shift = (seeded(i, 1) - 0.5) * 8;
    let x = across.x * (k + (seeded(i, 2) - 0.5) * 2) + along.x * shift;
    let z = LAKE_CENTER_Z + across.z * (k + (seeded(i, 2) - 0.5) * 2) + along.z * shift;
    // Pull a landing that misses the water back toward the middle until it is on the lake.
    while (!inLake(x, z)) {
      x *= 0.92;
      z = LAKE_CENTER_Z + (z - LAKE_CENTER_Z) * 0.92;
      shift *= 0.92;
    }
    shafts.push({
      to: [x, 0, z],
      from: [x - dir[0] * reach, SHAFT_TOP, z - dir[2] * reach],
      width: 1.2 + seeded(i, 3) * 1.6,
    });
  }
  return shafts;
}

/**
 * How lit a shaft is now, 0.15 to 1: the mist thickens and thins as it drifts through the light, so
 * each shaft swells and fades on its own slow beat. Held at a steady 0.7 for reduced motion.
 */
export function shaftGlow(i: number, time: number, still = false) {
  if (still) return 0.7;
  const a = Math.sin(time * (0.21 + seeded(i, 4) * 0.12) + seeded(i, 5) * 6.28);
  const b = Math.sin(time * (0.07 + seeded(i, 6) * 0.05) + seeded(i, 7) * 6.28);
  const mix = (a * 0.6 + b * 0.4) * 0.5 + 0.5;
  return 0.15 + 0.85 * mix * mix * (3 - 2 * mix);
}
