import { inLake, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * Gossamer: on fine, still fall mornings tiny spiders let out long silk threads and ride them on
 * the air, and the threads float out over the water in front of the dock, slowly rippling, a glint
 * of sun running along each now and then. Pure in time.
 */

/** At dawn and by day in fall, when it is fine and the air barely moves. */
export function gossamerOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason, wind: { x: number; z: number }) {
  return (hour === "dawn" || hour === "day") && season === "fall" && (sky === "clear" || sky === "partly-cloudy") && Math.hypot(wind.x, wind.z) < LIGHT_AIR;
}

/** Above this drift the threads are torn away. */
export const LIGHT_AIR = 0.15;
export const THREADS = 7;
/** Points along each thread. */
export const THREAD_POINTS = 14;
/** The stretch of air they cross, in front of the dock: from x = -SPAN/2 to SPAN/2. */
const SPAN = 18;
const NEAR_Z = 3;
const FAR_Z = -2;
/** Seconds to drift across. */
export const CROSS_SEC = 55;

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export type SilkPoint = { x: number; y: number; z: number; glint: number };

/**
 * Point `k` of thread `i` at `time`, its height above the water's rest level, and how brightly
 * it catches the sun there (0 unseen, 1 a full glint; the thread fades in and out at the ends
 * of its crossing). `still` holds the threads where they hung at one moment.
 */
export function silkPoint(i: number, k: number, time: number, still = false): SilkPoint {
  const t = still ? 20 : time;
  const sweep = (((t / CROSS_SEC + i / THREADS) % 1) + 1) % 1;
  const fade = Math.min(1, sweep / 0.12, (1 - sweep) / 0.12);
  const length = 2 + hash(i + 1) * 1.6;
  const tilt = (hash(i + 2) - 0.5) * 1.2;
  const lift = (hash(i + 3) - 0.3) * 0.5;
  const z0 = FAR_Z + hash(i + 4) * (NEAR_Z - FAR_Z);
  const y0 = 0.9 + hash(i + 5) * 1.2;
  const phase = hash(i + 6) * Math.PI * 2;
  const along = k / (THREAD_POINTS - 1);
  const s = along * length;
  // The thread trails behind its spider, sagging a little and rippling in the air.
  return {
    x: -SPAN / 2 + SPAN * sweep - Math.cos(tilt) * s,
    y: y0 + 0.25 * Math.sin(t * 0.3 + phase) + lift * s - 0.12 * Math.sin(Math.PI * along) + 0.05 * Math.sin(along * 9 - t * 1.8 + phase),
    z: z0 + Math.sin(tilt) * s + 0.04 * Math.sin(along * 7 + t * 1.3 + phase),
    glint: fade * (0.25 + 0.75 * Math.max(0, Math.sin(along * 4 - t * 0.9 + phase)) ** 6),
  };
}

/** Every thread crosses only open water. */
export function silkOverWater() {
  for (let i = 0; i < THREADS; i++) {
    for (let s = 0; s <= 20; s++) {
      for (const k of [0, THREAD_POINTS - 1]) {
        const p = silkPoint(i, k, (s / 20) * CROSS_SEC);
        if (!inLake(p.x, p.z)) return false;
      }
    }
  }
  return true;
}
