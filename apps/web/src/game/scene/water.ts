import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";

/** 0 on the bank, 1 at the middle of the basin. */
function shoreInland(x: number, z: number) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  const radius = Math.hypot(nx, nz);
  const edge = lakeEdge(Math.atan2(nz, nx)) * 0.96;
  if (edge < 1e-4) return 0;
  return Math.min(1, Math.max(0, 1 - radius / edge));
}

// Chop dies out at the shoreline so the bank seam stays put.
function shoreWeight(x: number, z: number) {
  const fade = Math.min(1, shoreInland(x, z) / 0.2);
  return fade * fade;
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// The dock sits inside the basin, so the radial shelf alone would paint it deep.
function dockShelf(x: number, z: number) {
  const ahead = 6.9 - z;
  if (ahead < -1.6) return 0;
  const d = Math.hypot(x / 6, Math.max(0, ahead) / 7.2);
  if (d >= 1) return 0;
  return smoothstep(0, 1, 1 - d);
}

/** 0 in the shallows by the bank and the dock, 1 offshore. */
export function waterDepth(x: number, z: number) {
  return smoothstep(0.05, 0.58, shoreInland(x, z)) * (1 - dockShelf(x, z));
}

export type WaterRgb = { r: number; g: number; b: number };

const SHALLOW_TINT: WaterRgb = { r: 1.85, g: 1.92, b: 1.42 };
const DEEP_TINT: WaterRgb = { r: 0.22, g: 0.28, b: 0.36 };

function mixTint(shallow: WaterRgb, deep: WaterRgb, t: number): WaterRgb {
  return {
    r: shallow.r + (deep.r - shallow.r) * t,
    g: shallow.g + (deep.g - shallow.g) * t,
    b: shallow.b + (deep.b - shallow.b) * t,
  };
}

/** Vertex-color multiplier. Pale on the shelf, dark in open water. */
export function waterDepthColor(x: number, z: number) {
  return mixTint(SHALLOW_TINT, DEEP_TINT, waterDepth(x, z));
}

const BED_SHALLOW: WaterRgb = { r: 0.74, g: 0.67, b: 0.42 };
const BED_DEEP: WaterRgb = { r: 0.04, g: 0.09, b: 0.12 };

/** Lakebed color. Sand on the shelf, mud offshore. */
export function bedColor(x: number, z: number) {
  return mixTint(BED_SHALLOW, BED_DEEP, waterDepth(x, z));
}

/** World y of the bed. High beside the bank, deep in the middle. */
export function bedHeight(x: number, z: number) {
  return -0.55 - waterDepth(x, z) * 1.9;
}

/** Meters the sitting-bobber ring rides above the chop. */
export const BOBBER_RING_LIFT = 0.03;

/** World y of the ring around a sitting bobber. It follows the chop. */
export function bobberRingHeight(x: number, z: number, time: number) {
  return waterHeight(x, z, time) + BOBBER_RING_LIFT;
}

/** World-space water height. The mean surface stays at y = 0. */
export function waterHeight(x: number, z: number, time: number) {
  const chop =
    Math.sin(x * 0.33 + time * 0.85) * 0.16 +
    Math.sin(z * 0.47 - time * 0.7) * 0.12 +
    Math.sin(x * 0.22 + z * 0.31 + time * 1.15) * 0.08 +
    Math.sin(x * 0.9 - z * 0.62 + time * 1.6) * 0.035;
  return chop * shoreWeight(x, z);
}

const RAY_STEP = 0.2;
const RAY_LIMIT = 80;

function rayClearance(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, t: number, time: number) {
  const x = ox + dx * t;
  const z = oz + dz * t;
  return oy + dy * t - waterHeight(x, z, time);
}

type RayPoint = { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void };

/** First downward hit on the chop, written into `out`. Misses return null. */
export function waterRayHit(
  origin: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
  time: number,
  out: RayPoint,
) {
  const { x: dx, y: dy, z: dz } = direction;
  if (dy >= -1e-4) return null;
  const { x: ox, y: oy, z: oz } = origin;
  const tFar = Math.min(RAY_LIMIT, (-0.55 - oy) / dy);
  if (!(tFar > 0)) return null;
  let prevT = 0;
  let prevC = rayClearance(ox, oy, oz, dx, dy, dz, 0, time);
  if (prevC <= 0) return null;
  const steps = Math.ceil(tFar / RAY_STEP);
  for (let i = 1; i <= steps; i += 1) {
    const nextT = Math.min(tFar, i * RAY_STEP);
    const nextC = rayClearance(ox, oy, oz, dx, dy, dz, nextT, time);
    if (prevC > 0 && nextC <= 0) {
      let lo = prevT;
      let hi = nextT;
      for (let k = 0; k < 12; k += 1) {
        const mid = (lo + hi) * 0.5;
        if (rayClearance(ox, oy, oz, dx, dy, dz, mid, time) > 0) lo = mid;
        else hi = mid;
      }
      const x = ox + dx * hi;
      const z = oz + dz * hi;
      out.set(x, waterHeight(x, z, time), z);
      return out;
    }
    prevT = nextT;
    prevC = nextC;
  }
  return null;
}
