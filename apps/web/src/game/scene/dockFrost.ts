import { DOCK_PLANKS, type LakeHour, type LakeSeason, type Sky as WeatherSky } from "@stillwater/shared";
import { APPROACH, PIER_TOP, type DeckRect } from "./pierDeck";

/** The colour of hoar frost on wood. */
export const FROST_COLOR = "#e4edf3";
/** How far the frost pales the walkway's planks at its thickest. */
export const FROST_PALE = 0.5;
/** Crystals scattered over the frost, catching the low sun. */
export const FROST_SPECKS = 900;

/**
 * How thick the hoar frost lies on the dock: only at dawn after a clear, cold night, heaviest in
 * fall and lighter on a spring morning. Cloud keeps the night warm; winter has its snow instead.
 */
export function dockFrost(hour: LakeHour, season: LakeSeason, sky: WeatherSky) {
  if (hour !== "dawn" || (sky !== "clear" && sky !== "partly-cloudy")) return 0;
  if (season === "fall") return 1;
  return season === "spring" ? 0.6 : 0;
}

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

type Print = { x: number; z: number; yaw: number };

/** The angler's trail out along the walkway, boots either side of its middle, toe toward the lake. */
const WALK_PRINTS: Print[] = Array.from({ length: 6 }, (_, i) => ({
  x: (i % 2 ? 0.09 : -0.09) + (seeded(i, 7) - 0.5) * 0.04,
  z: 9.7 - i * 0.29,
  yaw: (seeded(i, 8) - 0.5) * 0.2,
}));

/** A frosted surface: where it lies, how high its top is, and the prints trodden through it. */
export type FrostSheet = { rect: DeckRect; top: number; prints: readonly Print[] };

/**
 * The straight run of walkway out to the dock, under the camera's eye, from where the dock's own
 * pale planks end. The rest of the walk's boards only pale (FROST_PALE).
 */
export const FROST_SHEETS: readonly FrostSheet[] = [{ rect: { ...APPROACH[0]!, minZ: DOCK_PLANKS.maxZ }, top: PIER_TOP, prints: WALK_PRINTS }];

/** A spot on a sheet as 0..1 across (x) and along (z) it. */
export function sheetUv(rect: DeckRect, x: number, z: number) {
  return { u: (x - rect.minX) / (rect.maxX - rect.minX), v: (z - rect.minZ) / (rect.maxZ - rect.minZ) };
}

/** The frost's sparkling crystals, spread evenly over a sheet. */
export function frostSpecks(count = FROST_SPECKS) {
  return Array.from({ length: count }, (_, i) => ({ u: seeded(i, 1), v: seeded(i, 2), size: 0.004 + seeded(i, 3) * 0.008, alpha: 0.4 + seeded(i, 4) * 0.6 }));
}

/** Where the angler's boots have melted a sheet's frost back to bare wood. */
export function frostPrints(sheet: FrostSheet) {
  return sheet.prints.map((print) => ({ ...sheetUv(sheet.rect, print.x, print.z), yaw: print.yaw }));
}
