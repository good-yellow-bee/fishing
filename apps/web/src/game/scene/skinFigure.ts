import { useLayoutEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** The layer the baked parts are moved to: no camera or shadow camera draws it, but they keep posing as before. */
export const BAKED_LAYER = 31;

export type SkinnedFigure = {
  mesh: THREE.SkinnedMesh;
  /** Folds each part away while it, or a group above it, is hidden. Call once a frame after posing. */
  update: () => void;
  dispose: () => void;
};

/** Whether `node` is still under `root` with nothing between them hidden. */
function shownUnder(node: THREE.Object3D, root: THREE.Object3D) {
  let at: THREE.Object3D | null = node;
  for (; at && at !== root; at = at.parent) if (!at.visible) return false;
  return at === root;
}

const FOLDED = new THREE.Matrix4().makeScale(0, 0, 0);

function attributeKey(geometry: THREE.BufferGeometry) {
  return Object.keys(geometry.attributes).sort().join();
}

/**
 * Bakes the meshes under `root` that use `material` into one skinned mesh, so a posed figure costs one
 * draw however many limbs it has. Each baked mesh gets a bone of its own as a child, so it keeps its
 * place in the figure's groups and still swings, turns or hides with them; the mesh itself moves to a
 * layer nothing draws. A part unmounted later is folded away; one mounted later draws on its own.
 * Null when there are fewer than two parts to bake.
 */
export function skinFigure(root: THREE.Object3D, material: THREE.Material): SkinnedFigure | null {
  root.updateMatrixWorld(true);
  const found: THREE.Mesh[] = [];
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    if (mesh.material === material) found.push(mesh);
  });
  const key = found[0] ? attributeKey(found[0].geometry) : "";
  const parts = found.filter((mesh) => attributeKey(mesh.geometry) === key);
  if (parts.length < 2) return null;

  const toRoot = root.matrixWorld.clone().invert();
  const placed = parts.map((mesh, i) => {
    const flat = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    flat.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld));
    const count = flat.getAttribute("position").count;
    const index = new Uint16Array(count * 4);
    const weight = new Float32Array(count * 4);
    for (let v = 0; v < count; v += 1) {
      index[v * 4] = i;
      weight[v * 4] = 1;
    }
    flat.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(index, 4));
    flat.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weight, 4));
    return flat;
  });
  const geometry = mergeGeometries(placed);
  placed.forEach((part) => part.dispose());
  if (!geometry) return null;

  const bones = parts.map((mesh) => {
    const bone = new THREE.Bone();
    mesh.add(bone);
    mesh.layers.set(BAKED_LAYER);
    return bone;
  });
  const skinned = new THREE.SkinnedMesh(geometry, material);
  skinned.name = "skinned-figure";
  skinned.castShadow = parts.some((mesh) => mesh.castShadow);
  // The figure's limbs move away from where they were bound, so its bounds are never trusted.
  skinned.frustumCulled = false;
  root.add(skinned);
  root.updateMatrixWorld(true);
  skinned.bind(new THREE.Skeleton(bones));

  return {
    mesh: skinned,
    update: () => {
      parts.forEach((mesh, i) => {
        const bone = bones[i]!;
        bone.scale.setScalar(shownUnder(mesh, root) ? 1 : 0);
        // A part taken out of the figure no longer has its place worked out, so it is folded away by hand.
        if (!mesh.parent) bone.matrixWorld.copy(FOLDED);
      });
    },
    dispose: () => {
      root.remove(skinned);
      parts.forEach((mesh, i) => {
        mesh.remove(bones[i]!);
        mesh.layers.set(0);
      });
      skinned.skeleton.dispose();
      geometry.dispose();
    },
  };
}

/** Bakes the figure under `root` that uses `material` into one skinned mesh while it is mounted (see skinFigure). */
export function useSkinnedFigure(root: RefObject<THREE.Object3D | null>, material: THREE.Material) {
  const figure = useRef<SkinnedFigure | null>(null);
  useLayoutEffect(() => {
    if (!root.current) return;
    const baked = skinFigure(root.current, material);
    figure.current = baked;
    return () => {
      baked?.dispose();
      figure.current = null;
    };
  }, [root, material]);
  useFrame(() => figure.current?.update());
}
