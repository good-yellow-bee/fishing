import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EGG_SIZE, spawnEggs } from "./spawnClumps";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

const JELLY = "#dfe8e2";
const EMBRYO = "#1a1c18";

/**
 * Spring's frogspawn floating by the lily pads: clumps of clear jelly eggs, each with its dark
 * dot, riding the swell (spawnClumps.ts). The jelly is one instanced draw and the dots another.
 */
export function Frogspawn() {
  const still = useReducedMotion();
  const eggs = useMemo(spawnEggs, []);
  const jelly = useRef<THREE.InstancedMesh>(null);
  const dots = useRef<THREE.InstancedMesh>(null);
  const eggShape = useMemo(() => new THREE.SphereGeometry(EGG_SIZE / 2, 7, 5), []);
  const dotShape = useMemo(() => new THREE.SphereGeometry(EGG_SIZE / 5, 5, 4), []);
  const jellyMat = useMemo(() => new THREE.MeshBasicMaterial({ color: JELLY, transparent: true, opacity: 0.5, depthWrite: false }), []);
  const dotMat = useMemo(() => new THREE.MeshBasicMaterial({ color: EMBRYO }), []);
  const at = useMemo(() => new THREE.Matrix4(), []);
  useEffect(
    () => () => {
      [eggShape, dotShape, jellyMat, dotMat].forEach((thing) => thing.dispose());
    },
    [eggShape, dotShape, jellyMat, dotMat],
  );
  useFrame(({ clock }) => {
    const time = still ? 0 : clock.elapsedTime;
    eggs.forEach((egg, i) => {
      const y = waterHeight(egg.x, egg.z, time) + egg.lift;
      at.makeTranslation(egg.x, y, egg.z);
      jelly.current?.setMatrixAt(i, at);
      dots.current?.setMatrixAt(i, at);
    });
    for (const mesh of [jelly.current, dots.current]) if (mesh) mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={dots} name="frogspawn-dots" args={[dotShape, dotMat, eggs.length]} frustumCulled={false} />
      <instancedMesh ref={jelly} name="frogspawn" args={[eggShape, jellyMat, eggs.length]} frustumCulled={false} />
    </>
  );
}
