import { canUseSpot, SPOT_LABELS } from "./progression.ts";
import type { SpotId } from "./types.ts";

export const LAKE_CENTER_Z = -2;
export const LAKE_RX = 22.5;
export const LAKE_RZ = 14.5;

export const REEDS_MAX_X = -7;
export const CAST_RANGE = 11;

export const SHOP_X = 5.2;
export const SHOP_Z = 15.4;
export const SHOP_RADIUS = 3.2;
export const SPAWN_X = 5;
export const SPAWN_Z = 15.2;

export type StanceId = SpotId | "shop" | "trail";

export type Pad = { x: number; z: number; r: number };

export const DOCK_PAD: Pad = { x: 0.15, z: 7.42, r: 3.4 };
export const REEDS_PAD: Pad = { x: -12.3, z: 9.5, r: 3.2 };
export const DROPOFF_PAD: Pad = { x: 15.4, z: 7.8, r: 3.2 };

export const STANCE_LABELS: Record<StanceId, string> = {
  shop: "Shop",
  trail: "Path",
  ...SPOT_LABELS,
};

const FISHING_PADS: readonly [SpotId, Pad][] = [
  ["dock", DOCK_PAD],
  ["reeds", REEDS_PAD],
  ["dropoff", DROPOFF_PAD],
];

export type Landing =
  | { ok: true; spot: SpotId }
  | { ok: false; reason: "shore" | "locked" };

export type CastFail = "shore" | "locked" | "range" | "stance" | "basin";
export type CastResult = { ok: true; spot: SpotId } | { ok: false; reason: CastFail };

type Aabb = { minX: number; maxX: number; minZ: number; maxZ: number; water?: boolean };

const WALK: Aabb[] = [
  { minX: 1.5, maxX: 9, minZ: 12.2, maxZ: 18.2 },
  { minX: -2.6, maxX: 2.6, minZ: 5.6, maxZ: 13.2, water: true },
  { minX: -14.8, maxX: 16.8, minZ: 11.4, maxZ: 16.5 },
  { minX: -15.2, maxX: -8.5, minZ: 8.2, maxZ: 12.4 },
  { minX: 11.5, maxX: 17.6, minZ: 6.4, maxZ: 12.4 },
  { minX: -4, maxX: 8, minZ: 9.5, maxZ: 13.5 },
];

function inAabb(x: number, z: number, box: Aabb) {
  return x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;
}

function distSq(ax: number, az: number, bx: number, bz: number) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

function inRadius(x: number, z: number, cx: number, cz: number, r: number) {
  return distSq(x, z, cx, cz) <= r * r;
}

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

export function isFishingStance(stance: StanceId): stance is SpotId {
  return stance === "dock" || stance === "reeds" || stance === "dropoff";
}

export function inCastRange(fromX: number, fromZ: number, toX: number, toZ: number) {
  return inRadius(fromX, fromZ, toX, toZ, CAST_RANGE);
}

export function walkableAt(x: number, z: number) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const wet = inLake(x, z);
  return WALK.some((box) => inAabb(x, z, box) && (box.water || !wet));
}

export function stanceAt(x: number, z: number): StanceId {
  if (inRadius(x, z, SHOP_X, SHOP_Z, SHOP_RADIUS)) return "shop";
  let best: { id: SpotId; d: number } | null = null;
  for (const [id, pad] of FISHING_PADS) {
    const d = distSq(x, z, pad.x, pad.z);
    if (d <= pad.r * pad.r && (!best || d < best.d)) best = { id, d };
  }
  return best?.id ?? "trail";
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

export function parseStance(raw: string | undefined): StanceId | null {
  if (raw === "dock" || raw === "reeds" || raw === "dropoff" || raw === "shop" || raw === "trail") return raw;
  return null;
}

export function resolveLanding(x: number, z: number, level: number): Landing {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return { ok: false, reason: "shore" };
  const spot = spotAt(x, z);
  if (!spot) return { ok: false, reason: "shore" };
  if (!canUseSpot(spot, level)) return { ok: false, reason: "locked" };
  return { ok: true, spot };
}

export function resolveCast(
  aimX: number,
  aimZ: number,
  stance: StanceId,
  level: number,
  fromX: number,
  fromZ: number,
): CastResult {
  if (!isFishingStance(stance)) return { ok: false, reason: "stance" };
  if (!Number.isFinite(aimX) || !Number.isFinite(aimZ)) return { ok: false, reason: "shore" };
  const water = spotAt(aimX, aimZ);
  if (!water) return { ok: false, reason: "shore" };
  if (!inCastRange(fromX, fromZ, aimX, aimZ)) return { ok: false, reason: "range" };
  if (water !== stance) return { ok: false, reason: "basin" };
  if (!canUseSpot(stance, level)) return { ok: false, reason: "locked" };
  return { ok: true, spot: stance };
}
