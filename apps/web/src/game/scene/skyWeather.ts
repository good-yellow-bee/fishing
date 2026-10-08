import { inLake, LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, onDockPlanks, walkableAt } from "@stillwater/shared";
import { waterHeight } from "./water";

export const RAIN_SKY_TOP = 9.2;
export const RAIN_FALL_SEC = 0.95;
export const RAIN_RIPPLE_SEC = 0.62;
export const RAIN_STREAK_LENGTH = 1.3;
/** Meters a splash ring rides above the chop. */
export const RAIN_RIPPLE_LIFT = 0.06;

const CYCLE = RAIN_FALL_SEC + RAIN_RIPPLE_SEC;
const STEP_X = 2.7;
const STEP_Z = 2.6;

export type RainColumn = { x: number; z: number; phase: number };
export type RainStreak = { x: number; y: number; z: number; length: number };
export type RainRipple = { x: number; y: number; z: number; radius: number; open: number };

/** Every bank's water gets the same shower, so rain falls around the bobber wherever the angler casts. */
const COLUMNS: RainColumn[] = [0, 1].flatMap((layer) => {
  const sheet: { x: number; z: number }[] = [];
  // The second sheet is shifted half a step so rings do not stack.
  for (let x = -LAKE_RX + layer * STEP_X * 0.5; x <= LAKE_RX; x += STEP_X) {
    for (let z = LAKE_CENTER_Z - LAKE_RZ + layer * STEP_Z * 0.5; z <= LAKE_CENTER_Z + LAKE_RZ; z += STEP_Z) {
      if (inLake(x, z) && !onDockPlanks(x, z) && !walkableAt(x, z)) sheet.push({ x, z });
    }
  }
  return sheet.map((place, slot) => ({ ...place, phase: (slot * 0.381 + layer * 0.5) % 1 }));
});

/** Drops in the air at once. Two sheets share the basin so the shower stays thick. */
export const RAIN_COUNT = COLUMNS.length;

/** Fixed landing for one drop. */
export function rainColumn(index: number): RainColumn {
  return COLUMNS[((index % RAIN_COUNT) + RAIN_COUNT) % RAIN_COUNT]!;
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
