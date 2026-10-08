import { waterHeight } from "./water";

/** Drops in the air at once. Two sheets share the basin so the shower stays thick. */
export const RAIN_COUNT = 128;
export const RAIN_SKY_TOP = 9.2;
export const RAIN_FALL_SEC = 0.95;
export const RAIN_RIPPLE_SEC = 0.62;
export const RAIN_STREAK_LENGTH = 1.3;
/** Meters a splash ring rides above the chop. */
export const RAIN_RIPPLE_LIFT = 0.06;

const PLACES = 64;
const CYCLE = RAIN_FALL_SEC + RAIN_RIPPLE_SEC;
const XS = [-10.4, -7.5, -4.8, -2.2, 2.2, 4.8, 7.5, 10.4] as const;
const ZS = [-12.6, -9.8, -7.1, -4.5, -1.9, 0.5, 2.7, 4.6] as const;

export type RainColumn = { x: number; z: number; phase: number };
export type RainStreak = { x: number; y: number; z: number; length: number };
export type RainRipple = { x: number; y: number; z: number; radius: number; open: number };

/** Fixed landing for one drop. The second sheet is shifted so rings do not stack. */
export function rainColumn(index: number): RainColumn {
  const slot = ((index % PLACES) + PLACES) % PLACES;
  const layer = Math.floor(index / PLACES) % 2;
  const col = slot % XS.length;
  const row = Math.floor(slot / XS.length);
  return {
    x: XS[col]! + layer * 1.35,
    z: ZS[row]! + layer * 1.1,
    phase: (slot * 0.381 + layer * 0.5) % 1,
  };
}

function cycleU(index: number, time: number) {
  const u = (time / CYCLE + rainColumn(index).phase) % 1;
  return u < 0 ? u + 1 : u;
}

/** Streak falling through the sky. Null once it has hit and the ring takes over. */
export function rainStreak(index: number, time: number): RainStreak | null {
  const column = rainColumn(index);
  const u = cycleU(index, time);
  const fall = RAIN_FALL_SEC / CYCLE;
  if (u >= fall) return null;
  const head = RAIN_SKY_TOP * (1 - u / fall);
  return {
    x: column.x,
    y: head - RAIN_STREAK_LENGTH * 0.5,
    z: column.z,
    length: RAIN_STREAK_LENGTH,
  };
}

/** Ring on the chop after that drop lands. Grows until the next fall starts. */
export function rainRipple(index: number, time: number): RainRipple | null {
  const column = rainColumn(index);
  const u = cycleU(index, time);
  const fall = RAIN_FALL_SEC / CYCLE;
  if (u < fall) return null;
  const open = (u - fall) / (1 - fall);
  return {
    x: column.x,
    y: waterHeight(column.x, column.z, time) + RAIN_RIPPLE_LIFT,
    z: column.z,
    radius: 0.14 + open * 0.75,
    open,
  };
}
