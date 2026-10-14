/**
 * Keeps the camera out of the hills and trees: how far the camera can sit from
 * the angler along its line of sight before something solid gets in between.
 */

export type Vec3Like = { x: number; y: number; z: number };
/** A hill: an ellipsoid with its centre and radii. */
export type HillShape = { center: [number, number, number]; radii: [number, number, number] };
/** A tree: an upright cylinder covering trunk and crown. */
export type TreeShape = { x: number; z: number; radius: number; top: number };

/** Stop this far short of whatever the line hits, so the near plane does not slice it. */
export const CLEAR_MARGIN = 0.45;
/** Never pull in closer than this to the angler. */
export const CLEAR_MIN = 1.6;

/** Footprint and height of the shore tree models per unit of scale (measured from the GLBs). */
const TREE_RADIUS = 0.34;
const TREE_HEIGHT = 1.3;

export function treeShape(position: readonly [number, number, number], scale: number): TreeShape {
  return { x: position[0], z: position[2], radius: TREE_RADIUS * scale, top: position[1] + TREE_HEIGHT * scale };
}

/** Distance along the unit ray to where it enters the ellipsoid, or Infinity. */
function hitHill(o: Vec3Like, d: Vec3Like, hill: HillShape): number {
  const [cx, cy, cz] = hill.center;
  const [rx, ry, rz] = hill.radii;
  const ox = (o.x - cx) / rx, oy = (o.y - cy) / ry, oz = (o.z - cz) / rz;
  const dx = d.x / rx, dy = d.y / ry, dz = d.z / rz;
  const a = dx * dx + dy * dy + dz * dz;
  const b = 2 * (ox * dx + oy * dy + oz * dz);
  const c = ox * ox + oy * oy + oz * oz - 1;
  // Starting inside a hill means the angler is on its slope: nothing to clear against.
  if (c <= 0) return Infinity;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return Infinity;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 ? t : Infinity;
}

/** Distance along the unit ray to where it enters the tree's cylinder below its top, or Infinity. */
function hitTree(o: Vec3Like, d: Vec3Like, tree: TreeShape): number {
  const ox = o.x - tree.x, oz = o.z - tree.z;
  const a = d.x * d.x + d.z * d.z;
  const c = ox * ox + oz * oz - tree.radius * tree.radius;
  if (c <= 0 || a < 1e-9) return Infinity;
  const b = 2 * (ox * d.x + oz * d.z);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return Infinity;
  const enter = (-b - Math.sqrt(disc)) / (2 * a);
  const leave = (-b + Math.sqrt(disc)) / (2 * a);
  if (leave < 0) return Infinity;
  const t = Math.max(0, enter);
  // The ray may pass over the crown and dip into it later, or rise out of it.
  const yIn = o.y + d.y * t;
  if (yIn <= tree.top) return t;
  if (d.y >= 0) return Infinity;
  const tTop = (tree.top - o.y) / d.y;
  return tTop <= leave ? tTop : Infinity;
}

/**
 * How far from `from` the camera may sit toward `to` without anything in
 * between: the full distance when the line is clear, otherwise short of the
 * first hit by CLEAR_MARGIN, never under CLEAR_MIN.
 */
export function clearDistance(from: Vec3Like, to: Vec3Like, hills: readonly HillShape[], trees: readonly TreeShape[]): number {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  const length = Math.hypot(dx, dy, dz);
  if (length < 1e-6) return length;
  const dir = { x: dx / length, y: dy / length, z: dz / length };
  let hit = Infinity;
  for (const hill of hills) hit = Math.min(hit, hitHill(from, dir, hill));
  for (const tree of trees) {
    // Cheap reject: a tree farther off than the camera cannot be in the way.
    if (Math.hypot(tree.x - from.x, tree.z - from.z) - tree.radius > length + CLEAR_MARGIN) continue;
    hit = Math.min(hit, hitTree(from, dir, tree));
  }
  if (hit - CLEAR_MARGIN >= length) return length;
  return Math.min(length, Math.max(CLEAR_MIN, hit - CLEAR_MARGIN));
}

/** Pulls in at once so nothing ever cuts the view, and lets back out gently. */
export function easePull(current: number, target: number, delta: number): number {
  if (target >= current) return target;
  return target + (current - target) * Math.exp(-2.5 * delta);
}
