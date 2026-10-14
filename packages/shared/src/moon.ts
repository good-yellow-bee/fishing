import type { LakeHour } from "./hour.ts";
import type { FishSpecies } from "./types.ts";

/** Days from new moon to new moon. */
export const SYNODIC_DAYS = 29.530588853;
/** A known new moon: 6 January 2000, 18:14 UTC. */
const NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);

/** Where the real moon is in its month: 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
export function moonPhase(date: Date = new Date()): number {
  const days = (date.getTime() - NEW_MOON_MS) / 86_400_000;
  const phase = (days / SYNODIC_DAYS) % 1;
  return phase < 0 ? phase + 1 : phase;
}

/** The lit share of the disc, 0 at new moon to 1 at full. */
export function moonLight(phase: number): number {
  return (1 - Math.cos(phase * 2 * Math.PI)) / 2;
}

export type MoonName = "new" | "waxing-crescent" | "first-quarter" | "waxing-gibbous" | "full" | "waning-gibbous" | "last-quarter" | "waning-crescent";

export const MOON_LABELS: Record<MoonName, string> = {
  new: "New moon",
  "waxing-crescent": "Waxing crescent",
  "first-quarter": "First quarter",
  "waxing-gibbous": "Waxing gibbous",
  full: "Full moon",
  "waning-gibbous": "Waning gibbous",
  "last-quarter": "Last quarter",
  "waning-crescent": "Waning crescent",
};

/** The phase's name, with new, quarter and full each holding about a day either side. */
export function moonName(phase: number): MoonName {
  const names: MoonName[] = ["new", "waxing-crescent", "first-quarter", "waxing-gibbous", "full", "waning-gibbous", "last-quarter", "waning-crescent"];
  const near = (at: number) => Math.min(Math.abs(phase - at), Math.abs(phase - at - 1), Math.abs(phase - at + 1)) < 1 / SYNODIC_DAYS;
  for (const [index, at] of [0, 0.25, 0.5, 0.75].entries()) {
    if (near(at)) return names[index * 2]!;
  }
  return names[Math.floor(phase * 4) * 2 + 1]!;
}

/**
 * The lit part of one row of the disc, as [left, right] in -1..1, at height `y` (-1..1). Waxing lights the right side
 * first, waning keeps the left; the terminator is an ellipse across the middle.
 */
export function moonSpan(phase: number, y: number): [number, number] {
  const half = Math.sqrt(Math.max(0, 1 - y * y));
  const edge = half * Math.cos(phase * 2 * Math.PI);
  return phase <= 0.5 ? [edge, half] : [-half, -edge];
}

/** How much brighter a night of this phase lets rare fish come up: none until near full, a little at full. */
export const FULL_MOON_LIFT = 0.15;

export function biteMoonMul(species: FishSpecies, hour: LakeHour, light: number): number {
  if (hour !== "night" || (species.rarity !== "rare" && species.rarity !== "legendary")) return 1;
  return 1 + FULL_MOON_LIFT * Math.max(0, (light - 0.75) / 0.25);
}

/** `?moon=` pins the phase (0..1) for testing, like `?sky=`. */
export function moonFromSearch(search: string): number | null {
  const raw = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("moon");
  if (raw === null || raw.trim() === "") return null;
  const phase = Number(raw);
  return Number.isFinite(phase) && phase >= 0 && phase <= 1 ? phase % 1 : null;
}
