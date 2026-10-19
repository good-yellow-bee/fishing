import * as THREE from "three";
import { BOAT_DECK, MOORING, MOORED_YAW } from "./boat";
import { DOCK_POST_CAPS } from "./snowyDock";

/**
 * The rowboat's mooring lines: while it lies tied up by the pier, a bow line runs forward to the
 * pier's front post and a stern line back to its rear post, each sagging between them and drawing
 * tighter or slacker as the hull rides the chop. Untied, they are gone.
 */

type Point = { x: number; y: number; z: number };

/** The rope ties on the hull, in the hull group's own space (the model's, scaled 0.66): at the bow and stern, gunwale high. */
export const HULL_TIES: readonly Point[] = [
  { x: 0, y: 0.33, z: 0.86 },
  { x: 0, y: 0.33, z: -0.86 },
];

/** The posts on the boat's side of the pier: the front one the bow line runs to, and the rear one for the stern line. */
const side = DOCK_POST_CAPS.filter((cap) => cap.x > 0);
const front = side.reduce((a, b) => (a.z < b.z ? a : b));
const rear = side.reduce((a, b) => (a.z > b.z ? a : b));
/** Tied round each post a little under its cap, on the face toward the boat. */
export const POST_TIES: readonly Point[] = [front, rear].map((cap) => ({ x: cap.x + cap.size / 2, y: cap.y - 0.08, z: cap.z }));

/** Segments in each rope. */
export const SEGMENTS = 10;
/** How much longer than the straight run between its ties each rope is, with the hull lying still. */
const SLACK = 1.05;

/** Where hull tie `i` lies in the world with the boat at rest on flat water at its mooring. */
export function restTie(i: number): Point {
  const tie = HULL_TIES[i]!;
  // Moored bow-out, turned half round, so the hull's +z points along the world's -z.
  const c = Math.cos(MOORED_YAW);
  const s = Math.sin(MOORED_YAW);
  return { x: MOORING.x + tie.x * c + tie.z * s, y: BOAT_DECK - 0.14 + tie.y, z: MOORING.z - tie.x * s + tie.z * c };
}

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

/** Each rope's length: a little more than the run from its post to its tie on the resting hull. */
export const ROPE_LENGTHS = POST_TIES.map((post, i) => distance(post, restTie(i)) * SLACK);

/**
 * How far the middle of a rope of `length` hangs below the straight line between ends `span` apart,
 * near enough for a shallow sag (a parabola's length is about span + 8 sag² / 3 span). Taut, none.
 */
export function sagOf(span: number, length: number) {
  return length <= span ? 0 : Math.sqrt((3 * span * (length - span)) / 8);
}

/** The point `t` (0 at `from`, 1 at `to`) along a rope of `length` hung between them. */
export function ropePoint(from: Point, to: Point, length: number, t: number): Point {
  const sag = sagOf(distance(from, to), length);
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - 4 * sag * t * (1 - t), z: from.z + (to.z - from.z) * t };
}

/** The ropes as last laid: whether they are up, and where each hull tie then was, for anything that sits on them. */
export const liveRopes = { up: false, ties: HULL_TIES.map(() => new THREE.Vector3()) };

/** The point `t` (0 at the post, 1 at the hull) along live rope `r`, as last laid. */
export function liveRopePoint(r: number, t: number): Point {
  const end = liveRopes.ties[r]!;
  return ropePoint(POST_TIES[r]!, end, ROPE_LENGTHS[r]!, t);
}

const tie = new THREE.Vector3();
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const turn = new THREE.Quaternion();
const size = new THREE.Vector3();
const placed = new THREE.Matrix4();
const folded = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Lays the ropes' segments into `mesh`, an instance per segment of a unit cylinder standing along +y,
 * from each post to its tie on `hull` as it now lies; folded away when the boat is not `moored`.
 */
export function poseMooringRopes(mesh: THREE.InstancedMesh | null, hull: THREE.Object3D, moored: boolean) {
  if (!mesh) return;
  liveRopes.up = moored;
  POST_TIES.forEach((post, r) => {
    const end = HULL_TIES[r]!;
    tie.set(end.x, end.y, end.z).applyMatrix4(hull.matrixWorld);
    liveRopes.ties[r]!.copy(tie);
    for (let k = 0; k < SEGMENTS; k += 1) {
      const index = r * SEGMENTS + k;
      if (!moored) {
        mesh.setMatrixAt(index, folded);
        continue;
      }
      const p = ropePoint(post, tie, ROPE_LENGTHS[r]!, k / SEGMENTS);
      const q = ropePoint(post, tie, ROPE_LENGTHS[r]!, (k + 1) / SEGMENTS);
      a.set(p.x, p.y, p.z);
      b.set(q.x, q.y, q.z);
      const span = a.distanceTo(b);
      turn.setFromUnitVectors(up, b.sub(a).normalize());
      size.set(1, span, 1);
      placed.compose(a.add(b.multiplyScalar(span / 2)), turn, size);
      mesh.setMatrixAt(index, placed);
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
}
