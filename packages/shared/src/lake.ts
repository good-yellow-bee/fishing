import { canUseSpot } from "./progression.ts";
import type { SpotId } from "./types.ts";

export const LAKE_CENTER_Z = -2;
export const LAKE_RX = 22.5;
export const LAKE_RZ = 14.5;

export const REEDS_MAX_X = -7;

export type Landing =
  | { ok: true; spot: SpotId }
  | { ok: false; reason: "shore" | "locked" };

export function lakeEdge(angle: number) {
  return 1 + Math.sin(angle * 3) * 0.025 + Math.sin(angle * 7 + 0.7) * 0.018;
}

export function inLake(x: number, z: number) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) <= lakeEdge(Math.atan2(nz, nx)) * 0.96;
}

export function spotAt(x: number, z: number): SpotId | null {
  if (!inLake(x, z)) return null;
  if (x <= REEDS_MAX_X) return "reeds";
  if (z <= LAKE_CENTER_Z) return "dropoff";
  return "dock";
}

export function parseAim(raw: string | undefined): { x: number; z: number } | null {
  if (!raw || raw === "none") return null;
  const comma = raw.indexOf(",");
  if (comma < 0) return null;
  const x = Number(raw.slice(0, comma));
  const z = Number(raw.slice(comma + 1));
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  return { x, z };
}

export function resolveLanding(x: number, z: number, level: number): Landing {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return { ok: false, reason: "shore" };
  const spot = spotAt(x, z);
  if (!spot) return { ok: false, reason: "shore" };
  if (!canUseSpot(spot, level)) return { ok: false, reason: "locked" };
  return { ok: true, spot };
}
