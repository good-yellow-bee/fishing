import { spotAt } from "@stillwater/shared";

type Point = { x: number; z: number };

/**
 * The creek that feeds the inlet, from its mouth on the lake's north-west
 * waterline back up into the trees. North of the inlet walk, so the path
 * never crosses water. The mouth sits on the drawn waterline so the ribbon
 * doesn't show through the lake. The drawn lake is mirrored in z against
 * inLake's outline, so that waterline is a little west of inLake's.
 */
export const CREEK: readonly Point[] = [
  { x: -21.2, z: -8.3 },
  { x: -23.0, z: -9.2 },
  { x: -25.4, z: -10.0 },
  { x: -27.8, z: -10.6 },
  { x: -30.4, z: -11.9 },
  { x: -33.6, z: -12.7 },
  { x: -37.0, z: -14.2 },
];

export const CREEK_HALF_WIDTH = 0.85;
/** The muddy bank shows this far past the water on each side. */
export const CREEK_BANK = 0.45;

export const CREEK_MOUTH = CREEK[0]!;

/** Out of the creek, into the lake. */
export const CREEK_FLOW: Point = (() => {
  const a = CREEK[1]!;
  const dx = CREEK_MOUTH.x - a.x;
  const dz = CREEK_MOUTH.z - a.z;
  const len = Math.hypot(dx, dz);
  return { x: dx / len, z: dz / len };
})();

/** Strongest drift at the mouth, meters. */
export const CURRENT_MAX = 0.42;
/** The push fades to nothing this far out from the mouth. */
export const CURRENT_REACH = 9;

function segmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / lenSq));
  return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
}

/** Distance from the creek's center line. */
export function creekDistance(x: number, z: number) {
  let best = Infinity;
  for (let i = 0; i < CREEK.length - 1; i += 1) {
    best = Math.min(best, segmentDistance({ x, z }, CREEK[i]!, CREEK[i + 1]!));
  }
  return best;
}

/** True when scenery at this spot would stand in the creek or on its bank. */
export function nearCreek(x: number, z: number, margin = 1) {
  return creekDistance(x, z) <= CREEK_HALF_WIDTH + CREEK_BANK + margin;
}

/**
 * Flat ribbon along the creek, laid in the XZ plane. U runs across, V runs
 * along in meters / 4 so a streak texture scrolls with the flow.
 */
export function creekRibbon(halfWidth: number) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let along = 0;
  CREEK.forEach((p, i) => {
    const prev = CREEK[Math.max(0, i - 1)]!;
    const next = CREEK[Math.min(CREEK.length - 1, i + 1)]!;
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    // Widens toward the mouth, narrows up in the trees.
    const w = halfWidth * (1.25 - (0.45 * i) / (CREEK.length - 1));
    const nx = (-dz / len) * w;
    const nz = (dx / len) * w;
    if (i > 0) along += Math.hypot(p.x - CREEK[i - 1]!.x, p.z - CREEK[i - 1]!.z);
    positions.push(p.x + nx, 0, p.z + nz, p.x - nx, 0, p.z - nz);
    uvs.push(0, along / 4, 1, along / 4);
    if (i > 0) {
      const base = (i - 1) * 2;
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  });
  return { positions, uvs, indices };
}

/** Bank rocks, both sides of the creek, kept back from the inlet stand. */
export const CREEK_ROCKS: readonly { x: number; z: number; scale: [number, number, number]; rot: number }[] = [
  { x: -22.6, z: -7.6, scale: [0.55, 0.32, 0.45], rot: 0.4 },
  { x: -23.6, z: -10.5, scale: [0.7, 0.38, 0.55], rot: 1.3 },
  { x: -26.4, z: -9.1, scale: [0.5, 0.3, 0.42], rot: 2.2 },
  { x: -27.2, z: -11.8, scale: [0.85, 0.45, 0.6], rot: 0.9 },
  { x: -29.8, z: -10.6, scale: [0.6, 0.34, 0.5], rot: 2.7 },
  { x: -31.8, z: -13.4, scale: [0.75, 0.4, 0.6], rot: 1.8 },
  { x: -21.9, z: -9.5, scale: [0.4, 0.22, 0.35], rot: 0.2 },
];

/**
 * How far the creek's current carries a sitting bobber at the inlet, meters.
 * Zero off the inlet. Sways with time so the float never parks.
 */
export function inletCurrent(x: number, z: number, time: number) {
  if (spotAt(x, z) !== "inlet") return { x: 0, z: 0 };
  const d = Math.hypot(x - CREEK_MOUTH.x, z - CREEK_MOUTH.z);
  const strength = Math.max(0, 1 - d / CURRENT_REACH);
  const sway = 0.75 + 0.25 * Math.sin(time * 0.6);
  const push = CURRENT_MAX * strength * sway;
  return { x: CREEK_FLOW.x * push, z: CREEK_FLOW.z * push };
}
