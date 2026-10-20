import type { RefObject } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Part = {
  geometry: THREE.BufferGeometry;
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: number | readonly [number, number, number];
};

/**
 * Several meshes that share a material and never move apart, baked into one shape so they cost one draw.
 * Each part's geometry is consumed (disposed) here.
 */
export function mergeParts(parts: readonly Part[]): THREE.BufferGeometry {
  const placed = parts.map(({ geometry, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => {
    const size = typeof scale === "number" ? new THREE.Vector3().setScalar(scale) : new THREE.Vector3(...scale);
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), size);
    const flat = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose();
    return flat.applyMatrix4(matrix);
  });
  const shape = mergeGeometries(placed);
  placed.forEach((part) => part.dispose());
  if (!shape) throw new Error("parts do not share attributes");
  return shape;
}

export type PaintedPart = Part & { color: THREE.ColorRepresentation };

/**
 * Parts in different colours baked into one shape: each part's colour goes into a vertex colour attribute,
 * so they share one material with `vertexColors` (a white base colour) and cost one draw.
 */
export function mergePainted(parts: readonly PaintedPart[]): THREE.BufferGeometry {
  return mergeParts(
    parts.map(({ color, geometry, ...placement }) => {
      const tint = new THREE.Color(color);
      const flat = geometry.index ? geometry.toNonIndexed() : geometry;
      if (flat !== geometry) geometry.dispose();
      const count = flat.getAttribute("position").count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) colors.set([tint.r, tint.g, tint.b], i * 3);
      flat.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      return { ...placement, geometry: flat };
    }),
  );
}

/** A thin rod between two points. */
export function rod(from: THREE.Vector3, to: THREE.Vector3, radius: number, color: string, sides = 3): PaintedPart {
  const span = to.clone().sub(from);
  const turn = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.clone().normalize()));
  const mid = from.clone().add(to).multiplyScalar(0.5);
  return { geometry: new THREE.CylinderGeometry(radius, radius, span.length(), sides), position: [mid.x, mid.y, mid.z], rotation: [turn.x, turn.y, turn.z], color };
}

/** Copies each pose group's local transform into one instance of `mesh`, so a set of limbs costs one draw. */
export function poseLimbs(mesh: THREE.InstancedMesh | null, groups: readonly RefObject<THREE.Group | null>[]) {
  if (!mesh) return;
  groups.forEach((group, i) => {
    if (!group.current) return;
    group.current.updateMatrix();
    mesh.setMatrixAt(i, group.current.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

const toRoot = new THREE.Matrix4();
const placed = new THREE.Matrix4();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

function shownUnder(holder: THREE.Object3D, root: THREE.Object3D) {
  for (let node: THREE.Object3D | null = holder; node && node !== root; node = node.parent) if (!node.visible) return false;
  return true;
}

/**
 * Copies where each pose holder (an empty group posed as the part would be) sits under `root` into one
 * instance of `mesh`, a child of `root`, so a set of posed parts costs one draw. A holder hidden, or under a
 * hidden group, is scaled to nothing. Call `root.updateMatrixWorld()` once after posing, before this.
 */
export function poseFromHolders(mesh: THREE.InstancedMesh | null, root: THREE.Object3D | null, holders: readonly (THREE.Object3D | null)[]) {
  if (!mesh || !root) return;
  toRoot.copy(root.matrixWorld).invert();
  holders.forEach((holder, i) => {
    mesh.setMatrixAt(i, holder && shownUnder(holder, root) ? placed.multiplyMatrices(toRoot, holder.matrixWorld) : HIDDEN);
  });
  mesh.instanceMatrix.needsUpdate = true;
}
