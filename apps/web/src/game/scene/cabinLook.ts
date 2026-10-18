import { LAKE_CENTER_Z, type LakeHour, type LakeSeason } from "@stillwater/shared";

/** A log cabin on the far bank, at the foot of the middle hill, looking out over the lake. */
export const CABIN_AT = { x: -10, z: -17.8 };
/** It faces the middle of the lake. */
export const CABIN_YAW = Math.atan2(0 - CABIN_AT.x, LAKE_CENTER_Z - CABIN_AT.z);
/** Drawn larger than life, as the shore trees are, so it reads from across the water. */
export const CABIN_SCALE = 1.25;
/** The cabin's walls (width along its front, depth, height to the eaves) and the roof's rise, before scaling, in metres. */
export const CABIN_WALLS = { width: 2.6, depth: 2, height: 1.5, roof: 0.9 };
/** How far the roof overhangs the walls, before scaling. */
export const CABIN_OVERHANG = 0.18;
/** Where the chimney stands on the cabin, before scaling: toward one gable, and how high its top is. */
export const CHIMNEY = { x: -0.85, z: -0.35, top: 3 };

/** Someone is in: the windows glow from dusk through the night. */
export function cabinWindowsLit(hour: LakeHour) {
  return hour === "dusk" || hour === "night";
}

/** The stove is going all through the cold months, and in spring on the chilly ends of the day. */
export function chimneySmoking(hour: LakeHour, season: LakeSeason) {
  if (season === "fall" || season === "winter") return true;
  return season === "spring" && hour !== "day";
}

/** Where the chimney's top is in the world, for the smoke to rise from. */
export function chimneyTop() {
  const cos = Math.cos(CABIN_YAW);
  const sin = Math.sin(CABIN_YAW);
  const x = CHIMNEY.x * CABIN_SCALE;
  const z = CHIMNEY.z * CABIN_SCALE;
  return { x: CABIN_AT.x + x * cos + z * sin, y: CHIMNEY.top * CABIN_SCALE, z: CABIN_AT.z - x * sin + z * cos };
}
