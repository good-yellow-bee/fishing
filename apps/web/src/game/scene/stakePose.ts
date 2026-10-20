import * as THREE from "three";
import type { nightLineState } from "../nightLine";

export type LineState = ReturnType<typeof nightLineState>;

/** The stick's length, the share of it below where a fish on bows it, and its lean out over the water. */
const STICK = 0.9;
const BOW_AT = 0.55;
const LEAN = 0.45;
/** How far a fish on bows the stick's top toward the water. */
const BOW = 0.55;
/** How far out the line meets the water: nearer when a fish draws it taut. */
const LINE_OUT = 1.3;
const TAUT_OUT = 0.95;
/** How far a slack line's middle hangs below a straight one. */
export const SLACK_SAG = 0.16;
const LINE_SEGMENTS = 4;

/** The stick's lean and the line from its tip to the water, in the stake's frame (foot at the origin, leaning out along +z, water `footY` below). */
export function stakePose(state: LineState, footY: number) {
  const joint = new THREE.Vector3(0, Math.cos(LEAN), Math.sin(LEAN)).multiplyScalar(STICK * BOW_AT);
  const topLean = LEAN + (state === "ready" ? BOW : 0);
  const tip = joint.clone().add(new THREE.Vector3(0, Math.cos(topLean), Math.sin(topLean)).multiplyScalar(STICK * (1 - BOW_AT)));
  const end = new THREE.Vector3(0, -footY + 0.02, tip.z + (state === "ready" ? TAUT_OUT : LINE_OUT));
  // A slack line hangs in a curve: its control point sits twice the sag below the straight line's middle.
  const control = tip.clone().add(end).multiplyScalar(0.5);
  if (state === "stale") control.y -= 2 * SLACK_SAG;
  const curve = new THREE.QuadraticBezierCurve3(tip, control, end);
  return { joint, topLean, tip, line: curve.getPoints(state === "stale" ? LINE_SEGMENTS : 1) };
}

/** Every so often a ready line's stick knocks twice toward the water; held still under reduced motion. */
const NOD_EVERY = 5.5;
const NOD_SEC = 0.5;
const NOD = 0.06;

/** The stick's nod about its foot (radians toward the water) at `time` seconds. */
export function stakeNod(time: number, still: boolean): number {
  if (still) return 0;
  const into = time % NOD_EVERY;
  return into > NOD_SEC ? 0 : NOD * Math.abs(Math.sin((2 * Math.PI * into) / NOD_SEC));
}
