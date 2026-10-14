import type { LakeHour, LakeSeason } from "@stillwater/shared";
import { DOCK_PLANKS } from "@stillwater/shared";
import { DOCK_POST_CAPS } from "./snowyDock";

/** Spokes and turns of the spiral, and the web's radius in metres. */
export const WEB_SPOKES = 9;
export const WEB_TURNS = 5;
export const WEB_RADIUS = 0.18;

/** The front-right post, on the lake side of the dock. */
const FRONT_POST = DOCK_POST_CAPS.reduce((best, cap) => (cap.z < best.z || (cap.z === best.z && cap.x > best.x) ? cap : best));

/** Strung in the corner by the front-right post, facing back up the dock where the camera looks from. */
export const WEB_CENTER = {
  x: FRONT_POST.x - FRONT_POST.size / 2 - WEB_RADIUS,
  y: DOCK_PLANKS.top + WEB_RADIUS + 0.04,
  z: FRONT_POST.z,
};

/** Dew shows at dawn, outside winter. */
export function dewWebOut(hour: LakeHour, season: LakeSeason) {
  return hour === "dawn" && season !== "winter";
}

type Point = [number, number];

/** The web's threads as flat pairs of points in its own plane: spokes from the hub, then the spiral's straight runs between spokes. */
export function webThreads(): Point[] {
  const segments: Point[] = [];
  const spoke = (i: number) => (i / WEB_SPOKES) * Math.PI * 2 + 0.2;
  for (let i = 0; i < WEB_SPOKES; i++) {
    segments.push([0, 0], [Math.cos(spoke(i)) * WEB_RADIUS, Math.sin(spoke(i)) * WEB_RADIUS]);
  }
  const steps = WEB_TURNS * WEB_SPOKES;
  for (let k = 0; k < steps; k++) {
    const r0 = WEB_RADIUS * (0.2 + (0.75 * k) / steps);
    const r1 = WEB_RADIUS * (0.2 + (0.75 * (k + 1)) / steps);
    segments.push(
      [Math.cos(spoke(k)) * r0, Math.sin(spoke(k)) * r0],
      [Math.cos(spoke(k + 1)) * r1, Math.sin(spoke(k + 1)) * r1],
    );
  }
  return segments;
}

/** Dew beads: one where the spiral crosses each spoke, in the web's plane. */
export function webDew(): Point[] {
  const steps = WEB_TURNS * WEB_SPOKES;
  return Array.from({ length: steps }, (_, k) => {
    const r = WEB_RADIUS * (0.2 + (0.75 * k) / steps);
    const a = (k / WEB_SPOKES) * Math.PI * 2 + 0.2;
    return [Math.cos(a) * r, Math.sin(a) * r] as Point;
  });
}
