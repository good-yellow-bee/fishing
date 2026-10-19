import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { batchPlaced } from "./scatterBatch";
import { prepareToon, releaseToonCopy, type ToonLook } from "./ToonModel";

/** One still model placed in the scene, prepared as ToonModel prepares it. */
export type StaticModel = ToonLook & {
  url: string;
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: number;
};

/** Where a still model stands: its position, its turn and its size. */
export function staticPlacement({ position, rotation = [0, 0, 0], scale = 1 }: StaticModel) {
  return new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(scale, scale, scale));
}

/**
 * Still models that never move, baked together: one draw per material (and shadow setting) for the
 * whole list, where a ToonModel each would cost a draw apiece. Rebuilt when the list changes.
 */
export function StaticModels({ items }: { items: readonly StaticModel[] }) {
  const urls = useMemo(() => [...new Set(items.map((item) => item.url))], [items]);
  const models = useGLTF(urls);
  const batch = useMemo(() => {
    const byUrl = new Map(urls.map((url, i) => [url, models[i]!.scene]));
    const placed = items.map((item) => ({ root: prepareToon(byUrl.get(item.url)!, item), matrix: staticPlacement(item) }));
    return { placed, meshes: batchPlaced(placed) };
  }, [items, urls, models]);
  useEffect(
    () => () => {
      batch.placed.forEach(({ root }) => releaseToonCopy(root));
      batch.meshes.forEach((mesh) => (mesh instanceof THREE.InstancedMesh ? mesh.dispose() : mesh.geometry.dispose()));
    },
    [batch],
  );
  return batch.meshes.map((mesh) => <primitive key={mesh.uuid} object={mesh} />);
}
