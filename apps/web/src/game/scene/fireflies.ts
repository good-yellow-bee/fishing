import type { LakeHour, Sky as WeatherSky } from "@stillwater/shared";

/** Middles of the reed beds LakeWorld plants: the west shallows, the east point and the creek mouth. */
export const REED_BEDS: { x: number; z: number; flies: number }[] = [
  { x: -12.4, z: 1.2, flies: 16 },
  { x: 12.0, z: -10.0, flies: 10 },
  { x: -22.6, z: -11.2, flies: 10 },
];

/** Meters a firefly's home may sit from its bed, and how far it wanders from home. */
export const FIREFLY_HOME_RADIUS = 2.2;
export const FIREFLY_WANDER = 0.6;
export const FIREFLY_LOW = 0.45;
export const FIREFLY_HIGH = 1.7;

export const FIREFLY_COUNT = REED_BEDS.reduce((sum, bed) => sum + bed.flies, 0);

export type Firefly = { x: number; y: number; z: number; glow: number };

type Home = { x: number; y: number; z: number; phase: number; period: number; speed: number };

// Same cheap hash as the scatter jitter: fixed homes, no Math.random, so tests and screenshots agree.
function hash(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const HOMES: Home[] = REED_BEDS.flatMap((bed, b) =>
  Array.from({ length: bed.flies }, (_, f) => {
    const seed = b * 100 + f;
    const angle = hash(seed) * Math.PI * 2;
    const reach = Math.sqrt(hash(seed + 17)) * FIREFLY_HOME_RADIUS;
    return {
      x: bed.x + Math.cos(angle) * reach,
      z: bed.z + Math.sin(angle) * reach,
      y: FIREFLY_LOW + 0.25 + hash(seed + 31) * (FIREFLY_HIGH - FIREFLY_LOW - 0.5),
      phase: hash(seed + 47),
      period: 2.4 + hash(seed + 59) * 2.2,
      speed: 0.6 + hash(seed + 71) * 0.7,
    };
  }),
);

/** Fireflies come out on dry nights only. */
export function firefliesOut(hour: LakeHour, sky: WeatherSky) {
  return hour === "night" && sky !== "rain";
}

/**
 * One firefly at `time`: a slow loop around its home over the reeds and a blink
 * that rises, holds a moment and fades. `still` keeps it at home for reduced motion.
 */
export function firefly(index: number, time: number, still = false): Firefly {
  const home = HOMES[((index % FIREFLY_COUNT) + FIREFLY_COUNT) % FIREFLY_COUNT]!;
  const t = still ? 0 : time * home.speed;
  const p = home.phase * Math.PI * 2;
  const blink = Math.sin(((time / home.period + home.phase) % 1) * Math.PI * 2);
  return {
    x: home.x + Math.sin(t * 0.43 + p) * FIREFLY_WANDER,
    z: home.z + Math.cos(t * 0.37 + p * 1.3) * FIREFLY_WANDER,
    y: home.y + Math.sin(t * 0.71 + p) * 0.22,
    // Cubed so most of the cycle is a dim ember and the flash is short.
    glow: 0.08 + 0.92 * Math.max(0, blink) ** 3,
  };
}
