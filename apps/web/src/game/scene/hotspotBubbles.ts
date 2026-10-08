import { spotAt, walkableAt } from "@stillwater/shared";
import * as THREE from "three";
import { HOTSPOT_RADIUS, type Hotspot } from "../hotspot";
import type { WeatherLook } from "./LakeWorld";
import { waterHeight } from "./water";

export const HOTSPOT_BUBBLES = 14;
/** Seconds from a bead surfacing to its ring opening out and the slot resting. */
export const BUBBLE_CYCLE_SEC = 1.9;
/** Beads and rings stay small: the patch reads from the cluster, not from any one splash. */
export const BUBBLE_BEAD_MAX = 0.06;
export const BUBBLE_RING_MAX = 0.3;
/** Meters above the chop, the same as the rain rings, so the water mesh never swallows them. */
export const BUBBLE_LIFT = 0.06;
/** Hour light kept at night, where the rain's own dimming would sink the bubbles into dark water. */
export const BUBBLE_NIGHT_LIGHT = 0.5;

const BEAD_END = 0.45;
const RING_END = 0.85;
const GOLDEN = 0.618034;
const FOAM = "#eef8f4";

export type HotspotBubble = { x: number; y: number; z: number; kind: "bead" | "ring"; size: number };

function frac(value: number) {
  return value - Math.floor(value);
}

/** A bead that grows on the chop, then pops into a ring. Null while resting, or off the patch's bank water. */
export function hotspotBubble(hotspot: Hotspot, index: number, time: number): HotspotBubble | null {
  const i = ((index % HOTSPOT_BUBBLES) + HOTSPOT_BUBBLES) % HOTSPOT_BUBBLES;
  const t = time / BUBBLE_CYCLE_SEC + frac(i * GOLDEN);
  const round = Math.floor(t);
  const u = t - round;
  if (u >= RING_END) return null;
  // Each round surfaces somewhere new, spread evenly over the patch.
  const reach = HOTSPOT_RADIUS * 0.9 * Math.sqrt(frac((i + 0.5) / HOTSPOT_BUBBLES + round * GOLDEN));
  const angle = i * 2.39996 + round * 1.7;
  const x = hotspot.x + Math.cos(angle) * reach;
  const z = hotspot.z + Math.sin(angle) * reach;
  if (spotAt(x, z) !== hotspot.spot || walkableAt(x, z)) return null;
  const y = waterHeight(x, z, time) + BUBBLE_LIFT;
  if (u < BEAD_END) return { x, y, z, kind: "bead", size: BUBBLE_BEAD_MAX * (0.4 + 0.6 * (u / BEAD_END)) };
  const open = (u - BEAD_END) / (RING_END - BEAD_END);
  return { x, y, z, kind: "ring", size: BUBBLE_BEAD_MAX + open * (BUBBLE_RING_MAX - BUBBLE_BEAD_MAX) };
}

/** Unlit foam, tinted by the weather's sky light and dimmed with the hour like the rain, with a night floor. */
export function bubbleColor(weather: WeatherLook): string {
  const light = Math.min(1, Math.max(BUBBLE_NIGHT_LIGHT, weather.rainLight));
  const foam = new THREE.Color(FOAM).lerp(new THREE.Color(weather.hemiSky), 0.3).multiplyScalar(light);
  return `#${foam.getHexString()}`;
}
