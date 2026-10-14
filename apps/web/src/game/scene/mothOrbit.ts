import type { LakeHour, LakeSeason } from "@stillwater/shared";
import { LANTERNS, lanternLevel } from "./lanternLight";

/**
 * Moths round the lit lanterns: a few pale moths circle each lantern that casts
 * light, in quick, jittery loops that wander in and out. Pure functions of time.
 */
export const MOTHS_PER_LANTERN = 3;
/** The lanterns that draw them: the ones on the dock posts and by the shack. */
export const MOTH_LAMPS = LANTERNS.filter((lantern) => lantern.casts);
export const MOTH_COUNT = MOTH_LAMPS.length * MOTHS_PER_LANTERN;
/** Their loops round the flame, metres. */
const NEAR = 0.12;
const FAR = 0.38;

export function mothsOut(hour: LakeHour, season: LakeSeason) {
  return lanternLevel(hour) > 0 && season !== "winter";
}

function unit(i: number, salt: number) {
  const s = Math.sin(i * 23.9 + salt * 71.3) * 43758.5453;
  return s - Math.floor(s);
}

export type Moth = { x: number; y: number; z: number; flap: number };

/** Moth `i` at `time`, and its wings' beat (0 shut, 1 open). */
export function mothAt(i: number, time: number): Moth {
  const lamp = MOTH_LAMPS[Math.floor(i / MOTHS_PER_LANTERN) % MOTH_LAMPS.length]!;
  const speed = (2.2 + unit(i, 1) * 1.6) * (unit(i, 2) < 0.5 ? 1 : -1);
  const phase = unit(i, 3) * Math.PI * 2;
  // The loop swells and shrinks, and a fast wobble on top gives the jitter.
  const reach = NEAR + (FAR - NEAR) * (0.5 + 0.5 * Math.sin(time * (0.7 + unit(i, 4)) + phase));
  const angle = time * speed + phase + 0.35 * Math.sin(time * 11 + phase);
  return {
    x: lamp.x + Math.cos(angle) * reach,
    y: lamp.y + 0.12 + 0.14 * Math.sin(time * (1.9 + unit(i, 5)) + phase) + 0.03 * Math.sin(time * 17 + i),
    z: lamp.z + Math.sin(angle) * reach,
    flap: 0.5 + 0.5 * Math.sin(time * (28 + unit(i, 6) * 8) + phase),
  };
}
