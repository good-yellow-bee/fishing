import { canUseSpot, castRangeMultiplier, SPOT_LABELS } from "./progression.ts";
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

/** bridge_wood.glb ×1.8, rot Y π/2, two spans. Plank top is model y 0.15. Post caps at 0.63 are not the deck. */
export const DOCK_PLANKS = { minX: -0.72, maxX: 0.72, minZ: 5.49, maxZ: 8.16, top: 0.27 };

/** Centered on the planks, facing the lake. */
export const DOCK_STAND_X = 0;
export const DOCK_STAND_Z = 6.8;
export const REEDS_PAD: Pad = { x: -12.3, z: 9.5, r: 3.2 };
export const DROPOFF_PAD: Pad = { x: 15.4, z: 7.8, r: 3.2 };

/** Open bank between the reeds and the dock. Feet stay on shore, east of the reeds. */
export const POINT_PAD: Pad = { x: -5.6, z: 12.2, r: 1.35 };
/** Near-shore water in front of that bank. East of this stays dock water. */
export const POINT_MAX_X = -3.5;
export const POINT_MIN_Z = 0;

export const STANCE_LABELS: Record<StanceId, string> = {
  shop: "Shop",
  trail: "Path",
  ...SPOT_LABELS,
};

const FISHING_PADS: readonly [SpotId, Pad][] = [
  ["dock", DOCK_PAD],
  ["reeds", REEDS_PAD],
  ["dropoff", DROPOFF_PAD],
  ["point", POINT_PAD],
];

export type Landing =
  | { ok: true; spot: SpotId }
  | { ok: false; reason: "shore" | "locked" };

export type CastFail = "shore" | "locked" | "range" | "stance" | "basin";
export type CastResult = { ok: true; spot: SpotId } | { ok: false; reason: CastFail };

type Aabb = { minX: number; maxX: number; minZ: number; maxZ: number; water?: boolean };

const WALK: Aabb[] = [
  { minX: 1.5, maxX: 9, minZ: 12.2, maxZ: 18.2 },
  // Planks, then the path boards. The two narrow joins only bridge the gaps between meshes.
  { minX: -0.55, maxX: 0.55, minZ: 5.65, maxZ: 8.15, water: true },
  { minX: -0.28, maxX: 0.28, minZ: 8.0, maxZ: 9.85, water: true },
  { minX: -0.15, maxX: 0.28, minZ: 9.7, maxZ: 10.55, water: true },
  { minX: 0.05, maxX: 1.18, minZ: 10.18, maxZ: 10.58, water: true },
  { minX: 0.98, maxX: 1.32, minZ: 10.4, maxZ: 11.48, water: true },
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
  if (x <= POINT_MAX_X && z >= POINT_MIN_Z) return "point";
  return "dock";
}

export function isFishingStance(stance: StanceId): stance is SpotId {
  return stance === "dock" || stance === "reeds" || stance === "dropoff" || stance === "point";
}

export function inCastRange(fromX: number, fromZ: number, toX: number, toZ: number, level = 1) {
  return inRadius(fromX, fromZ, toX, toZ, CAST_RANGE * castRangeMultiplier(level));
}

export function onDockPlanks(x: number, z: number) {
  return (
    x >= DOCK_PLANKS.minX &&
    x <= DOCK_PLANKS.maxX &&
    z >= DOCK_PLANKS.minZ &&
    z <= DOCK_PLANKS.maxZ
  );
}

/** Deck height on the planks. Ground level everywhere else. */
export function footHeight(x: number, z: number) {
  return onDockPlanks(x, z) ? DOCK_PLANKS.top : 0;
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
  if (raw === "dock" || raw === "reeds" || raw === "dropoff" || raw === "point" || raw === "shop" || raw === "trail") return raw;
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
  if (!inCastRange(fromX, fromZ, aimX, aimZ, level)) return { ok: false, reason: "range" };
  if (water !== stance) return { ok: false, reason: "basin" };
  if (!canUseSpot(stance, level)) return { ok: false, reason: "locked" };
  return { ok: true, spot: stance };
}
