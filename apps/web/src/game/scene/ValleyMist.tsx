import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { useReducedMotion } from "./reducedMotion";
import { PUFFS, valleyPuff } from "./valleyMist";

/** Faint enough that the far trees show through it as shapes. */
const OPACITY = 0.6;

/** The dawn's bank of mist along the hills' foot behind the far bank (valleyMist.ts): one draw. */
export function ValleyMist({ color }: { color: string }) {
  const still = useReducedMotion();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const texture = useMemo(() => makeSoftSpotTexture(0.35), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: OPACITY, depthWrite: false, fog: false }), [texture]);
  material.color.set(color);
  useEffect(
    () => () => {
      [geometry, texture, material].forEach((item) => item.dispose());
    },
    [geometry, texture, material],
  );
  const place = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const puffs = mesh.current;
    if (!puffs) return;
    for (let i = 0; i < PUFFS; i += 1) {
      const puff = valleyPuff(i, clock.elapsedTime, still);
      place.position.set(puff.x, puff.y, puff.z);
      place.scale.set(puff.width, puff.height, 1);
      place.updateMatrix();
      puffs.setMatrixAt(i, place.matrix);
    }
    puffs.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name="valley-mist" args={[geometry, material, PUFFS]} frustumCulled={false} renderOrder={2} />;
}
