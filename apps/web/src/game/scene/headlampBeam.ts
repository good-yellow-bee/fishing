import type { ScenePhase } from "./types";

/**
 * The angler's own headlamp at night (GT365, logic.ts lampLit): a beam from their forehead onto the float
 * while it is out, or onto the ground a few steps ahead otherwise, with a pool of light where it lands.
 */

/** The lamp on the forehead: this high above the feet and this far ahead of the body's middle, metres. */
export const LAMP_UP = 1.45;
export const LAMP_AHEAD = 0.2;
/** Off the water, the beam falls on the ground this far ahead. */
const GROUND_AHEAD = 5;
/** It reaches no further than this; past it the beam has faded into the night. */
export const BEAM_REACH = 8;

type Point = { x: number; y: number; z: number };

/** Where the beam lands: on the float while it is out, else a few steps ahead, at `surface`'s height there (the boards, the bank or the water). */
export function headlampTarget(phase: ScenePhase, angler: Point & { yaw: number }, float: Point, surface: (x: number, z: number) => number): Point {
  if (phase === "waiting" || phase === "hookset" || phase === "fight") return { x: float.x, y: float.y, z: float.z };
  const x = angler.x + Math.sin(angler.yaw) * GROUND_AHEAD;
  const z = angler.z + Math.cos(angler.yaw) * GROUND_AHEAD;
  return { x, y: surface(x, z), z };
}
