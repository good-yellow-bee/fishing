import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { SWAN_LOOP, SWAN_TRAIL, swansOut } from "./swanGlide";

/** A summer brood of grey cygnets paddling in a line behind the two swans. */
export const CYGNET_COUNT = 4;
/** Radians a second the swans glide round their loop (as swanGlide.ts has it). */
const GLIDE_RATE = 0.02;
/** Metres from the second swan to the first cygnet, and between cygnets. */
const FIRST_GAP = 0.9;
const CYGNET_GAP = 0.55;
/** How far a cygnet strays either side of its parents' line, in metres. */
const STRAY = 0.2;

/** The brood is out with the swans in summer; in spring the eggs have not hatched yet. */
export function cygnetsOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return season === "summer" && swansOut(hour, sky, season);
}

export type CygnetPose = { x: number; z: number; yaw: number; bob: number };

/**
 * Cygnet `i` at `time`: strung out in a line behind the second swan, each straying a little to one
 * side and back and paddling with a bob. Reduced motion stills the straying and the bob, though the
 * brood still keeps up with the swans.
 */
export function cygnetPose(i: number, time: number, still = false): CygnetPose {
  // Each a set distance behind the second swan, however tight the loop's curve is there.
  let angle = time * GLIDE_RATE - SWAN_TRAIL;
  for (let left = FIRST_GAP + i * CYGNET_GAP; left > 0; ) {
    const stride = Math.hypot(Math.sin(angle) * SWAN_LOOP.rx, Math.cos(angle) * SWAN_LOOP.rz);
    const step = Math.min(left, 0.1);
    angle -= step / stride;
    left -= step;
  }
  const ahead = { x: -Math.sin(angle) * SWAN_LOOP.rx, z: Math.cos(angle) * SWAN_LOOP.rz };
  const length = Math.hypot(ahead.x, ahead.z);
  const wander = still ? 0 : Math.sin(time * 0.31 + i * 2.1) * STRAY;
  // Straying is sideways off the swans' line: along the loop's normal.
  const x = SWAN_LOOP.x + Math.cos(angle) * SWAN_LOOP.rx + (ahead.z / length) * wander;
  const z = SWAN_LOOP.z + Math.sin(angle) * SWAN_LOOP.rz - (ahead.x / length) * wander;
  const yaw = Math.atan2(ahead.x, ahead.z) + (still ? 0 : Math.sin(time * 0.9 + i) * 0.25);
  return { x, z, yaw, bob: still ? 0 : Math.sin(time * 4.2 + i * 1.7) };
}
