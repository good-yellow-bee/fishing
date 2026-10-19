import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { WREATHS, wreathAt } from "./capCloud";
import { useReducedMotion } from "./reducedMotion";

/** Low cloud on the far hills' tops on grey and wet days (capCloud.ts): one draw. */
export function HillCloud({ color, amount, wind }: { color: string; amount: number; wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const texture = useMemo(() => makeSoftSpotTexture(0.35), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, fog: false }), [texture]);
  material.color.set(color);
  material.opacity = 0.55 + 0.3 * amount;
  useEffect(
    () => () => {
      [geometry, texture, material].forEach((item) => item.dispose());
    },
    [geometry, texture, material],
  );
  const place = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const wreaths = mesh.current;
    if (!wreaths) return;
    for (let i = 0; i < WREATHS; i += 1) {
      const wreath = wreathAt(i, clock.elapsedTime, wind, amount, still);
      place.position.set(wreath.x, wreath.y, wreath.z);
      place.scale.set(wreath.width, wreath.height, 1);
      place.updateMatrix();
      wreaths.setMatrixAt(i, place.matrix);
    }
    wreaths.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name="hill-cloud" args={[geometry, material, WREATHS]} frustumCulled={false} renderOrder={2} />;
}
