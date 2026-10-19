import { WIND_DRIFT, type LakeSeason } from "@stillwater/shared";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";

/**
 * The angler's winter scarf, knitted to match the dock dog's jumper: a red wrap round the neck with
 * cream stripes, its two fringed ends hanging down the back and lifting and swinging in the wind.
 */

const WOOL = "#b8322c";
const STRIPE = "#efe9df";

/** Winter, when the angler wears the scarf and the dock dog its matching jumper. */
export function knitsOut(season: LakeSeason) {
  return season === "winter";
}

/** Where the wrap sits in the torso bone's frame, round the neck, and where the ends hang from at the back. */
export const SCARF_NECK: readonly [number, number, number] = [0, 0.215, -0.01];
export const SCARF_KNOT: readonly [number, number, number] = [0.05, 0.215, -0.14];

/** The wrap round the neck: a thick red ring with two cream stripes. */
export function scarfWrapShape() {
  return mergePainted([
    { geometry: new THREE.TorusGeometry(1, 0.32, 8, 20), rotation: [Math.PI / 2, 0, 0], scale: [0.155, 0.13, 0.15], color: WOOL },
    ...[-0.022, 0.022].map((y) => ({ geometry: new THREE.TorusGeometry(1, 0.06, 5, 20), position: [0, y, 0] as const, rotation: [Math.PI / 2, 0, 0] as const, scale: [0.198, 0.165, 0.193] as const, color: STRIPE })),
  ]);
}

/** One end hanging down from its top along -y: red with cream bands and a cream fringe. */
export function scarfEndShape(length: number) {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.075, length, 0.022), position: [0, -length / 2, 0], color: WOOL },
    ...[0.3, 0.55].map((k) => ({ geometry: new THREE.BoxGeometry(0.08, 0.018, 0.03), position: [0, -length * k, 0] as const, color: STRIPE })),
    { geometry: new THREE.BoxGeometry(0.07, 0.03, 0.016), position: [0, -length - 0.015, 0], color: STRIPE },
  ]);
}

export const SCARF_ENDS: readonly { x: number; length: number; phase: number }[] = [
  { x: -0.025, length: 0.26, phase: 0 },
  { x: 0.03, length: 0.21, phase: 1.7 },
];

/**
 * How far end `i` swings out from the back (`lift`, radians about x) and to the side (`swing`, about z)
 * at `time`, in a wind drifting the water at `local` m/s turned into the torso's frame (+z its front):
 * hanging nearly still in a calm; on a strong day streaming out behind when the wind is at the
 * angler's face, off to the side across it, and flapping against the back when it blows from behind.
 */
export function scarfSway(i: number, time: number, local: { x: number; z: number }) {
  const end = SCARF_ENDS[i]!;
  const speed = Math.hypot(local.x, local.z);
  const blow = Math.min(1, speed / WIND_DRIFT.strong);
  const back = speed > 0 ? Math.max(0, -local.z / speed) : 0;
  const side = speed > 0 ? local.x / speed : 0;
  const flap = Math.sin(time * (1.6 + 5 * blow) + end.phase) + 0.4 * Math.sin(time * (3.1 + 7 * blow) + end.phase * 2);
  return {
    lift: 0.08 + 0.75 * blow * back + (0.05 + 0.15 * blow) * flap,
    swing: 0.6 * blow * side + (0.06 + 0.2 * blow) * Math.sin(time * (1.1 + 3 * blow) + end.phase + 0.6),
  };
}
