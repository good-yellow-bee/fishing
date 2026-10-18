import type { LakeHour, LakeSeason } from "@stillwater/shared";
import { CABIN_OVERHANG, CABIN_WALLS } from "./cabinLook";

/**
 * A string of coloured bulbs along the far cabin's front eave in winter, lit from dusk through the
 * night: the wire droops in swags between its hooks, and the four colours glow up and fade in turn
 * so the string seems to twinkle across the snow. Positions are in the cabin's own frame before
 * scaling (x along the front, z out from its middle, y up). Pure in time.
 */

type Point = { x: number; y: number; z: number };

/** The bulbs' colours, in the order they repeat along the string. */
export const BULB_COLORS = ["#ff4a3d", "#3dd06a", "#ffc93d", "#4a8cff"] as const;
/** Hooks under the eave, the swags between them, and bulbs along each swag. */
const SWAGS = 5;
const BULBS_PER_SWAG = 4;
export const BULB_COUNT = SWAGS * BULBS_PER_SWAG + 1;
/** How far each swag sags in its middle, and how far under the eave the hooks are. */
const SAG = 0.1;
const HOOK_DROP = 0.03;
/** One round of the twinkle, all four colours glowing up in turn, and how dim a colour gets. */
export const TWINKLE_SEC = 4.8;
const DIM = 0.3;

/** Up in winter from dusk through the night. */
export function eaveLightsOn(hour: LakeHour, season: LakeSeason) {
  return season === "winter" && (hour === "dusk" || hour === "night");
}

const { width: W, depth: D, height: H, roof: R } = CABIN_WALLS;
/** The front eave: the roof's lower edge, out past the wall by the overhang. */
const EAVE_Z = D / 2 + CABIN_OVERHANG - 0.04;
const EAVE_Y = H + R - (R / (D / 2)) * (D / 2 + CABIN_OVERHANG);
const FROM_X = -W / 2 - CABIN_OVERHANG + 0.08;
const TO_X = W / 2 + CABIN_OVERHANG - 0.08;

/** A point on the wire, 0 at one end of the eave and 1 at the other, sagging between the hooks. */
export function wireAt(u: number): Point {
  const along = Math.min(1, Math.max(0, u)) * SWAGS;
  const inSwag = along - Math.min(SWAGS - 1, Math.floor(along));
  return { x: FROM_X + (TO_X - FROM_X) * (along / SWAGS), y: EAVE_Y - HOOK_DROP - SAG * 4 * inSwag * (1 - inSwag), z: EAVE_Z };
}

/** Where bulb `index` hangs, just under the wire, and which colour it is. */
export function bulbAt(index: number): Point & { color: number } {
  const onWire = wireAt(index / (BULB_COUNT - 1));
  return { x: onWire.x, y: onWire.y - 0.035, z: onWire.z, color: index % BULB_COLORS.length };
}

/** How bright colour `color` glows `time` seconds in, from DIM to 1. `still` keeps every bulb full. */
export function bulbGlow(color: number, time: number, still = false) {
  if (still) return 1;
  const phase = time / TWINKLE_SEC - color / BULB_COLORS.length;
  return DIM + (1 - DIM) * (0.5 + 0.5 * Math.cos(phase * Math.PI * 2));
}
