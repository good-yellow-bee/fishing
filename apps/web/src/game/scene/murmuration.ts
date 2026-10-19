import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/**
 * A murmuration: a great flock of starlings wheeling high over the far shore at dusk in fall before
 * they drop to roost. The cloud stretches, folds and turns as one, a wave of turning running
 * through it from end to end. Like the geese, it is drawn in the sky beyond the far hills, and the
 * dock sees most of it in the still lake's mirror. Pure in time.
 */

type Point = { x: number; y: number; z: number };

export const FLOCK_SIZE = 260;
/** Lite effects keep this many. */
export const LITE_FLOCK = 110;
/** Where the cloud wheels: high over the far shore, inside the sky dome, as the geese fly. */
const HOME = { x: 0, y: 15, z: -54 };
/** How far it drifts about that spot, and how fast. */
const DRIFT = { x: 15, y: 2.5, z: 4 };
/** The cloud's half-size along its length, height and depth, and how far each breathes in and out. */
const SIZE = { x: 7, y: 2.2, z: 3 };
const BREATHE = { x: 3, y: 1.3 };
/** How far the folds bend the cloud, and how long the wave of turning takes to cross it. */
const FOLD = 1.6;
const WAVE_LAG_SEC = 1.2;

/** Out at dusk in fall, unless rain or fog hides the sky. */
export function murmurationOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return season === "fall" && hour === "dusk" && sky !== "rain" && sky !== "fog";
}

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Bird `index`'s own place in the cloud, a point in the unit ball, packed denser toward the middle. */
function seat(index: number): Point {
  const u = hash(index) * 2 - 1;
  const a = hash(index + 0.37) * Math.PI * 2;
  const r = Math.pow(hash(index + 0.71), 0.6);
  const ring = Math.sqrt(1 - u * u);
  return { x: r * ring * Math.cos(a), y: r * u, z: r * ring * Math.sin(a) };
}

/** Where bird `index` is `time` seconds in. */
export function starlingAt(index: number, time: number): Point {
  const s = seat(index);
  // The wave of turning: birds toward one end follow what the other end did a moment before.
  const t = time - (s.x + 1) * 0.5 * WAVE_LAG_SEC;
  const turn = Math.sin(t * 0.11) * 0.9;
  const ax = SIZE.x + BREATHE.x * Math.sin(t * 0.21);
  const ay = SIZE.y + BREATHE.y * Math.sin(t * 0.17 + 1);
  let x = s.x * ax;
  let y = s.y * ay + FOLD * Math.sin(s.x * 2.4 + t * 0.9);
  const z = s.z * SIZE.z + FOLD * 0.6 * Math.sin(s.y * 2 + t * 0.6);
  x += FOLD * 0.7 * Math.sin(s.y * 2.2 + t * 0.7);
  y += 0.15 * Math.sin(time * 3 + index);
  const cx = HOME.x + DRIFT.x * Math.sin(t * 0.031);
  const cy = HOME.y + DRIFT.y * Math.sin(t * 0.07);
  const cz = HOME.z + DRIFT.z * Math.sin(t * 0.043);
  return { x: cx + x * Math.cos(turn) - z * Math.sin(turn), y: cy + y, z: cz + x * Math.sin(turn) + z * Math.cos(turn) };
}
