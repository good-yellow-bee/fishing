import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";

// Chop dies out at the shoreline so the bank seam stays put.
function shoreWeight(x: number, z: number) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  const radius = Math.hypot(nx, nz);
  const edge = lakeEdge(Math.atan2(nz, nx)) * 0.96;
  if (edge < 1e-4) return 0;
  const inland = 1 - radius / edge;
  const fade = Math.min(1, Math.max(0, inland / 0.2));
  return fade * fade;
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
