import { foamLanes } from "./scene/foamLanesPlan";

/** How near a foam lane (metres from its traced line) a lure must land to sit in it. */
export const FOAM_REACH = 0.7;
/** The wind gathers drowned insects and scum into its foam lanes and the fish feed along them, so a lure landing in one bites sooner. */
export const FOAM_LANE_WAIT = 0.85;

let traced: { key: string; points: readonly { x: number; z: number }[] } | null = null;

/** Every point of the day's foam lanes, traced once per wind. */
function lanePoints(wind: { x: number; z: number }) {
  const key = `${wind.x},${wind.z}`;
  if (traced?.key !== key) traced = { key, points: foamLanes(wind).flatMap((dash) => dash.points) };
  return traced.points;
}

/** Whether a lure landing at (x, z) sits in one of the foam lanes the day's wind (the scene's drift) has combed across the open water. */
export function onFoamLane(wind: { x: number; z: number } | undefined, x: number, z: number) {
  if (!wind) return false;
  return lanePoints(wind).some((point) => Math.hypot(point.x - x, point.z - z) <= FOAM_REACH);
}
