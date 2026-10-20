import { spotAt, walkableAt } from "@stillwater/shared";
import { HOTSPOT_RADIUS, slotFrenzy, type Hotspot } from "../hotspot";
import { smoothstep } from "./visitClock";
import { waterHeight } from "./water";

/**
 * The bubble patch boiling in a feeding frenzy (hotspot.ts, GT369): while the frenzy runs, little silver
 * baitfish skitter up out of the water and splash back all over the patch, and the bubbles come thick and
 * fast. It builds and dies away over a few seconds at the frenzy's start and end. Pure in the wall clock
 * (the frenzy's own) and the scene's clock (the leaps).
 */

/** Seconds the boil takes to build and to die away. */
const RAMP_MS = 3000;
/** Baitfish leaping at the height of it, and the length of one leap's round. */
export const BAITFISH = 10;
export const LEAP_SEC = 1.1;
/** How high and far a leap carries, metres, and its share of the round (the rest is its splash spreading). */
const LEAP_UP = 0.22;
const LEAP_ACROSS = 0.35;
const LEAP_SHARE = 0.45;
const SPLASH_MAX = 0.28;
const GOLDEN = 0.618034;

function frac(value: number) {
  return value - Math.floor(value);
}

/** How hard the patch boils at `nowMs`, 0 to 1: building at the frenzy's start, dying away at its end. */
export function frenzyAmount(nowMs: number) {
  const { from, to } = slotFrenzy(nowMs);
  if (nowMs < from || nowMs >= to) return 0;
  return Math.min(smoothstep((nowMs - from) / RAMP_MS), smoothstep((to - nowMs) / RAMP_MS));
}

export type Leap = { x: number; y: number; z: number; yaw: number; pitch: number } | null;
export type Splash = { x: number; y: number; z: number; size: number; fade: number } | null;

/** Baitfish `i` of the patch at `time`: in the air on its arc, and its splash spreading where it lands. Both null while it rests. */
export function baitfish(hotspot: Hotspot, i: number, time: number, amount: number): { leap: Leap; splash: Splash } {
  // Fewer of them leap while the boil builds and dies away.
  if (i >= Math.round(amount * BAITFISH)) return { leap: null, splash: null };
  const t = time / LEAP_SEC + frac(i * GOLDEN);
  const round = Math.floor(t);
  const u = t - round;
  const reach = HOTSPOT_RADIUS * 0.85 * Math.sqrt(frac((i + 0.5) / BAITFISH + round * GOLDEN));
  const angle = i * 2.39996 + round * 2.1;
  const sx = hotspot.x + Math.cos(angle) * reach;
  const sz = hotspot.z + Math.sin(angle) * reach;
  const heading = angle * 3.7 + round;
  const ex = sx + Math.sin(heading) * LEAP_ACROSS;
  const ez = sz + Math.cos(heading) * LEAP_ACROSS;
  if (spotAt(ex, ez) !== hotspot.spot || walkableAt(ex, ez) || walkableAt(sx, sz)) return { leap: null, splash: null };
  if (u < LEAP_SHARE) {
    const k = u / LEAP_SHARE;
    const x = sx + (ex - sx) * k;
    const z = sz + (ez - sz) * k;
    return {
      leap: { x, y: waterHeight(x, z, time) + LEAP_UP * Math.sin(Math.PI * k), z, yaw: heading, pitch: (k - 0.5) * 1.6 },
      splash: null,
    };
  }
  const k = (u - LEAP_SHARE) / (1 - LEAP_SHARE);
  return { leap: null, splash: { x: ex, y: waterHeight(ex, ez, time) + 0.06, z: ez, size: 0.05 + k * SPLASH_MAX, fade: 1 - k } };
}
