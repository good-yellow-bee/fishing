import * as THREE from "three";

/**
 * The same smooth vertex normals three's computeVertexNormals gives an indexed
 * mesh (each face's normal, weighted by its area, summed at its corners), done
 * on the raw arrays with no Vector3 calls. The lake re-runs this every frame
 * as the chop moves, so the plain loop matters there.
 */
export function fastVertexNormals(geometry: THREE.BufferGeometry) {
  const index = geometry.getIndex();
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  if (!index) {
    geometry.computeVertexNormals();
    return;
  }
  let normal = geometry.getAttribute("normal") as THREE.BufferAttribute | undefined;
  if (!normal || normal.count !== position.count) {
    normal = new THREE.BufferAttribute(new Float32Array(position.count * 3), 3);
    geometry.setAttribute("normal", normal);
  }
  const p = position.array as Float32Array;
  const n = normal.array as Float32Array;
  const ids = index.array;
  n.fill(0);
  for (let i = 0; i < ids.length; i += 3) {
    const a = ids[i]! * 3;
    const b = ids[i + 1]! * 3;
    const c = ids[i + 2]! * 3;
    const cbx = p[c]! - p[b]!;
    const cby = p[c + 1]! - p[b + 1]!;
    const cbz = p[c + 2]! - p[b + 2]!;
    const abx = p[a]! - p[b]!;
    const aby = p[a + 1]! - p[b + 1]!;
    const abz = p[a + 2]! - p[b + 2]!;
    const x = cby * abz - cbz * aby;
    const y = cbz * abx - cbx * abz;
    const z = cbx * aby - cby * abx;
    n[a] += x;
    n[a + 1] += y;
    n[a + 2] += z;
    n[b] += x;
    n[b + 1] += y;
    n[b + 2] += z;
    n[c] += x;
    n[c + 1] += y;
    n[c + 2] += z;
  }
  for (let i = 0; i < n.length; i += 3) {
    const length = Math.hypot(n[i]!, n[i + 1]!, n[i + 2]!) || 1;
    n[i] /= length;
    n[i + 1] /= length;
    n[i + 2] /= length;
  }
  normal.needsUpdate = true;
}
