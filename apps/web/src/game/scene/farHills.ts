import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";
import { seasonGroundColor } from "./seasonLook";

/** The three hills behind the far shore: centre and radii of each icosphere, and their day and night greens. */
export const FAR_HILLS: { position: [number, number, number]; scale: [number, number, number]; day: string; night: string }[] = [
  { position: [-28, 4.5, -26], scale: [17, 7, 10], day: "#587a5f", night: "#3d5a44" },
  { position: [-5, 5.2, -30], scale: [20, 8, 10], day: "#628468", night: "#456348" },
  { position: [20, 4.6, -27], scale: [18, 7, 11], day: "#547459", night: "#385640" },
];

/** How far toward the lake the hills' face comes at `x` and height `y`: the front-most hill surface there, or null off every hill. */
export function hillFront(x: number, y: number): number | null {
  let front: number | null = null;
  for (const { position: [cx, cy, cz], scale: [rx, ry, rz] } of FAR_HILLS) {
    const k = 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2;
    if (k > 0) front = Math.max(front ?? -Infinity, cz + rz * Math.sqrt(k));
  }
  return front;
}

/** Snow lies deep and unbroken on the open hills in winter, whiter than the trodden shore; blue-grey under the night sky. */
const HILL_SNOW = { day: "#bcc8d0", night: "#4f5c68" };
/**
 * Alpenglow: under an open sky the low sun turns the snowy hills rose at dawn and a deeper,
 * duskier pink at sunset (the evening light warms it further); under cloud they only dim to a cold grey.
 */
const HILL_GLOW = { dawn: "#e0b4bf", dusk: "#d4aab6", dull: "#98a4ae" };

/** Whether the sky is open enough at dawn or dusk for the low sun to light the snow. */
export function alpenglowOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return season === "winter" && (hour === "dawn" || hour === "dusk") && (sky === undefined || sky === "clear" || sky === "partly-cloudy");
}

/** A hill's colour for the hour, season and sky. */
export function hillColor(hill: (typeof FAR_HILLS)[number], hour: LakeHour, season: LakeSeason, sky?: Sky) {
  if (season === "winter") {
    if (hour === "night") return HILL_SNOW.night;
    if (hour === "day") return HILL_SNOW.day;
    return alpenglowOut(hour, sky, season) ? HILL_GLOW[hour] : HILL_GLOW.dull;
  }
  return seasonGroundColor(hour === "night" ? hill.night : hill.day, season);
}
