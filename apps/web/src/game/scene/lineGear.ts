import type { LineWeight } from "../lineWeight";

/** How plain each line shows on the water, as a share of the standard line's opacity: the fish can't see light line, and see heavy line plainer. */
export const LINE_SHOW: Record<LineWeight, number> = { light: 0.65, standard: 1, heavy: 1.4, wire: 1 };

/** The line's resting opacity on this reel, kept under the full pull of a hard run. */
export function gearOpacity(base: number, line: LineWeight) {
  return Math.min(0.88, base * LINE_SHOW[line]);
}

/** How long the wire leader's steel trace is at the lure end of the line, in meters. */
export const LEADER_LEN = 1;
export const LEADER_STEEL = "#b4bdc3";
/** After dark the line turns pale, so the unlit steel shows darker than it. */
export const LEADER_DULL = "#5d666c";
export const LEADER_GLINT = "#f2f6f8";

/**
 * Copies the last `len` meters of a polyline into `out`, cutting the first
 * point partway along its segment; returns the points written.
 */
export function leaderTail(positions: ArrayLike<number>, count: number, len: number, out: Float32Array) {
  if (count < 2) return 0;
  const cap = out.length / 3;
  let left = len;
  let i = count - 1;
  // Walk back from the end until the trace's length runs out inside a segment.
  while (i > 0 && cap > count - i + 1) {
    const dx = positions[i * 3 - 3] - positions[i * 3];
    const dy = positions[i * 3 - 2] - positions[i * 3 + 1];
    const dz = positions[i * 3 - 1] - positions[i * 3 + 2];
    const seg = Math.hypot(dx, dy, dz);
    if (seg >= left) break;
    left -= seg;
    i -= 1;
  }
  let n = 0;
  if (i > 0) {
    const dx = positions[i * 3 - 3] - positions[i * 3];
    const dy = positions[i * 3 - 2] - positions[i * 3 + 1];
    const dz = positions[i * 3 - 1] - positions[i * 3 + 2];
    const k = Math.min(1, left / (Math.hypot(dx, dy, dz) || 1));
    out[0] = positions[i * 3] + dx * k;
    out[1] = positions[i * 3 + 1] + dy * k;
    out[2] = positions[i * 3 + 2] + dz * k;
    n = 1;
  }
  for (let p = i; p < count && n < cap; p += 1, n += 1) {
    out[n * 3] = positions[p * 3];
    out[n * 3 + 1] = positions[p * 3 + 1];
    out[n * 3 + 2] = positions[p * 3 + 2];
  }
  return n;
}

const GLINT_EVERY = 2.6;
const GLINT_SEC = 0.35;

/** The steel catching the light, 0..1: a short flash every few seconds. */
export function leaderGlint(t: number) {
  const k = ((t + 0.9) % GLINT_EVERY) / GLINT_SEC;
  return k < 1 ? Math.sin(k * Math.PI) : 0;
}
