import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FLOE_COUNT, floeSpot, iceFloes } from "./iceFloes";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const ICE = "#dfeaef";

/**
 * Winter's pancake ice: round plates afloat in the shallows, riding the chop, wandering slowly and
 * turning, all in one draw (iceFloes.ts).
 */
export function IceFloes({ wind }: { wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const floes = useMemo(iceFloes, []);
  // A low many-sided plate; each is stretched a little out of round.
  const geometry = useMemo(() => new THREE.CylinderGeometry(1, 0.94, 0.05, 9), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: ICE, gradientMap: toonRamp(), transparent: true, opacity: 0.92 }), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock }) => {
    const ice = mesh.current;
    if (!ice) return;
    const time = still ? 0 : clock.elapsedTime;
    floes.forEach((floe, i) => {
      const at = floeSpot(floe, wind, clock.elapsedTime, still);
      scratch.position.set(at.x, waterHeight(at.x, at.z, time) + 0.012, at.z);
      scratch.rotation.set(0, at.yaw, 0);
      scratch.scale.set(floe.radius, 1, floe.radius * (0.8 + (i % 3) * 0.1));
      scratch.updateMatrix();
      ice.setMatrixAt(i, scratch.matrix);
    });
    ice.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name="ice-floes" args={[geometry, material, FLOE_COUNT]} frustumCulled={false} receiveShadow />;
}
