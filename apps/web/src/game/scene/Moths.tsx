import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MOTH_COUNT, mothAt } from "./mothOrbit";
import { useReducedMotion } from "./reducedMotion";

const MOTH_COLOR = "#f3e6c8";
/** Drawn larger than life so they read from the dock camera. */
const SIZE = 0.08;

/** Two wings as a bow tie in the xz plane, hinged along the z axis. */
function mothGeometry() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.4, 1, 0, 0.2, 0, 0, 0.5, 0, 0, -0.4, -1, 0, 0.2, 0, 0, 0.5], 3));
  geo.computeVertexNormals();
  return geo;
}

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
      scratch.position.set(moth.x, moth.y, moth.z);
      scratch.rotation.set(0, Math.atan2(next.x - moth.x, next.z - moth.z), 0);
      // The beat closes the wings by narrowing them, as seen from above.
      scratch.scale.set(SIZE * (0.25 + 0.75 * (still ? 1 : moth.flap)), SIZE, SIZE);
      scratch.updateMatrix();
      moths.setMatrixAt(i, scratch.matrix);
    }
    moths.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name="moths" args={[geometry, material, MOTH_COUNT]} frustumCulled={false} renderOrder={6} />;
}
