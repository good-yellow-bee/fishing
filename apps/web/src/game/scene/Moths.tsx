import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MOTH_COLOR, mothGeometry, poseMoth } from "./mothDraw";
import { MOTH_COUNT, mothAt } from "./mothOrbit";
import { useReducedMotion } from "./reducedMotion";

/** Pale moths looping round the lit lanterns after dark. */
export function Moths() {
  const still = useReducedMotion();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(mothGeometry, []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: MOTH_COLOR, side: THREE.DoubleSide, toneMapped: false }), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame((state) => {
    const moths = mesh.current;
    if (!moths) return;
    const t = still ? 0 : state.clock.elapsedTime;
    for (let i = 0; i < MOTH_COUNT; i += 1) {
      const moth = mothAt(i, t);
      const next = mothAt(i, t + 0.03);
      poseMoth(scratch, moth, next, still);
      moths.setMatrixAt(i, scratch.matrix);
    }
    moths.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name="moths" args={[geometry, material, MOTH_COUNT]} frustumCulled={false} renderOrder={6} />;
}
