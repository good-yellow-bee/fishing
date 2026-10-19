import { DOCK_STAND_X, DOCK_STAND_Z, inLake, type LakeHour, type LakeSeason } from "@stillwater/shared";

/**
 * A fry burst: now and then something big hunting under the open water bursts into a shoal of
 * fry, and the little fish spray out of the surface in a fan, skittering through the air and
 * pattering back down in a scatter of tiny rings, while a heavy swirl boils up where the hunter
 * turned. Purely for looks, well clear of the dock so it never reads as a bite. Pure in time.
 */

/** From spring to fall, by daylight. */
export function fryOut(hour: LakeHour, season: LakeSeason) {
  return hour !== "night" && season !== "winter";
}

/** A burst comes this often, somewhere from SPOTS in turn. */
export const BURST_EVERY_SEC = 48;
/** The first one comes this long in. */
const FIRST_SEC = 12;
/** Where the shoals are hunted: open water in view of the dock, clear of it. */
export const SPOTS = [
  { x: -6, z: -2.5 },
  { x: 5.5, z: -4 },
  { x: -8.5, z: 1.5 },
  { x: 2.5, z: -7 },
];
export const DOCK_CLEAR = 7;
export const FRY = 20;
/** Fry leave the water over this long after the strike. */
const LAUNCH_SPREAD_SEC = 0.5;
const GRAVITY = 9.8;
/** How long a landing ring spreads, and the swirl boils. */
export const RING_SEC = 0.9;
export const SWIRL_SEC = 2.4;
export const BURST_SEC = LAUNCH_SPREAD_SEC + 0.6 + RING_SEC;

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** The burst `time` falls in, and how far into it; null between bursts. */
export function fryBurst(time: number, still = false) {
  if (still) return null;
  const shifted = time - FIRST_SEC;
  const index = Math.floor(shifted / BURST_EVERY_SEC);
  const since = shifted - index * BURST_EVERY_SEC;
  if (since >= Math.max(BURST_SEC, SWIRL_SEC)) return null;
  const spot = SPOTS[((index % SPOTS.length) + SPOTS.length) % SPOTS.length]!;
  // The shoal flees away from where the hunter came from.
  const away = hash(index * 3 + 1) * Math.PI * 2;
  return { index, since, x: spot.x, z: spot.z, away };
}

export type Fry = { x: number; y: number; z: number; heading: number; pitch: number } | null;
export type FryRing = { x: number; z: number; radius: number; fade: number } | null;

function flight(i: number, burst: NonNullable<ReturnType<typeof fryBurst>>) {
  const seed = burst.index * 101 + i * 13;
  const launch = hash(seed) * LAUNCH_SPREAD_SEC;
  const angle = burst.away + (hash(seed + 1) - 0.5) * 2.4;
  const speed = 1.1 + hash(seed + 2) * 1.2;
  const rise = 2.2 + hash(seed + 3) * 1.2;
  const airtime = (2 * rise) / GRAVITY;
  const start = 0.15 + hash(seed + 4) * 0.35;
  return { launch, angle, speed, rise, airtime, x0: burst.x + Math.cos(angle) * start, z0: burst.z + Math.sin(angle) * start };
}

/** Fry `i` in the air at `time`, its height over the water, heading and nose-up pitch; null when it is under the water. */
export function fryAt(i: number, time: number, still = false): Fry {
  const burst = fryBurst(time, still);
  if (!burst) return null;
  const f = flight(i, burst);
  const t = burst.since - f.launch;
  if (t < 0 || t > f.airtime) return null;
  const vy = f.rise - GRAVITY * t;
  return {
    x: f.x0 + Math.cos(f.angle) * f.speed * t,
    y: f.rise * t - (GRAVITY * t * t) / 2,
    z: f.z0 + Math.sin(f.angle) * f.speed * t,
    heading: f.angle,
    pitch: Math.atan2(vy, f.speed),
  };
}

/** The ring where fry `i` landed back, spreading and fading; null before it lands or once it has faded. */
export function fryRing(i: number, time: number, still = false): FryRing {
  const burst = fryBurst(time, still);
  if (!burst) return null;
  const f = flight(i, burst);
  const t = burst.since - f.launch - f.airtime;
  if (t < 0 || t > RING_SEC) return null;
  const k = t / RING_SEC;
  return { x: f.x0 + Math.cos(f.angle) * f.speed * f.airtime, z: f.z0 + Math.sin(f.angle) * f.speed * f.airtime, radius: 0.04 + 0.2 * k, fade: 1 - k };
}

/** The hunter's swirl boiling up at the heart of the burst. */
export function frySwirl(time: number, still = false): FryRing {
  const burst = fryBurst(time, still);
  if (!burst || burst.since > SWIRL_SEC) return null;
  const k = burst.since / SWIRL_SEC;
  return { x: burst.x, z: burst.z, radius: 0.3 + 1.2 * Math.sqrt(k), fade: 1 - k };
}

/** Every spot is open water, well clear of where the player stands. */
export function spotsClear() {
  return SPOTS.every((s) => inLake(s.x, s.z) && Math.hypot(s.x - DOCK_STAND_X, s.z - DOCK_STAND_Z) >= DOCK_CLEAR + 2);
}
