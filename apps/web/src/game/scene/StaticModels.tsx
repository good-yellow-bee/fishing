import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { batchPlaced, disposeBatch } from "./scatterBatch";
import { prepareToon, releaseToonCopy, type ToonLook } from "./ToonModel";

/** One still model placed in the scene, prepared as ToonModel prepares it (no season tint: the list is built once). */
export type StaticModel = Omit<ToonLook, "plant"> & {
  url: string;
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: number | readonly [number, number, number];
};

/** Where a still model stands: its position, its turn and its size. */
export function staticPlacement({ position, rotation = [0, 0, 0], scale = 1 }: StaticModel) {
  const size = typeof scale === "number" ? new THREE.Vector3(scale, scale, scale) : new THREE.Vector3(...scale);
  return new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), size);
}

/** Bakes `items` from their loaded `scenes` (by url): one prepared copy per look, placed as often as it is listed. */
export function bakeStatic(items: readonly StaticModel[], scenes: ReadonlyMap<string, THREE.Object3D>) {
  const copies = new Map<string, THREE.Object3D>();
  const placed = items.map((item) => {
    const look = `${item.url}|${item.shadows ?? true}|${item.sitOnGround ?? false}|${item.shade ?? 1}`;
    let root = copies.get(look);
    if (!root) {
      root = prepareToon(scenes.get(item.url)!, item);
      copies.set(look, root);
    }
    return { root, matrix: staticPlacement(item) };
  });
  const meshes = batchPlaced(placed);
  // Baked copies' shapes are copied into the batch and can go now; the rest share their materials with it until it goes.
  const kept = [...copies.values()].filter((root) => {
    if (!root.userData.baked) return true;
    releaseToonCopy(root);
    return false;
  });
  return { meshes, kept };
}

/**
 * Still models that never move, baked together: one draw per material (and shadow setting) for the
 * whole list, where a ToonModel each would cost a draw apiece. Rebuilt when the list changes.
 */
export function StaticModels({ items }: { items: readonly StaticModel[] }) {
  const urls = useMemo(() => [...new Set(items.map((item) => item.url))], [items]);
  const models = useGLTF(urls);
  const batch = useMemo(() => bakeStatic(items, new Map(urls.map((url, i) => [url, models[i]!.scene]))), [items, urls, models]);
  useEffect(
    () => () => {
      batch.kept.forEach(releaseToonCopy);
      disposeBatch(batch.meshes);
    },
    [batch],
  );
  return batch.meshes.map((mesh) => <primitive key={mesh.uuid} object={mesh} />);
}
