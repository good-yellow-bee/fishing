import { DOCK_STAND_X, DOCK_STAND_Z, POINT_PAD, SPAWN_X, SPAWN_Z, walkableAt } from "@stillwater/shared";
import { DROPOFF_STAND, INLET_STAND, REEDS_STAND } from "./bankWalk";

/**
 * Tap-to-walk. A grid over the walkable shore, a breadth-first search from
 * the angler to the tapped ground, then the corners cut wherever the straight
 * line stays on the shore.
 */

export type WalkPoint = { x: number; z: number };

const CELL = 0.25;
const MIN_X = -24.5;
const MAX_X = 18;
const MIN_Z = -7;
const MAX_Z = 18.5;
const COLS = Math.ceil((MAX_X - MIN_X) / CELL) + 1;
const ROWS = Math.ceil((MAX_Z - MIN_Z) / CELL) + 1;
/** How finely a straight segment is checked against the shore. */
const SAMPLE = 0.08;
/** A tap this close to the angler is not a walk. */
export const MIN_WALK = 1.2;

/** Where the signposts send you: the stand of each bank, and the shack door. */
export const WALK_TARGETS = {
  dock: { x: DOCK_STAND_X, z: DOCK_STAND_Z },
  point: { x: POINT_PAD.x, z: POINT_PAD.z },
  reeds: { x: REEDS_STAND.x, z: REEDS_STAND.z },
  dropoff: { x: DROPOFF_STAND.x, z: DROPOFF_STAND.z },
  inlet: { x: INLET_STAND.x, z: INLET_STAND.z },
  shop: { x: SPAWN_X, z: SPAWN_Z },
} as const satisfies Record<string, WalkPoint>;

export type WalkTarget = keyof typeof WALK_TARGETS;

let grid: Uint8Array | null = null;

function cellX(col: number) {
  return MIN_X + col * CELL;
}

function cellZ(row: number) {
  return MIN_Z + row * CELL;
}

function walkGrid() {
  if (grid) return grid;
  grid = new Uint8Array(COLS * ROWS);
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (walkableAt(cellX(col), cellZ(row))) grid[row * COLS + col] = 1;
    }
  }
  return grid;
}

/** True when every sample on the straight line from a to b is walkable. */
export function clearLine(ax: number, az: number, bx: number, bz: number) {
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / SAMPLE));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    if (!walkableAt(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
  }
  return true;
}

/** The walkable cell nearest a point that the point can see in a straight line. */
function nearestCell(x: number, z: number, cells: Uint8Array) {
  const col0 = Math.round((x - MIN_X) / CELL);
  const row0 = Math.round((z - MIN_Z) / CELL);
  let best = -1;
  let bestD = Infinity;
  for (let dr = -3; dr <= 3; dr += 1) {
    for (let dc = -3; dc <= 3; dc += 1) {
      const col = col0 + dc;
      const row = row0 + dr;
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS) continue;
      const index = row * COLS + col;
      if (!cells[index]) continue;
      const d = (cellX(col) - x) ** 2 + (cellZ(row) - z) ** 2;
      if (d < bestD && clearLine(x, z, cellX(col), cellZ(row))) {
        best = index;
        bestD = d;
      }
    }
  }
  return best;
}

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

function smooth(points: WalkPoint[]) {
  const out: WalkPoint[] = [points[0]!];
  let from = 0;
  while (from < points.length - 1) {
    let to = points.length - 1;
    while (to > from + 1 && !clearLine(points[from]!.x, points[from]!.z, points[to]!.x, points[to]!.z)) to -= 1;
    out.push(points[to]!);
    from = to;
  }
  return out;
}

/**
 * Waypoints from the angler to a walkable goal, the start left out. Null when
 * the goal is off the shore or cut off from where the angler stands.
 */
export function walkPath(fromX: number, fromZ: number, toX: number, toZ: number): WalkPoint[] | null {
  if (!walkableAt(toX, toZ) || !walkableAt(fromX, fromZ)) return null;
  if (clearLine(fromX, fromZ, toX, toZ)) return [{ x: toX, z: toZ }];
  const cells = walkGrid();
  const start = nearestCell(fromX, fromZ, cells);
  const goal = nearestCell(toX, toZ, cells);
  if (start < 0 || goal < 0) return null;

  const prev = new Int32Array(COLS * ROWS).fill(-1);
  prev[start] = start;
  const queue = new Int32Array(COLS * ROWS);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  while (head < tail) {
    const at = queue[head++]!;
    if (at === goal) break;
    const col = at % COLS;
    const row = (at - col) / COLS;
    for (const [dc, dr] of STEPS) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      const next = nr * COLS + nc;
      if (!cells[next] || prev[next] >= 0) continue;
      // A diagonal may not cut the corner of a narrow plank.
      if (dc !== 0 && dr !== 0 && (!cells[row * COLS + nc] || !cells[nr * COLS + col])) continue;
      prev[next] = at;
      queue[tail++] = next;
    }
  }
  if (prev[goal] < 0) return null;

  const cellsBack: WalkPoint[] = [];
  for (let at = goal; at !== start; at = prev[at]!) {
    const col = at % COLS;
    cellsBack.push({ x: cellX(col), z: cellZ((at - col) / COLS) });
  }
  const startCol = start % COLS;
  const route = [
    { x: fromX, z: fromZ },
    { x: cellX(startCol), z: cellZ((start - startCol) / COLS) },
    ...cellsBack.reverse(),
    { x: toX, z: toZ },
  ];
  return smooth(route).slice(1);
}

/** Close enough to a corner to turn for the next one. */
const PASS_RADIUS = 0.3;
/** Close enough to the last point to stop. */
const ARRIVE_RADIUS = 0.1;
/** Start easing off this far from the last point. */
const EASE_RADIUS = 1.1;

/**
 * Walking velocity toward the route's next point, at most `maxSpeed`, easing
 * into the last one. Drops points as they are passed, so an empty route
 * means the angler has arrived.
 */
export function routeWish(x: number, z: number, route: WalkPoint[], maxSpeed: number, out: WalkPoint) {
  out.x = 0;
  out.z = 0;
  while (route.length > 0) {
    const next = route[0]!;
    const last = route.length === 1;
    const d = Math.hypot(next.x - x, next.z - z);
    // Turn early only where the next leg is open from here, so narrow planks are not cut.
    const passed = d <= ARRIVE_RADIUS || (!last && d <= PASS_RADIUS && clearLine(x, z, route[1]!.x, route[1]!.z));
    if (passed) {
      route.shift();
      continue;
    }
    const speed = last ? maxSpeed * Math.max(0.18, Math.min(1, d / EASE_RADIUS)) : maxSpeed;
    out.x = ((next.x - x) / d) * speed;
    out.z = ((next.z - z) / d) * speed;
    return out;
  }
  return out;
}
