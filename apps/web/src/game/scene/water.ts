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
