import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SpotId } from "@stillwater/shared";
import { settings } from "../settings";
import { makeSoftSpotTexture } from "./Atmosphere";
import { MAYFLY_COUNT, mayfly, swarmCenters } from "./mayflies";
import { useReducedMotion } from "./reducedMotion";

/** Meters across one fly, drawn a little large so the swarm reads against the dusk water. */
const MAYFLY_SIZE = 0.08;

/** The hatch over the water in reach of the bank: pale flies dancing up and parachuting down. Lite effects keep every other one. */
export function Mayflies({ spot }: { spot: SpotId }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const still = useReducedMotion();
  const centers = useMemo(() => swarmCenters(spot), [spot]);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const texture = useMemo(() => makeSoftSpotTexture(0.35), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ map: texture, color: "#f6eccf", transparent: true, depthWrite: false, toneMapped: false }),
    [texture],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      texture.dispose();
      material.dispose();
    },
    [geometry, texture, material],
  );

  useFrame(({ clock, camera }) => {
    const flies = mesh.current;
    if (!flies) return;
    const time = clock.elapsedTime;
    const stride = settings.particles === "lite" ? 2 : 1;
    let slot = 0;
    for (let i = 0; i < MAYFLY_COUNT; i += stride, slot += 1) {
      const fly = mayfly(i, centers, time, still);
      scratch.position.set(fly.x, fly.y, fly.z);
      scratch.quaternion.copy(camera.quaternion);
      scratch.scale.setScalar(MAYFLY_SIZE);
      scratch.updateMatrix();
      flies.setMatrixAt(slot, scratch.matrix);
    }
    flies.count = slot;
    flies.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} name="mayflies" args={[geometry, material, MAYFLY_COUNT]} frustumCulled={false} renderOrder={6} />;
}
