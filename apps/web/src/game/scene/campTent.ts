import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason } from "@stillwater/shared";

/**
 * Campers' tent pitched on the far bank west of the cabin from spring to fall. By day it is just
 * an orange tent with its flap open; from dusk a lantern inside lights it up, so it glows across
 * the water, its light flickering a little, and it is still on, dimmer, at dawn. Pure in time.
 */

/** Where round the shore rings it stands (the shape's +y is the world's -z) and how far back from the water. */
const TENT_ANGLE = 2.18;
const TENT_OUT = 2.6;

function tentSpot() {
  const edge = lakeEdge(TENT_ANGLE);
  return { x: Math.cos(TENT_ANGLE) * (LAKE_RX * edge + TENT_OUT), z: LAKE_CENTER_Z - Math.sin(TENT_ANGLE) * (LAKE_RZ * edge + TENT_OUT) };
}

export const TENT_AT = tentSpot();
/** Its door faces the middle of the lake. */
export const TENT_YAW = Math.atan2(0 - TENT_AT.x, LAKE_CENTER_Z - TENT_AT.z);

/** Pitched from spring to fall; nobody camps out in winter. */
export function tentPitched(season: LakeSeason) {
  return season !== "winter";
}

/** How brightly the lantern lights the tent, 0 by day to 1 at night, flickering a little. `still` holds it steady. */
export function tentGlow(hour: LakeHour, time: number, still = false) {
  const base = hour === "night" ? 1 : hour === "dusk" ? 0.75 : hour === "dawn" ? 0.35 : 0;
  if (base === 0 || still) return base;
  const flicker = 0.05 * Math.sin(time * 7.3) + 0.03 * Math.sin(time * 13.1 + 1) + 0.02 * Math.sin(time * 2.1);
  return base * (0.92 + flicker);
}
